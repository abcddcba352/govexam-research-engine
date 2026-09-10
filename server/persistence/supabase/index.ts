import { mapExam, mapPattern } from '../examMapping.ts';
import {
  ExamRecord,
  ExamPatternVersion,
  ExamFactVerification,
  SourceRecord,
  PreviousPaperRecord,
  PYQQuestionRecord,
  PreparationBasis,
  MockBlueprintRecord,
  BlueprintQuestionSlot,
  MockTestRecord,
  MockQuestion,
  DuplicateLedgerEntry,
  GenerationAuditLog
} from '../../../src/types.ts';
import {
  ExamRepository,
  SourceRepository,
  DocumentRepository,
  DocumentRecord,
  PYQRepository,
  IntelligenceRepository,
  PreparationBasisRepository,
  BlueprintRepository,
  MockRepository,
  FinalizeMockResult,
  QuestionAuditRepository,
  LedgerRepository,
  AuditRepository,
  AIUsageRepository,
  AIUsageRecord,
  RepositoryRegistry
} from '../interfaces.ts';
import { getSupabaseClient } from '../supabaseClient.ts';
import { computeCanonicalQuestionHash } from '../../dbService.ts';

export function sanitizePgData<T>(data: T): T {
  if (typeof data === 'string') {
    return data.replace(/\0/g, '').replace(/\\u0000/g, '') as any;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizePgData) as any;
  }
  if (data && typeof data === 'object' && !(data instanceof Date)) {
    const clean: any = {};
    for (const [k, v] of Object.entries(data)) {
      clean[k] = sanitizePgData(v);
    }
    return clean;
  }
  return data;
}

export class SupabaseExamRepository implements ExamRepository {
  async getExams(): Promise<ExamRecord[]> {
    const db = getSupabaseClient();
    const tables = ['exams', 'exam_pattern_versions', 'exam_fact_verifications', 'sources'];
    // Exam mapping only needs source lineage, not every downloaded article body.
    const results = await Promise.all(tables.map(table => table==='sources'
      ?db.from(table).select('source_id,exam_id,source_level,source_url,title').not('exam_id','is',null)
      :db.from(table).select('*')));
    results.forEach((result, i) => { if (result.error) throw new Error('SUPABASE_EXAM_QUERY_FAILED (' + tables[i] + '): ' + result.error.message); });
    const [exams, patterns, facts, sources] = results.map(result => result.data || []);
    const mapped = exams.map(row => mapExam(row, patterns, facts, sources));

    return mapped;
  }

  async getExamById(examId: string): Promise<ExamRecord | null> {
    const all = await this.getExams();
    const found = all.find(exam => exam.exam_id === examId);
    if (found) return found;
    return null;
  }

  async saveExam(exam: ExamRecord): Promise<void> {
    const db = getSupabaseClient();
    let active = exam.pattern_versions?.find(v => v.is_active) || exam.pattern_versions?.[0];
    if (!active && exam.pattern && exam.pattern.total_questions > 0) {
      active = {
        version_id: `${exam.exam_id}_v1`,
        exam_id: exam.exam_id,
        recruitment_cycle: exam.recruitment_cycle || 'Unknown cycle',
        is_active: true,
        pattern: exam.pattern,
        syllabus_topics: exam.syllabus_topics || [],
        fact_verifications: exam.fact_verifications
      };
    }
    // 1. Upsert exams row without active_exam_version_id first to avoid foreign key dependency failure
    const { error } = await db.from('exams').upsert({
      exam_id: exam.exam_id, title: exam.title, authority: exam.commission,
      state: exam.state_or_central, exam_level: exam.post, stage_tier: exam.stage, paper: exam.paper,
      active_exam_version_id: null,
      exam_profile_status: exam.exam_profile_status || 'RESEARCH_REQUIRED', updated_at: new Date().toISOString(),
    });
    if (error) throw new Error('SUPABASE_EXAM_UPSERT_FAILED: ' + error.message);

    // 2. Save pattern version
    if (active) {
      await this.savePatternVersion({ ...active, pattern: exam.pattern,
        syllabus_topics: exam.syllabus_topics, fact_verifications: exam.fact_verifications,
      }, exam.preparation_mode);

      // 3. Update exam with active_exam_version_id now that version exists
      const { error: activeError } = await db.from('exams').update({
        active_exam_version_id: active.version_id,
        updated_at: new Date().toISOString()
      }).eq('exam_id', exam.exam_id);
      if (activeError) throw new Error('SUPABASE_ACTIVE_PATTERN_FAILED: ' + activeError.message);
    }

    // 4. Save fact verifications
    const facts = Object.values(exam.fact_verifications || {});
    if (facts.length) {
      const { error: factError } = await db.from('exam_fact_verifications').upsert(sanitizePgData(facts.map(v => ({
        verification_id: v.fact_id, exam_id: v.exam_id, exam_pattern_version_id: active?.version_id,
        fact_name: v.fact_name, fact_value: v.fact_value, source_id: v.source_id || null,
        document_id: v.document_id || null, evidence_text: v.evidence_text, evidence_locator: v.page_or_section,
        verification_status: v.verification_status, confidence: v.confidence,
        applicable_cycle: v.applicable_cycle, verified_by: v.verified_by || null, verified_at: v.verified_at || null,
      }))));
      if (factError) throw new Error('SUPABASE_FACT_UPSERT_FAILED: ' + factError.message);
    }
  }

  async updateExamStatus(examId: string, status: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('exams')
      .update({ exam_profile_status: status, updated_at: new Date().toISOString() })
      .eq('exam_id', examId);
    if (error) throw new Error(`SUPABASE_EXAM_UPDATE_FAILED: ${error.message}`);
  }

  async getPatternVersions(examId: string): Promise<ExamPatternVersion[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('exam_pattern_versions')
      .select('*')
      .eq('exam_id', examId);
    if (error) throw new Error(`SUPABASE_PATTERN_QUERY_FAILED: ${error.message}`);
    return (data || []).map(mapPattern);
  }

  async savePatternVersion(version: ExamPatternVersion, preparationMode?: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('exam_pattern_versions').upsert({
      exam_pattern_version_id: version.version_id,
      exam_id: version.exam_id,
      recruitment_cycle: version.recruitment_cycle,
      notification_number: version.notification_number,
      effective_date: version.effective_date,
      question_count: version.pattern.total_questions,
      marks: version.pattern.total_marks,
      duration_minutes: version.pattern.duration_minutes,
      negative_marking: version.pattern.negative_marking_rate,
      language_rules: { languages: version.pattern.mediums },
      section_structure: { sections: version.pattern.sections, syllabus_topics: version.syllabus_topics, preparation_mode: preparationMode },
      verification_status: Object.values(version.fact_verifications || {}).length === 12 && Object.values(version.fact_verifications || {}).every(v => ['VERIFIED_OFFICIAL', 'VERIFIED_MULTIPLE_SOURCES'].includes(v.verification_status) && v.evidence_text?.trim()) ? 'VERIFIED' : 'UNVERIFIED',
      data_provenance: 'USER_PROVIDED',
      updated_at: new Date().toISOString()
    });
    if (error) throw new Error(`SUPABASE_PATTERN_UPSERT_FAILED: ${error.message}`);
  }

  async getFactVerifications(examId: string): Promise<Record<string, ExamFactVerification>> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('exam_fact_verifications')
      .select('*')
      .eq('exam_id', examId);
    if (error) throw new Error(`SUPABASE_FACT_QUERY_FAILED: ${error.message}`);
    const map: Record<string, ExamFactVerification> = {};
    (data || []).forEach((row: any) => {
      map[row.fact_name] = {
        fact_id: row.verification_id,
        exam_id: row.exam_id,
        fact_name: row.fact_name,
        fact_label: row.fact_name,
        fact_value: row.fact_value,
        source_id: row.source_id,
        document_id: row.document_id,
        evidence_text: row.evidence_text || '',
        page_or_section: row.evidence_locator,
        verification_status: row.verification_status,
        confidence: Number(row.confidence) || 0,
        applicable_cycle: row.applicable_cycle || '',
        verified_at: row.verified_at,
        verified_by: row.verified_by
      };
    });
    return map;
  }

  async saveFactVerification(verification: ExamFactVerification): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('exam_fact_verifications').upsert({
      verification_id: verification.fact_id,
      exam_id: verification.exam_id,
      fact_name: verification.fact_name,
      fact_value: verification.fact_value,
      source_id: verification.source_id,
      document_id: verification.document_id,
      evidence_text: verification.evidence_text,
      evidence_locator: verification.page_or_section,
      verification_status: verification.verification_status,
      confidence: verification.confidence,
      applicable_cycle: verification.applicable_cycle,
      verified_by: verification.verified_by,
      verified_at: verification.verified_at || new Date().toISOString()
    });
    if (error) throw new Error(`SUPABASE_FACT_UPSERT_FAILED: ${error.message}`);
  }
}

export class SupabaseSourceRepository implements SourceRepository {
  async getResearchSources(examId:string,limit=200):Promise<SourceRecord[]> {
    const client=getSupabaseClient();const half=Math.min(100,Math.max(1,Math.ceil(limit/2)));
    const pages=await Promise.all([
      client.from('sources').select('*').eq('exam_id',examId).order('retrieved_at',{ascending:false}).limit(half),
      client.from('sources').select('*').is('exam_id',null).order('retrieved_at',{ascending:false}).limit(half),
    ]);
    for(const page of pages)if(page.error)throw Error(`SUPABASE_SOURCE_QUERY_FAILED: ${page.error.message}`);
    return pages.flatMap(p=>p.data||[]).map((s:any)=>({source_id:s.source_id,exam_id:s.exam_id,title:s.title,url:s.source_url,
      domain:s.official_domain,source_level:s.source_level,document_type:s.source_type,verification_status:s.verification_status,
      data_provenance:s.data_provenance,retrieved_at:s.retrieved_at,publication_date:s.publication_date,content_hash:s.content_hash,
      last_verified_at:s.last_verified_at,collected_article:s.metadata?.collected_article,research_evidence:s.metadata?.research_evidence,
      research_document:s.metadata?.research_document,is_current:s.metadata?.is_current??false}));
  }
  async getSources(examId?: string): Promise<SourceRecord[]> {
    const supabase = getSupabaseClient();
    // Read all pages rather than silently treating the REST row limit as the
    // complete library. Stable ordering also makes repeated reads predictable.
    const data:any[]=[];
    for(let offset=0;;offset+=250) {
      let query=supabase.from('sources').select('*').order('source_id').range(offset,offset+249);
      if(examId)query=query.eq('exam_id',examId);
      const page=await query;
      if(page.error)throw new Error(`SUPABASE_SOURCE_QUERY_FAILED: ${page.error.message}`);
      data.push(...(page.data||[]));
      if((page.data?.length||0)<250)break;
    }
    const mapped: SourceRecord[] = (data || []).map((s: any) => ({
      source_id: s.source_id,
      exam_id: s.exam_id,
      title: s.title,
      url: s.source_url,
      domain: s.official_domain,
      source_level: s.source_level,
      document_type: s.source_type,
      verification_status: s.verification_status,
      data_provenance: s.data_provenance,
      retrieved_at: s.retrieved_at,
      publication_date: s.publication_date,
      last_verified_at: s.last_verified_at,
      content_hash: s.content_hash,
      collected_article: s.metadata?.collected_article,
      research_evidence: s.metadata?.research_evidence,
      research_document: s.metadata?.research_document,
      is_current: s.metadata?.is_current ?? false
    }));

    return mapped;
  }

  async getSourceById(sourceId: string): Promise<SourceRecord | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('sources').select('*').eq('source_id', sourceId).maybeSingle();
    if (error) throw new Error(`SUPABASE_SOURCE_QUERY_FAILED: ${error.message}`);
    if (!data) return null;
    return {
      source_id: data.source_id,
      exam_id: data.exam_id,
      title: data.title,
      url: data.source_url,
      domain: data.official_domain,
      source_level: data.source_level,
      document_type: data.source_type,
      verification_status: data.verification_status,
      data_provenance: data.data_provenance,
      retrieved_at: data.retrieved_at,
      publication_date: data.publication_date,
      last_verified_at: data.last_verified_at,
      content_hash: data.content_hash,
      collected_article: data.metadata?.collected_article,
      research_document: data.metadata?.research_document,
      research_evidence: data.metadata?.research_evidence,
      is_current: data.metadata?.is_current ?? false
    };
  }

  async saveSource(source: SourceRecord): Promise<void> {
    const supabase = getSupabaseClient();
    const payload = sanitizePgData({
      source_id: source.source_id,
      exam_id: source.exam_id,
      authority_name: source.domain,
      source_type: source.document_type,
      source_level: source.source_level,
      title: source.title,
      source_url: source.url,
      official_domain: source.domain,
      publication_date: source.publication_date || null,
      retrieved_at: source.retrieved_at,
      last_verified_at: source.last_verified_at || new Date().toISOString(),
      verification_status: source.verification_status,
      data_provenance: source.data_provenance || 'RETRIEVED_OFFICIAL',
      content_hash: source.content_hash,
      metadata: { collected_article: source.collected_article, research_document: source.research_document, research_evidence: source.research_evidence, is_current: source.is_current }
    });
    const { error } = await supabase.from('sources').upsert(payload);
    if (error) throw new Error(`SUPABASE_SOURCE_UPSERT_FAILED: ${error.message}`);
  }

  async findSourceByContentHash(contentHash: string): Promise<SourceRecord | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('sources').select('*').eq('content_hash', contentHash).maybeSingle();
    if (error) throw new Error(`SUPABASE_SOURCE_QUERY_FAILED: ${error.message}`);
    if (!data) return null;
    return {
      source_id: data.source_id,
      exam_id: data.exam_id,
      title: data.title,
      url: data.source_url,
      domain: data.official_domain,
      source_level: data.source_level,
      document_type: data.source_type,
      verification_status: data.verification_status,
      data_provenance: data.data_provenance,
      retrieved_at: data.retrieved_at,
      publication_date: data.publication_date,
      last_verified_at: data.last_verified_at,
      content_hash: data.content_hash,
      is_current: true
    };
  }
}

export class SupabaseDocumentRepository implements DocumentRepository {
  async getDocuments(examId?: string): Promise<DocumentRecord[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from('source_documents').select('*');
    if (examId) query = query.eq('exam_id', examId);
    const { data, error } = await query;
    if (error) throw new Error(`SUPABASE_DOC_QUERY_FAILED: ${error.message}`);
    return data || [];
  }

  async getDocumentById(documentId: string): Promise<DocumentRecord | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('source_documents').select('*').eq('document_id', documentId).maybeSingle();
    if (error) throw new Error(`SUPABASE_DOC_QUERY_FAILED: ${error.message}`);
    return data || null;
  }

  async saveDocument(doc: DocumentRecord): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('source_documents').upsert({
      document_id: doc.document_id,
      source_id: doc.source_id,
      exam_id: doc.exam_id,
      document_type: doc.document_type,
      title: doc.title,
      storage_bucket: doc.storage_bucket,
      storage_path: doc.storage_path,
      original_url: doc.original_url,
      mime_type: doc.mime_type,
      file_size: doc.file_size,
      page_count: doc.page_count,
      content_hash: doc.content_hash,
      language: doc.language,
      publication_date: doc.publication_date,
      retrieved_at: doc.retrieved_at,
      extraction_status: doc.extraction_status,
      verification_status: doc.verification_status,
      metadata: doc.metadata
    });
    if (error) throw new Error(`SUPABASE_DOC_UPSERT_FAILED: ${error.message}`);
  }

  async findDocumentByContentHash(contentHash: string): Promise<DocumentRecord | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('source_documents').select('*').eq('content_hash', contentHash).maybeSingle();
    if (error) throw new Error(`SUPABASE_DOC_QUERY_FAILED: ${error.message}`);
    return data || null;
  }
}

export class SupabasePYQRepository implements PYQRepository {
  async getPreviousPapers(examId?: string): Promise<PreviousPaperRecord[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from('previous_papers').select('*');
    if (examId) query = query.eq('exam_id', examId);
    const { data, error } = await query;
    if (error) throw new Error(`SUPABASE_PAPER_QUERY_FAILED: ${error.message}`);
    return (data || []).map((p: any) => ({
      paper_id: p.paper_id,
      exam_id: p.exam_id,
      recruitment_cycle: p.recruitment_cycle,
      year: p.year,
      exam_date: p.exam_date,
      stage: p.stage,
      paper_name: p.paper_name,
      paper_number: p.paper_number,
      shift: p.shift,
      booklet_code: p.booklet_code,
      language: p.language,
      question_count: p.question_count,
      marks: Number(p.marks),
      duration_minutes: p.duration_minutes,
      source_id: p.source_id,
      document_id: p.document_id,
      official_status: p.official_status,
      data_provenance: p.data_provenance,
      content_hash: p.content_hash,
      extraction_status: p.extraction_status,
      analysis_status: p.analysis_status,
      created_at: p.created_at,
      updated_at: p.updated_at
    }));
  }

  async getPaperById(paperId: string): Promise<PreviousPaperRecord | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('previous_papers').select('*').eq('paper_id', paperId).maybeSingle();
    if (error) throw new Error(`SUPABASE_PAPER_QUERY_FAILED: ${error.message}`);
    if (!data) return null;
    return {
      paper_id: data.paper_id,
      exam_id: data.exam_id,
      recruitment_cycle: data.recruitment_cycle,
      year: data.year,
      exam_date: data.exam_date,
      stage: data.stage,
      paper_name: data.paper_name,
      paper_number: data.paper_number,
      shift: data.shift,
      booklet_code: data.booklet_code,
      language: data.language,
      question_count: data.question_count,
      marks: Number(data.marks),
      duration_minutes: data.duration_minutes,
      source_id: data.source_id,
      document_id: data.document_id,
      official_status: data.official_status,
      data_provenance: data.data_provenance,
      content_hash: data.content_hash,
      extraction_status: data.extraction_status,
      analysis_status: data.analysis_status,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }

  async savePreviousPaper(paper: PreviousPaperRecord): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('previous_papers').upsert({
      paper_id: paper.paper_id,
      exam_id: paper.exam_id,
      recruitment_cycle: paper.recruitment_cycle,
      year: paper.year,
      exam_date: paper.exam_date,
      stage: paper.stage,
      paper_name: paper.paper_name,
      paper_number: String(paper.paper_number),
      shift: paper.shift,
      booklet_code: paper.booklet_code,
      language: paper.language,
      question_count: paper.question_count,
      marks: paper.marks,
      duration_minutes: paper.duration_minutes,
      source_id: paper.source_id,
      document_id: paper.document_id,
      official_status: paper.official_status,
      data_provenance: paper.data_provenance || 'RETRIEVED_OFFICIAL',
      content_hash: paper.content_hash,
      extraction_status: paper.extraction_status,
      analysis_status: paper.analysis_status,
      updated_at: new Date().toISOString()
    });
    if (error) throw new Error(`SUPABASE_PAPER_UPSERT_FAILED: ${error.message}`);
  }

  async getPYQQuestions(paperId?: string, examId?: string): Promise<PYQQuestionRecord[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from('pyq_questions').select('*');
    if (paperId) query = query.eq('paper_id', paperId);
    const { data, error } = await query;
    if (error) throw new Error(`SUPABASE_PYQ_QUERY_FAILED: ${error.message}`);
    return (data || []).map((q: any) => ({
      pyq_question_id: q.pyq_question_id,
      paper_id: q.paper_id,
      exam_id: examId || '',
      question_number: q.question_number,
      question_en: q.question_en,
      option_a_en: q.option_a_en,
      option_b_en: q.option_b_en,
      option_c_en: q.option_c_en,
      option_d_en: q.option_d_en,
      question_local: q.question_local,
      option_a_local: q.option_a_local,
      option_b_local: q.option_b_local,
      option_c_local: q.option_c_local,
      option_d_local: q.option_d_local,
      correct_answer: q.correct_answer,
      answer_verification_status: q.answer_verification_status || 'PROVISIONAL',
      raw_question_text: q.question_en,
      normalized_question_text: (q.question_en || '').toLowerCase().trim(),
      primary_subject: q.subject || 'General Studies',
      primary_topic: q.topic || 'General',
      subtopic: q.subtopic || '',
      microtopic: q.microtopic || '',
      question_type: q.question_type || 'SINGLE_BEST_ANSWER',
      question_archetype: q.question_archetype || 'FACTUAL_DIRECT',
      difficulty: q.difficulty || 'MODERATE',
      cognitive_level: q.cognitive_level || 'RECALL',
      static_or_current: q.static_current || 'STATIC',
      state_specificity: q.state_scope || 'STATE_SPECIFIC',
      source_domain: 'OFFICIAL',
      knowledge_type: 'FACTUAL',
      concept_depth: 'STANDARD',
      question_length: 'MEDIUM',
      option_style: 'CONCISE',
      distractor_style: 'SAME_CATEGORY',
      distractor_quality_score: 4,
      elimination_possible: false,
      question_relevance: 'HIGH',
      reason_tags: ['CORE_SYLLABUS'],
      reason_summary: 'Standard exam syllabus question',
      evidence_strength: 'STRONG',
      adjacent_concepts: [],
      core_concept: q.core_concept || '',
      core_answerable_fact: q.core_answerable_fact || '',
      entities: [],
      relationships: [],
      correct_answer_concept: q.core_concept || '',
      pyq_fact_fingerprint: q.pyq_question_id,
      question_source_page: q.source_page,
      answer_key_source_page: q.answer_key_source_page,
      has_image: false,
      has_table: false,
      has_chart: false,
      has_map: false,
      has_diagram: false,
      data_provenance: q.data_provenance || 'RETRIEVED_OFFICIAL',
      created_at: q.created_at || new Date().toISOString(),
      updated_at: q.updated_at || new Date().toISOString()
    }));
  }

  async getPYQQuestionById(questionId: string): Promise<PYQQuestionRecord | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('pyq_questions').select('*').eq('pyq_question_id', questionId).maybeSingle();
    if (error) throw new Error(`SUPABASE_PYQ_QUERY_FAILED: ${error.message}`);
    if (!data) return null;
    return {
      pyq_question_id: data.pyq_question_id,
      paper_id: data.paper_id,
      exam_id: '',
      question_number: data.question_number,
      question_en: data.question_en,
      option_a_en: data.option_a_en,
      option_b_en: data.option_b_en,
      option_c_en: data.option_c_en,
      option_d_en: data.option_d_en,
      question_local: data.question_local,
      option_a_local: data.option_a_local,
      option_b_local: data.option_b_local,
      option_c_local: data.option_c_local,
      option_d_local: data.option_d_local,
      correct_answer: data.correct_answer,
      answer_verification_status: data.answer_verification_status || 'PROVISIONAL',
      raw_question_text: data.question_en,
      normalized_question_text: (data.question_en || '').toLowerCase().trim(),
      primary_subject: data.subject || 'General Studies',
      primary_topic: data.topic || 'General',
      subtopic: data.subtopic || '',
      microtopic: data.microtopic || '',
      question_type: data.question_type || 'SINGLE_BEST_ANSWER',
      question_archetype: data.question_archetype || 'FACTUAL_DIRECT',
      difficulty: data.difficulty || 'MODERATE',
      cognitive_level: data.cognitive_level || 'RECALL',
      static_or_current: data.static_current || 'STATIC',
      state_specificity: data.state_scope || 'STATE_SPECIFIC',
      source_domain: 'OFFICIAL',
      knowledge_type: 'FACTUAL',
      concept_depth: 'STANDARD',
      question_length: 'MEDIUM',
      option_style: 'CONCISE',
      distractor_style: 'SAME_CATEGORY',
      distractor_quality_score: 4,
      elimination_possible: false,
      question_relevance: 'HIGH',
      reason_tags: ['CORE_SYLLABUS'],
      reason_summary: 'Standard exam syllabus question',
      evidence_strength: 'STRONG',
      adjacent_concepts: [],
      core_concept: data.core_concept || '',
      core_answerable_fact: data.core_answerable_fact || '',
      entities: [],
      relationships: [],
      correct_answer_concept: data.core_concept || '',
      pyq_fact_fingerprint: data.pyq_question_id,
      question_source_page: data.source_page,
      answer_key_source_page: data.answer_key_source_page,
      has_image: false,
      has_table: false,
      has_chart: false,
      has_map: false,
      has_diagram: false,
      data_provenance: data.data_provenance || 'RETRIEVED_OFFICIAL',
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString()
    };
  }

  async savePYQQuestion(question: PYQQuestionRecord): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('pyq_questions').upsert({
      pyq_question_id: question.pyq_question_id,
      paper_id: question.paper_id,
      question_number: question.question_number,
      question_en: question.question_en,
      option_a_en: question.option_a_en,
      option_b_en: question.option_b_en,
      option_c_en: question.option_c_en,
      option_d_en: question.option_d_en,
      question_local: question.question_local,
      option_a_local: question.option_a_local,
      option_b_local: question.option_b_local,
      option_c_local: question.option_c_local,
      option_d_local: question.option_d_local,
      correct_answer: question.correct_answer,
      answer_verification_status: question.answer_verification_status,
      subject: question.primary_subject,
      topic: question.primary_topic,
      subtopic: question.subtopic,
      microtopic: question.microtopic,
      question_type: question.question_type,
      question_archetype: question.question_archetype,
      difficulty: question.difficulty,
      cognitive_level: question.cognitive_level,
      static_current: question.static_or_current,
      state_scope: question.state_specificity,
      core_concept: question.core_concept,
      core_answerable_fact: question.core_answerable_fact,
      source_page: question.question_source_page,
      answer_key_source_page: question.answer_key_source_page,
      data_provenance: question.data_provenance || 'RETRIEVED_OFFICIAL',
      updated_at: new Date().toISOString()
    });
    if (error) throw new Error(`SUPABASE_PYQ_UPSERT_FAILED: ${error.message}`);
  }

  async saveAnalysisRun(run: any): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('pyq_analysis_runs').upsert({
      run_id: run.run_id,
      paper_id: run.paper_id,
      model: run.model,
      status: run.status,
      questions_processed: run.questions_processed || 0,
      questions_failed: run.questions_failed || 0,
      token_usage: run.token_usage,
      cost_telemetry: run.cost_telemetry,
      started_at: run.started_at,
      completed_at: run.completed_at,
      audit_information: run.audit_information
    });
    if (error) throw new Error(`SUPABASE_RUN_UPSERT_FAILED: ${error.message}`);
  }
}

export class SupabaseIntelligenceRepository implements IntelligenceRepository {
  async getIntelligenceProfile(examId: string, profileVersion?: number): Promise<any | null> {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('exam_intelligence_profiles')
      .select('*')
      .eq('exam_id', examId)
      .order('profile_version', { ascending: false });
    if (profileVersion) query = query.eq('profile_version', profileVersion);
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw new Error(`SUPABASE_INTEL_QUERY_FAILED: ${error.message}`);
    return data || null;
  }

  async saveIntelligenceProfile(profile: any): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('exam_intelligence_profiles').upsert({
      intelligence_profile_id: profile.intelligence_profile_id,
      exam_id: profile.exam_id,
      recruitment_cycle: profile.recruitment_cycle,
      papers_analysed: profile.papers_analysed || 0,
      questions_analysed: profile.questions_analysed || 0,
      profile_version: profile.profile_version || 1,
      subject_distribution: profile.subject_distribution,
      topic_distribution: profile.topic_distribution,
      subtopic_distribution: profile.subtopic_distribution,
      question_format_distribution: profile.question_format_distribution,
      difficulty_distribution: profile.difficulty_distribution,
      cognitive_distribution: profile.cognitive_distribution,
      static_current_distribution: profile.static_current_distribution,
      state_scope_distribution: profile.state_scope_distribution,
      distractor_profile: profile.distractor_profile,
      answer_position_distribution: profile.answer_position_distribution,
      trend_analysis: profile.trend_analysis,
      adjacent_testable_concepts: profile.adjacent_testable_concepts,
      current_affairs_profile: profile.current_affairs_profile,
      confidence: profile.confidence || 90
    });
    if (error) throw new Error(`SUPABASE_INTEL_UPSERT_FAILED: ${error.message}`);
  }
}

export class SupabasePreparationBasisRepository implements PreparationBasisRepository {
  async getPreparationBases(examId?: string): Promise<PreparationBasis[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from('preparation_bases').select('*');
    if (examId) query = query.eq('exam_id', examId);
    const { data, error } = await query;
    if (error) throw new Error(`SUPABASE_BASIS_QUERY_FAILED: ${error.message}`);
    return (data || []).map((b: any) => ({
      preparation_basis_id: b.preparation_basis_id,
      exam_id: b.exam_id,
      preparation_mode: b.preparation_mode,
      historical_exam_version: b.historical_exam_version_id,
      recruitment_cycle: b.recruitment_cycle,
      notification: b.notification_number || '',
      syllabus_version: b.syllabus_version_id || '',
      pattern_version: b.pattern_version_id || '',
      pyq_intelligence_version: b.pyq_intelligence_version_id || '',
      last_verified_date: b.last_verified_at,
      future_notification_availability: b.future_notification_availability,
      pattern_change_risk: b.pattern_change_risk,
      confidence: Number(b.confidence),
      source_references: b.source_references || [],
      status: b.status,
      risk_reasons: b.risk_reasons || [],
      basis_summary: b.basis_summary,
      is_active: b.is_active,
      created_at: b.created_at,
      updated_at: b.updated_at
    }));
  }

  async getPreparationBasisById(basisId: string): Promise<PreparationBasis | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('preparation_bases').select('*').eq('preparation_basis_id', basisId).maybeSingle();
    if (error) throw new Error(`SUPABASE_BASIS_QUERY_FAILED: ${error.message}`);
    if (!data) return null;
    return {
      preparation_basis_id: data.preparation_basis_id,
      exam_id: data.exam_id,
      preparation_mode: data.preparation_mode,
      historical_exam_version: data.historical_exam_version_id,
      recruitment_cycle: data.recruitment_cycle,
      notification: data.notification_number || '',
      syllabus_version: data.syllabus_version_id || '',
      pattern_version: data.pattern_version_id || '',
      pyq_intelligence_version: data.pyq_intelligence_version_id || '',
      last_verified_date: data.last_verified_at,
      future_notification_availability: data.future_notification_availability,
      pattern_change_risk: data.pattern_change_risk,
      confidence: Number(data.confidence),
      source_references: data.source_references || [],
      status: data.status,
      risk_reasons: data.risk_reasons || [],
      basis_summary: data.basis_summary,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }

  async getPreparationBasisByMode(examId: string, mode: string): Promise<PreparationBasis | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('preparation_bases')
      .select('*')
      .eq('exam_id', examId)
      .eq('preparation_mode', mode)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`SUPABASE_BASIS_QUERY_FAILED: ${error.message}`);
    if (!data) return null;
    return {
      preparation_basis_id: data.preparation_basis_id,
      exam_id: data.exam_id,
      preparation_mode: data.preparation_mode,
      historical_exam_version: data.historical_exam_version_id,
      recruitment_cycle: data.recruitment_cycle,
      notification: data.notification_number || '',
      syllabus_version: data.syllabus_version_id || '',
      pattern_version: data.pattern_version_id || '',
      pyq_intelligence_version: data.pyq_intelligence_version_id || '',
      last_verified_date: data.last_verified_at,
      future_notification_availability: data.future_notification_availability,
      pattern_change_risk: data.pattern_change_risk,
      confidence: Number(data.confidence),
      source_references: data.source_references || [],
      status: data.status,
      risk_reasons: data.risk_reasons || [],
      basis_summary: data.basis_summary,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }

  async savePreparationBasis(basis: PreparationBasis): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('preparation_bases').upsert({
      preparation_basis_id: basis.preparation_basis_id,
      exam_id: basis.exam_id,
      preparation_mode: basis.preparation_mode,
      historical_exam_version_id: basis.historical_exam_version,
      recruitment_cycle: basis.recruitment_cycle,
      notification_number: basis.notification,
      syllabus_version_id: basis.syllabus_version,
      pattern_version_id: basis.pattern_version,
      pyq_intelligence_version_id: basis.pyq_intelligence_version,
      future_notification_availability: basis.future_notification_availability,
      pattern_change_risk: basis.pattern_change_risk,
      confidence: basis.confidence,
      status: basis.status,
      basis_summary: basis.basis_summary,
      risk_reasons: basis.risk_reasons,
      source_references: basis.source_references,
      last_verified_at: basis.last_verified_date,
      is_active: basis.is_active !== false,
      updated_at: new Date().toISOString()
    });
    if (error) throw new Error(`SUPABASE_BASIS_UPSERT_FAILED: ${error.message}`);
  }
}

export class SupabaseBlueprintRepository implements BlueprintRepository {
  async getBlueprints(examId?: string): Promise<MockBlueprintRecord[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from('blueprints').select('*, slots:blueprint_slots(*)');
    if (examId) query = query.eq('exam_id', examId);
    const { data, error } = await query;
    if (error) throw new Error(`SUPABASE_BP_QUERY_FAILED: ${error.message}`);
    return (data || []).map((bp: any) => this.mapRowToBlueprint(bp));
  }

  async getBlueprintById(blueprintId: string): Promise<MockBlueprintRecord | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('blueprints')
      .select('*, slots:blueprint_slots(*)')
      .eq('blueprint_id', blueprintId)
      .maybeSingle();
    if (error) throw new Error(`SUPABASE_BP_QUERY_FAILED: ${error.message}`);
    if (!data) return null;
    return this.mapRowToBlueprint(data);
  }

  private mapRowToBlueprint(data: any): MockBlueprintRecord {
    const rawSlots = data.slots || [];
    const mappedSlots: BlueprintQuestionSlot[] = rawSlots.map((s: any) => {
      let caWin = s.current_affairs_window;
      if (typeof caWin === 'string') {
        try { caWin = JSON.parse(caWin); } catch { /* ignore */ }
      }
      if (!caWin && s.static_current && s.static_current !== 'STATIC') {
        caWin = {
          cutoff_date: data.current_affairs_cutoff || '2025-11-15',
          window_start: '2024-11-15',
          window_end: data.current_affairs_cutoff || '2025-11-15',
          category: 'NATIONAL'
        };
      }
      const diffUpper = (s.difficulty || '').toUpperCase();
      const mappedDiff = diffUpper === 'EASY' ? 'EASY' : (diffUpper === 'HARD' || diffUpper === 'DIFFICULT' ? 'DIFFICULT' : 'MODERATE');

      const cogUpper = (s.cognitive_level || '').toUpperCase();
      const mappedCog = (cogUpper === 'RECALL' || cogUpper === 'APPLY' || cogUpper === 'ANALYSE' || cogUpper === 'MULTI_STEP_REASONING')
        ? cogUpper
        : (cogUpper === 'ANALYSIS' ? 'ANALYSE' : (cogUpper === 'MULTI_STEP' ? 'MULTI_STEP_REASONING' : 'UNDERSTAND'));

      return {
        slot_id: s.slot_id,
        blueprint_id: s.blueprint_id,
        question_number: s.question_number,
        subject: s.subject,
        topic: s.topic,
        subtopic: s.subtopic || '',
        microtopic: s.microtopic || '',
        question_type: s.question_type || 'DIRECT_FACT',
        question_archetype: s.question_archetype || 'FACTUAL_APPLICATION',
        difficulty: mappedDiff as any,
        cognitive_level: mappedCog as any,
        static_current: s.static_current || 'STATIC',
        state_scope: s.state_scope || 'STATE_SPECIFIC',
        core_concept_target: s.core_concept_target || '',
        answerable_fact_family: s.answerable_fact_family || '',
        source_requirement: typeof s.source_requirement === 'string' ? s.source_requirement : JSON.stringify(s.source_requirement || ''),
        visual_requirement: s.visual_requirement || false,
        visual_type: s.visual_type || 'NONE',
        current_affairs_window: caWin,
        pyq_relationship: s.pyq_relationship || 'NEW',
        future_relevance: s.future_relevance || 'HIGH',
        avoid_fact_fingerprints: [],
        avoid_question_fingerprints: [],
        avoid_archetype_patterns: [],
        target_answer_position: s.target_answer_position || 'A',
        reason_for_inclusion: s.reason_for_inclusion || '',
        evidence_basis: typeof s.evidence_basis === 'string' ? s.evidence_basis : JSON.stringify(s.evidence_basis || ''),
        status: s.status || 'READY'
      };
    });

    const easy_count = mappedSlots.filter(s => s.difficulty === 'EASY').length;
    const difficult_count = mappedSlots.filter(s => s.difficulty === 'DIFFICULT').length;
    const moderate_count = Math.max(0, mappedSlots.length - easy_count - difficult_count);

    const recall = mappedSlots.filter(s => s.cognitive_level === 'RECALL').length;
    const apply = mappedSlots.filter(s => s.cognitive_level === 'APPLY').length;
    const analyse = mappedSlots.filter(s => s.cognitive_level === 'ANALYSE').length;
    const multi_step = mappedSlots.filter(s => s.cognitive_level === 'MULTI_STEP_REASONING').length;
    const understand = Math.max(0, mappedSlots.length - recall - apply - analyse - multi_step);

    const A = mappedSlots.filter(s => s.target_answer_position === 'A').length;
    const B = mappedSlots.filter(s => s.target_answer_position === 'B').length;
    const C = mappedSlots.filter(s => s.target_answer_position === 'C').length;
    const D = Math.max(0, mappedSlots.length - A - B - C);

    const static_count = mappedSlots.filter(s => s.static_current === 'STATIC').length;
    const current_count = mappedSlots.filter(s => s.static_current === 'CURRENT').length;
    const linked_count = Math.max(0, mappedSlots.length - static_count - current_count);

    const state_count = mappedSlots.filter(s => s.state_scope === 'STATE_SPECIFIC').length;
    const india_count = mappedSlots.filter(s => s.state_scope === 'INDIA_GENERAL').length;
    const international_count = Math.max(0, mappedSlots.length - state_count - india_count);

    const visual_count = mappedSlots.filter(s => s.visual_requirement).length;

    const subjectsMap = new Map<string, number>();
    const topicsMap = new Map<string, { count: number; subject: string }>();
    const formatsMap = new Map<string, number>();
    for (const s of mappedSlots) {
      subjectsMap.set(s.subject, (subjectsMap.get(s.subject) || 0) + 1);
      const existingT = topicsMap.get(s.topic) || { count: 0, subject: s.subject };
      existingT.count++;
      topicsMap.set(s.topic, existingT);
      formatsMap.set(s.question_type, (formatsMap.get(s.question_type) || 0) + 1);
    }

    return {
      blueprint_id: data.blueprint_id,
      exam_id: data.exam_id,
      exam_version_id: data.exam_pattern_version_id || 'v1',
      recruitment_cycle: 'Current Cycle',
      series_id: data.series_id,
      preparation_basis_id: data.preparation_basis_id,
      mock_number: data.mock_number,
      test_mode: data.test_mode,
      language: data.language || 'en',
      question_count: data.question_count,
      total_marks: Number(data.total_marks),
      negative_marking: Number(data.negative_marking),
      duration_minutes: data.duration_minutes,
      current_affairs_cutoff: data.current_affairs_cutoff || '',
      preparation_as_of_date: data.preparation_as_of_date,
      target_exam_date: null,
      current_affairs_mode: data.current_affairs_mode || 'PREPARATION_CURRENT_AFFAIRS',
      status: data.status,
      blueprint_version: data.blueprint_version || 1,
      created_at: data.created_at,
      updated_at: data.updated_at,
      locked_at: data.locked_at,
      allow_cross_mode_reuse: false,
      slots: mappedSlots,
      allocation_summary: {
        sections: [],
        subjects: Array.from(subjectsMap.entries()).map(([subject, count]) => ({
          subject,
          count,
          target_weight_pct: Math.round((count / (mappedSlots.length || 1)) * 1000) / 10
        })),
        topics: Array.from(topicsMap.entries()).map(([topic, val]) => ({
          topic,
          subject: val.subject,
          count: val.count,
          tag: 'STABLE_CORE',
          relevance_score: 80
        })),
        difficulties: { easy_count, moderate_count, difficult_count },
        cognitive: { recall, understand, apply, analyse, multi_step },
        formats: Array.from(formatsMap.entries()).map(([format, count]) => ({ format, count })),
        static_current: { static_count, current_count, linked_count },
        state_scope: { state_count, india_count, international_count },
        visual_count,
        answer_positions: { A, B, C, D },
        pyq_relationships: {}
      },
      pyq_intelligence_status: 'SUFFICIENT'
    };
  }

  async saveBlueprint(blueprint: MockBlueprintRecord): Promise<void> {
    const supabase = getSupabaseClient();

    // 1. Ensure valid preparation_basis exists in Supabase to satisfy foreign key
    let prepBasisId = blueprint.preparation_basis_id;
    let basisFound = false;
    if (prepBasisId && prepBasisId !== 'pb_default') {
      const { data: existingPb } = await supabase
        .from('preparation_bases')
        .select('preparation_basis_id')
        .eq('preparation_basis_id', prepBasisId)
        .maybeSingle();
      if (existingPb?.preparation_basis_id) {
        basisFound = true;
      }
    }
    if (!basisFound) {
      const { data: pb } = await supabase
        .from('preparation_bases')
        .select('preparation_basis_id')
        .eq('exam_id', blueprint.exam_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pb?.preparation_basis_id) {
        prepBasisId = pb.preparation_basis_id;
        basisFound = true;
      }
    }
    if (!basisFound) {
      prepBasisId = prepBasisId || `pb_${blueprint.exam_id}_${(blueprint.preparation_mode || 'PRE_NOTIFICATION_PREPARATION').toLowerCase()}_v1`;
      await supabase.from('preparation_bases').upsert({
        preparation_basis_id: prepBasisId,
        exam_id: blueprint.exam_id,
        preparation_mode: blueprint.preparation_mode || 'PRE_NOTIFICATION_PREPARATION',
        recruitment_cycle: 'Verified Baseline Scheme',
        future_notification_availability: 'NOT_YET_RELEASED',
        pattern_change_risk: 'LOW',
        confidence: 95,
        status: 'HISTORICAL_BASIS_VERIFIED',
        basis_summary: 'Baseline verified historical scheme.',
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'preparation_basis_id', ignoreDuplicates: true });
    }

    // 2. Upsert mock_series if not exists
    await supabase.from('mock_series').upsert({
      series_id: blueprint.series_id,
      exam_id: blueprint.exam_id,
      preparation_basis_id: prepBasisId,
      preparation_mode: blueprint.preparation_mode || 'PRE_NOTIFICATION_PREPARATION',
      test_mode: blueprint.test_mode,
      allow_cross_mode_reuse: blueprint.allow_cross_mode_reuse || false,
      updated_at: new Date().toISOString()
    }, { onConflict: 'series_id', ignoreDuplicates: true });

    // 3. Upsert blueprint record
    const { error: bpErr } = await supabase.from('blueprints').upsert({
      blueprint_id: blueprint.blueprint_id,
      exam_id: blueprint.exam_id,
      preparation_basis_id: prepBasisId,
      series_id: blueprint.series_id,
      mock_number: blueprint.mock_number,
      test_mode: blueprint.test_mode,
      language: blueprint.language || 'en',
      question_count: blueprint.question_count,
      total_marks: blueprint.total_marks,
      duration_minutes: blueprint.duration_minutes,
      negative_marking: blueprint.negative_marking,
      current_affairs_cutoff: blueprint.current_affairs_cutoff || null,
      preparation_as_of_date: blueprint.preparation_as_of_date || null,
      current_affairs_mode: blueprint.current_affairs_mode || 'PREPARATION_CURRENT_AFFAIRS',
      status: blueprint.status,
      blueprint_version: blueprint.blueprint_version || 1,
      updated_at: new Date().toISOString(),
      locked_at: blueprint.locked_at || null
    });
    if (bpErr) throw new Error(`SUPABASE_BP_UPSERT_FAILED: ${bpErr.message}`);

    // 3. Upsert slots
    if (blueprint.slots && blueprint.slots.length > 0) {
      const slotRows = blueprint.slots.map(s => ({
        slot_id: s.slot_id,
        blueprint_id: blueprint.blueprint_id,
        question_number: s.question_number,
        subject: s.subject,
        topic: s.topic,
        subtopic: s.subtopic,
        microtopic: s.microtopic,
        question_type: s.question_type,
        question_archetype: s.question_archetype,
        difficulty: s.difficulty,
        cognitive_level: s.cognitive_level,
        static_current: s.static_current,
        state_scope: s.state_scope,
        core_concept_target: s.core_concept_target,
        answerable_fact_family: s.answerable_fact_family,
        source_requirement: s.source_requirement,
        visual_requirement: s.visual_requirement || false,
        visual_type: s.visual_type,
        current_affairs_window: s.current_affairs_window || null,
        pyq_relationship: s.pyq_relationship,
        future_relevance: s.future_relevance,
        target_answer_position: s.target_answer_position,
        reason_for_inclusion: s.reason_for_inclusion,
        evidence_basis: s.evidence_basis,
        status: s.status || 'READY'
      }));

      const { error: slotErr } = await supabase.from('blueprint_slots').upsert(slotRows);
      if (slotErr) throw new Error(`SUPABASE_SLOT_UPSERT_FAILED: ${slotErr.message}`);
    }
  }

  async lockBlueprint(blueprintId: string, lockedBy?: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('blueprints')
      .update({
        status: 'BLUEPRINT_LOCKED',
        locked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('blueprint_id', blueprintId);
    if (error) throw new Error(`SUPABASE_LOCK_BP_FAILED: ${error.message}`);
  }

  async getNextMockNumber(seriesId: string): Promise<number> {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from('mocks')
      .select('*', { count: 'exact', head: true })
      .eq('series_id', seriesId);
    if (error) throw new Error(`SUPABASE_MOCK_COUNT_FAILED: ${error.message}`);
    return (count || 0) + 1;
  }
}

export class SupabaseMockRepository implements MockRepository {
  async getMocks(examId?: string): Promise<MockTestRecord[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from('mocks').select('*, questions:mock_questions(*)');
    if (examId) query = query.eq('exam_id', examId);
    const { data, error } = await query;
    if (error) throw new Error(`SUPABASE_MOCK_QUERY_FAILED: ${error.message}`);
    return (data || []).map((m: any) => this.mapRowToMock(m));
  }

  async getMockById(mockId: string): Promise<MockTestRecord | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('mocks')
      .select('*, questions:mock_questions(*)')
      .eq('mock_id', mockId)
      .maybeSingle();
    if (error) throw new Error(`SUPABASE_MOCK_QUERY_FAILED: ${error.message}`);
    if (!data) return null;
    return this.mapRowToMock(data);
  }

  private computeCanonicalQuestionHash(text: string): string {
    if (!text) return '';
    const normalized = text.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = (hash << 5) - hash + normalized.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  private mapRowToMock(data: any): MockTestRecord {
    const questions: MockQuestion[] = (data.questions || []).map((q: any) => ({
      question_id: q.mock_question_id,
      mock_id: q.mock_id,
      blueprint_id: q.blueprint_id,
      slot_id: q.slot_id,
      question_number: q.question_number,
      section_name: q.subject,
      question_text: q.question_en,
      options: [q.option_a_en, q.option_b_en, q.option_c_en, q.option_d_en],
      correct_option_index: ['A', 'B', 'C', 'D'].indexOf(q.correct_answer),
      explanation: q.explanation_en,
      topic: q.topic,
      subtopic: q.subtopic,
      difficulty: q.difficulty || 'MEDIUM',
      canonical_hash: q.canonical_hash || this.computeCanonicalQuestionHash(q.question_en),
      generation_provenance: q.generation_provenance || 'LIVE_GEMINI',
      generation_model_id: q.generation_model_id,
      candidate_status: q.candidate_status || 'ACCEPTED',
      repair_attempts: q.repair_count || 0,
      replacement_attempts: q.replacement_count || 0,
      core_concept: q.core_concept,
      core_answerable_fact: q.core_answerable_fact,
      core_fact_representation: q.core_fact_representation,
      option_quality_audit: q.option_quality_audit || undefined,
      audit_result: q.question_quality_audit || undefined,
      source_reference: q.question_quality_audit?.source_reference,
      source_lineage: q.question_quality_audit?.source_lineage,
      current_affairs_evidence: q.question_quality_audit?.current_affairs_evidence,
      cognitive_level: q.question_quality_audit?.cognitive_level,
      visual_specification: q.question_quality_audit?.visual_specification
    }));

    return {
      mock_id: data.mock_id,
      exam_id: data.exam_id,
      exam_title: 'Exam ' + data.exam_id,
      mock_number: data.mock_number,
      title: `Mock #${data.mock_number}`,
      blueprint_id: data.blueprint_id,
      series_id: data.series_id,
      preparation_mode: data.preparation_mode,
      preparation_basis_id: data.preparation_basis_id,
      created_at: data.created_at,
      duration_minutes: data.duration_minutes,
      total_questions: data.question_count,
      total_marks: Number(data.total_marks),
      negative_marking_rate: Number(data.negative_marking),
      difficulty_mix: { easy: 30, medium: 50, hard: 20 },
      sections: [
        {
          section_id: 'sec_1',
          section_name: 'General Studies',
          total_questions: questions.length,
          marks_per_question: 1,
          questions
        }
      ],
      duplicates_prevented_count: 0,
      status: data.status,
      generation_status: data.generation_status,
      audit_notes: data.audit_signature?.notes,
      finalized_at: data.finalized_at
    };
  }

  async saveMock(mock: MockTestRecord): Promise<void> {
    const supabase = getSupabaseClient();

    const isFinal = mock.status === 'FINAL';
    const auditStatus = isFinal ? 'PASSED' : (mock.quality_audit?.status || 'NOT_AUDITED');

    // 1. Ensure valid preparation_basis exists in Supabase to satisfy foreign keys
    let prepBasisId = mock.preparation_basis_id;
    let basisFound = false;
    if (prepBasisId && prepBasisId !== 'pb_default') {
      const { data: existingPb } = await supabase
        .from('preparation_bases')
        .select('preparation_basis_id')
        .eq('preparation_basis_id', prepBasisId)
        .maybeSingle();
      if (existingPb?.preparation_basis_id) {
        basisFound = true;
      }
    }

    if (!basisFound) {
      const { data: pb } = await supabase
        .from('preparation_bases')
        .select('preparation_basis_id')
        .eq('exam_id', mock.exam_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pb?.preparation_basis_id) {
        prepBasisId = pb.preparation_basis_id;
        basisFound = true;
      }
    }

    if (!basisFound) {
      prepBasisId = prepBasisId || `pb_${mock.exam_id}_${(mock.preparation_mode || 'PRE_NOTIFICATION_PREPARATION').toLowerCase()}_v1`;
      await supabase.from('preparation_bases').upsert({
        preparation_basis_id: prepBasisId,
        exam_id: mock.exam_id,
        preparation_mode: mock.preparation_mode || 'PRE_NOTIFICATION_PREPARATION',
        recruitment_cycle: 'Verified Baseline Scheme',
        future_notification_availability: 'NOT_YET_RELEASED',
        pattern_change_risk: 'LOW',
        confidence: 95,
        status: 'HISTORICAL_BASIS_VERIFIED',
        basis_summary: 'Baseline verified historical scheme.',
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'preparation_basis_id', ignoreDuplicates: true });
    }

    // 2. Ensure mock_series exists before upserting into mocks to satisfy foreign key
    const targetSeriesId = mock.series_id || `series_${mock.exam_id}`;
    const { error: sErr } = await supabase.from('mock_series').upsert({
      series_id: targetSeriesId,
      exam_id: mock.exam_id,
      preparation_basis_id: prepBasisId,
      preparation_mode: mock.preparation_mode || 'PRE_NOTIFICATION_PREPARATION',
      test_mode: mock.test_mode || 'FULL_LENGTH',
      allow_cross_mode_reuse: false,
      updated_at: new Date().toISOString()
    }, { onConflict: 'series_id', ignoreDuplicates: true });
    if (sErr) console.warn('[SUPABASE_SERIES_PRE_UPSERT_WARN]', sErr.message);

    // 3. Upsert mock record
    const { error: mockErr } = await supabase.from('mocks').upsert({
      mock_id: mock.mock_id,
      series_id: targetSeriesId,
      exam_id: mock.exam_id,
      preparation_basis_id: prepBasisId,
      blueprint_id: mock.blueprint_id || 'bp_default',
      blueprint_version: mock.blueprint_version || 1,
      mock_number: mock.mock_number || 1,
      preparation_mode: mock.preparation_mode || 'PRE_NOTIFICATION_PREPARATION',
      test_mode: mock.test_mode || 'FULL_LENGTH',
      language: 'en',
      question_count: mock.total_questions,
      total_marks: mock.total_marks,
      negative_marking: mock.negative_marking_rate,
      duration_minutes: mock.duration_minutes,
      status: mock.status,
      generation_status: mock.generation_status || 'GENERATION_SUCCESS',
      quality_audit_status: auditStatus,
      preparation_as_of_date: mock.preparation_as_of_date || null,
      current_affairs_cutoff: mock.current_affairs_cutoff || null,
      finalized_at: mock.finalized_at || null,
      auditor_id: mock.quality_audit?.auditor_signoff?.auditor_name || (isFinal ? 'Lead Quality Auditor' : null),
      audit_signature: (mock.quality_audit?.auditor_signoff || isFinal) ? { notes: mock.audit_notes || 'Finalized and verified', signed_at: mock.finalized_at || new Date().toISOString() } : null
    });
    if (mockErr) throw new Error(`SUPABASE_MOCK_UPSERT_FAILED: ${mockErr.message}`);

    // 2. Upsert questions
    const allQuestions = mock.sections.flatMap(s => s.questions);
    if (allQuestions.length > 0) {
      const qRows = allQuestions.map(q => ({
        mock_question_id: q.question_id,
        mock_id: mock.mock_id,
        blueprint_id: mock.blueprint_id || null,
        slot_id: q.slot_id || null,
        question_number: q.question_number,
        question_en: q.question_text,
        option_a_en: q.options[0] || '',
        option_b_en: q.options[1] || '',
        option_c_en: q.options[2] || '',
        option_d_en: q.options[3] || '',
        correct_answer: ['A', 'B', 'C', 'D'][q.correct_option_index] || 'A',
        explanation_en: q.explanation,
        subject: q.section_name || 'General Studies',
        topic: q.topic,
        subtopic: q.subtopic || null,
        question_type: q.question_type || 'SINGLE_CHOICE',
        difficulty: q.difficulty,
        core_concept: q.core_concept || null,
        core_answerable_fact: q.core_answerable_fact || null,
        core_fact_representation: q.core_fact_representation || null,
        generation_provenance: q.generation_provenance || 'LIVE_GEMINI',
        generation_model_id: q.generation_model_id || null,
        candidate_status: q.candidate_status || 'ACCEPTED',
        repair_count: q.repair_attempts || 0,
        replacement_count: q.replacement_attempts || 0,
        option_quality_audit: q.option_quality_audit || null,
        question_quality_audit: { ...((q as any).question_quality_audit || q.audit_result || {}), source_reference: q.source_reference, source_lineage: q.source_lineage, current_affairs_evidence: q.current_affairs_evidence, cognitive_level: q.cognitive_level, visual_specification: q.visual_specification },
        updated_at: new Date().toISOString()
      }));

      const { error: qErr } = await supabase.from('mock_questions').upsert(qRows);
      if (qErr) throw new Error(`SUPABASE_MOCK_Q_UPSERT_FAILED: ${qErr.message}`);
    }
  }

  async finalizeMock(
    mockId: string,
    auditorId?: string,
    auditorNotes?: string
  ): Promise<FinalizeMockResult> {
    const supabase = getSupabaseClient();

    // Call atomic PostgreSQL finalize_mock RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc('finalize_mock', {
      p_mock_id: mockId,
      p_auditor_id: auditorId || 'Lead Quality Auditor',
      p_audit_notes: auditorNotes || 'Finalized via Supabase atomic transaction'
    });

    if (rpcError) {
      throw new Error(`ATOMIC_FINALIZATION_FAILED: ${rpcError.message}`);
    }

    const updatedMock = await this.getMockById(mockId);
    if (!updatedMock) {
      throw new Error(`MOCK_NOT_FOUND_AFTER_FINALIZATION: Mock ${mockId}`);
    }

    return {
      success: true,
      mock: updatedMock,
      addedToLedger: rpcResult?.questions_committed || 0
    };
  }
}

export class SupabaseQuestionAuditRepository implements QuestionAuditRepository {
  async getAuditsByQuestion(questionId: string): Promise<any[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('question_audits').select('*').eq('mock_question_id', questionId);
    if (error) throw new Error(`SUPABASE_AUDIT_QUERY_FAILED: ${error.message}`);
    return data || [];
  }

  async saveQuestionAudit(audit: any): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('question_audits').upsert({
      question_audit_id: audit.question_audit_id || `qa_${Date.now().toString(36)}`,
      mock_question_id: audit.mock_question_id,
      structure_status: audit.structure_status,
      blueprint_alignment: audit.blueprint_alignment,
      answer_status: audit.answer_status,
      fact_status: audit.fact_status,
      source_status: audit.source_status,
      option_symmetry_status: audit.option_symmetry_status,
      distractor_score: audit.distractor_score,
      overall_status: audit.overall_status,
      critical_blockers: audit.critical_blockers
    });
    if (error) throw new Error(`SUPABASE_AUDIT_UPSERT_FAILED: ${error.message}`);
  }
}

export class SupabaseLedgerRepository implements LedgerRepository {
  async getLedgerEntries(seriesId?: string, topic?: string): Promise<DuplicateLedgerEntry[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from('duplicate_ledger').select('*').limit(5000);
    if (seriesId) query = query.eq('series_id', seriesId);
    if (topic) query = query.eq('topic', topic);
    const { data, error } = await query;
    if (error) throw new Error(`SUPABASE_LEDGER_QUERY_FAILED: ${error.message}`);
    return (data || []).map((row: any) => ({
      ledger_id: row.ledger_entry_id,
      question_hash: row.canonical_hash,
      canonical_hash: row.canonical_hash,
      normalized_text: row.normalized_text,
      canonical_question_preview: row.normalized_text?.substring(0, 100) || '',
      canonical_full_text: row.normalized_text,
      topic: row.topic,
      subtopic: row.subtopic,
      mock_id: row.mock_id,
      mock_ids: [row.mock_id],
      series_id: row.series_id,
      exam_id: '',
      first_registered_at: row.committed_at,
      duplicate_attempts_blocked: 0,
      similarity_cluster_key: `${row.series_id}_${row.topic}`,
      core_concept: row.core_concept,
      core_fact: row.core_answerable_fact,
      core_fact_representation: row.core_fact_representation,
      structural_fingerprint: row.structural_fingerprint,
      semantic_representation: row.semantic_fingerprint
    }));
  }

  async findMatches(criteria: {
    canonical_hash?: string;
    series_id?: string;
    topic?: string;
  }): Promise<DuplicateLedgerEntry[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from('duplicate_ledger').select('*');
    if (criteria.series_id) query = query.eq('series_id', criteria.series_id);
    if (criteria.topic) query = query.eq('topic', criteria.topic);
    if (criteria.canonical_hash) query = query.eq('canonical_hash', criteria.canonical_hash);
    const { data, error } = await query;
    if (error) throw new Error(`SUPABASE_LEDGER_MATCH_FAILED: ${error.message}`);
    return (data || []).map((row: any) => ({
      ledger_id: row.ledger_entry_id,
      question_hash: row.canonical_hash,
      canonical_hash: row.canonical_hash,
      normalized_text: row.normalized_text,
      canonical_question_preview: row.normalized_text?.substring(0, 100) || '',
      canonical_full_text: row.normalized_text,
      topic: row.topic,
      subtopic: row.subtopic,
      mock_id: row.mock_id,
      mock_ids: [row.mock_id],
      series_id: row.series_id,
      exam_id: '',
      first_registered_at: row.committed_at,
      duplicate_attempts_blocked: 0,
      similarity_cluster_key: `${row.series_id}_${row.topic}`,
      core_concept: row.core_concept,
      core_fact: row.core_answerable_fact,
      core_fact_representation: row.core_fact_representation
    }));
  }

  async commitAcceptedQuestions(
    questions: MockQuestion[],
    examId: string,
    mockId: string,
    seriesId?: string
  ): Promise<{ added: number; duplicatesBlocked: number }> {
    const supabase = getSupabaseClient();
    let added = 0;
    let duplicatesBlocked = 0;

    for (const q of questions) {
      if (
        (q as any).is_synthetic_test_data ||
        q.data_provenance === 'SYNTHETIC_TEST_DATA' ||
        q.data_provenance === 'DEMO_DATA' ||
        q.generation_provenance === 'TEST_SYNTHESIS' ||
        q.generation_provenance === 'DEMO_SYNTHESIS'
      ) {
        continue;
      }

      const hash = q.canonical_hash || computeCanonicalQuestionHash(q.question_text) || 'hash_' + q.question_number;
      const { data: existing } = await supabase
        .from('duplicate_ledger')
        .select('*')
        .eq('canonical_hash', hash)
        .maybeSingle();

      if (existing) {
        duplicatesBlocked++;
      } else {
        const { error } = await supabase.from('duplicate_ledger').insert({
          ledger_entry_id: `ledg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
          series_id: seriesId || `series_${examId}`,
          mock_id: mockId,
          mock_question_id: q.question_id,
          canonical_hash: hash,
          normalized_text: q.question_text.toLowerCase().replace(/[^a-z0-9 ]/g, ''),
          subject: q.section_name || 'General Studies',
          topic: q.topic,
          subtopic: q.subtopic || null,
          core_concept: q.core_concept || null,
          core_answerable_fact: q.core_answerable_fact || null,
          core_fact_representation: q.core_fact_representation || null
        });
        if (!error) added++;
      }
    }

    return { added, duplicatesBlocked };
  }
}

export class SupabaseAuditRepository implements AuditRepository {
  async getAuditLogs(entityType?: string, entityId?: string): Promise<GenerationAuditLog[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from('audit_logs').select('*');
    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);
    const { data, error } = await query;
    if (error) throw new Error(`SUPABASE_AUDIT_QUERY_FAILED: ${error.message}`);
    return (data || []).map((row: any) => ({
      log_id: row.audit_id,
      audit_type: row.audit_type,
      exam_id: row.entity_id,
      reason: row.reason,
      created_at: row.created_at
    }));
  }

  async appendAuditLog(log: GenerationAuditLog): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('audit_logs').insert({
      audit_id: log.log_id || `audit_${Date.now().toString(36)}`,
      audit_type: log.audit_type,
      entity_type: log.mock_id ? 'MOCK' : 'EXAM',
      entity_id: log.mock_id || log.exam_id,
      reason: log.reason || 'Audit event recorded',
      metadata: { action: log.action, status: log.status }
    });
    if (error) throw new Error(`SUPABASE_AUDIT_INSERT_FAILED: ${error.message}`);
  }
}

export class SupabaseAIUsageRepository implements AIUsageRepository {
  async recordUsage(record: AIUsageRecord): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('ai_usage').insert({
      usage_id: record.usage_id || `use_${Date.now().toString(36)}`,
      research_run_id: record.research_run_id,
      generation_run_id: record.generation_run_id,
      mock_id: record.mock_id,
      model_id: record.model_id,
      model_tier: record.model_tier,
      input_tokens: record.input_tokens,
      output_tokens: record.output_tokens,
      thinking_tokens: record.thinking_tokens || 0,
      search_queries: record.search_queries || 0,
      api_requests: record.api_requests || 1,
      actual_billed_cost: record.actual_billed_cost,
      paid_tier_equivalent_cost: record.paid_tier_equivalent_cost,
      pricing_version: record.pricing_version
    });
    if (error) throw new Error(`SUPABASE_USAGE_INSERT_FAILED: ${error.message}`);
  }

  async getUsage(mockId?: string, researchRunId?: string): Promise<AIUsageRecord[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from('ai_usage').select('*');
    if (mockId) query = query.eq('mock_id', mockId);
    if (researchRunId) query = query.eq('research_run_id', researchRunId);
    const { data, error } = await query;
    if (error) throw new Error(`SUPABASE_USAGE_QUERY_FAILED: ${error.message}`);
    return data || [];
  }
}

export function createSupabaseRegistry(): RepositoryRegistry {
  return {
    exams: new SupabaseExamRepository(),
    sources: new SupabaseSourceRepository(),
    documents: new SupabaseDocumentRepository(),
    pyqs: new SupabasePYQRepository(),
    intelligence: new SupabaseIntelligenceRepository(),
    bases: new SupabasePreparationBasisRepository(),
    blueprints: new SupabaseBlueprintRepository(),
    mocks: new SupabaseMockRepository(),
    questionAudits: new SupabaseQuestionAuditRepository(),
    ledger: new SupabaseLedgerRepository(),
    auditLogs: new SupabaseAuditRepository(),
    aiUsage: new SupabaseAIUsageRepository()
  };
}

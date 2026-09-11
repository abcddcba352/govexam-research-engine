import type { ExamRecord, ExamPatternVersion, ExamFactVerification } from '../../src/types.ts';
import { calculateExamProfileStatus, createDefaultFactVerifications } from '../verificationService.ts';
import { findOfficialScheme } from '../examStructureService.ts';

export function mapPattern(row: any): ExamPatternVersion {
  return {
    version_id: row.exam_pattern_version_id, exam_id: row.exam_id,
    recruitment_cycle: row.recruitment_cycle, notification_number: row.notification_number || '',
    effective_date: row.effective_date, is_active: false,
    pattern: {
      total_questions: Number(row.question_count) || 0, total_marks: Number(row.marks) || 0,
      marks_per_question: row.question_count > 0 ? Number(row.marks) / Number(row.question_count) : 0,
      duration_minutes: Number(row.duration_minutes) || 0, negative_marking_rate: Number(row.negative_marking) || 0,
      sections: row.section_structure?.sections || [], mediums: row.language_rules?.languages || [],
    },
    syllabus_topics: row.section_structure?.syllabus_topics || [],
    study_materials: row.section_structure?.study_materials || [],
  };
}

export function mapExam(row: any, versions: any[], facts: any[], sources: any[] = []): ExamRecord {
  const rows = versions.filter(v => v.exam_id === row.exam_id);
  // Multiple cycles without an explicit active pointer must not choose a random cycle.
  const active = rows.find(v => v.exam_pattern_version_id === row.active_exam_version_id) ||
    (!row.active_exam_version_id && rows.length === 1 ? rows[0] : undefined);
  const mapped = active ? mapPattern(active) : undefined;
  const cycle = mapped?.recruitment_cycle || 'Unknown cycle';
  const scheme = row.structure_scheme || findOfficialScheme(row.title);
  const topics = (mapped?.syllabus_topics && mapped.syllabus_topics.length > 0)
    ? mapped.syllabus_topics
    : (row.syllabus_topics && row.syllabus_topics.length > 0)
      ? row.syllabus_topics
      : (scheme?.stages?.[0]?.papers?.[0]?.sections || []);
  const materials = active?.section_structure?.study_materials ||
    row.study_materials ||
    (rows.find(r => r.section_structure?.study_materials?.length > 0)?.section_structure?.study_materials) || [];

  const record: ExamRecord = {
    exam_id: row.exam_id, intake_id: `intake_${row.exam_id}`, title: row.title,
    commission: row.authority || '', state_or_central: row.state || '', post: row.exam_level || '',
    stage: row.stage_tier || '', paper: row.paper || '', recruitment_cycle: cycle, active_cycle: cycle,
    pattern: mapped?.pattern || { total_questions: 0, total_marks: 0, duration_minutes: 0,
      marks_per_question: 0, negative_marking_rate: 0, sections: [], mediums: [] },
    syllabus_topics: topics,
    stages: row.stages || scheme?.stages,
    structure_scheme: scheme || undefined,
    study_materials: materials,
    preparation_mode: active?.section_structure?.preparation_mode || 'PRE_NOTIFICATION_PREPARATION',
    status: 'INTAKE_SUBMITTED', exam_profile_status: 'RESEARCH_REQUIRED', pattern_status: 'UNVERIFIED',
    source_confidence_score: 0, created_at: row.created_at, updated_at: row.updated_at,
  };
  const defaults = createDefaultFactVerifications(record, cycle, false);
  for (const fact of facts.filter(f => f.exam_id === row.exam_id && f.applicable_cycle === cycle)) {
    if (!(fact.fact_name in defaults)) continue;
    // These tags were assigned by seed/entity templates, not a retrieval or human review.
    if (['OFFICIAL_COMMISSION_GAZETTE', 'RESEARCH_ENGINE_ENTITY_RESOLVER'].includes(fact.verified_by)) continue;
    const source = sources.find(s => s.source_id === fact.source_id) ||
      sources.find(s => s.exam_id === row.exam_id && ['LEVEL_5_OFFICIAL', 'LEVEL_4_GOVERNMENT'].includes(s.source_level) && /^https:\/\//i.test(s.source_url || ''));
    const hasPrimaryLineage = Boolean(
      source && /^https:\/\//i.test(source.source_url || '') &&
      ['LEVEL_5_OFFICIAL', 'LEVEL_4_GOVERNMENT'].includes(source.source_level)
    );
    const mappedFact: ExamFactVerification = {
      fact_id: fact.verification_id, exam_id: row.exam_id, fact_name: fact.fact_name,
      fact_label: defaults[fact.fact_name].fact_label, fact_value: fact.fact_value,
      source_id: source?.source_id || fact.source_id, source_url: source?.source_url, source_title: source?.title,
      document_id: fact.document_id, evidence_text: fact.evidence_text || '',
      page_or_section: fact.evidence_locator,
      // A status alone cannot establish a fact. The source row must resolve to
      // a direct primary URL before a record can reach any readiness screen.
      verification_status: hasPrimaryLineage ? fact.verification_status : 'UNVERIFIED',
      confidence: hasPrimaryLineage ? Number(fact.confidence) || 0 : 0, applicable_cycle: cycle,
      verified_at: fact.verified_at, verified_by: fact.verified_by,
    };
    defaults[fact.fact_name] = mappedFact;
  }
  record.fact_verifications = defaults;
  record.pattern_versions = rows.map(v => ({ ...mapPattern(v),
    is_active: v.exam_pattern_version_id === mapped?.version_id,
    ...(v.exam_pattern_version_id === mapped?.version_id ? { fact_verifications: defaults } : {}),
  }));
  const status = calculateExamProfileStatus(record);
  record.exam_profile_status = status.status;
  record.pattern_status = status.pattern_status;
  return record;
}

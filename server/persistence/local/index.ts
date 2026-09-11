import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ExamRecord,
  ExamPatternVersion,
  ExamFactVerification,
  SourceRecord,
  PreviousPaperRecord,
  PYQQuestionRecord,
  PreparationBasis,
  MockBlueprintRecord,
  MockTestRecord,
  MockQuestion,
  DuplicateLedgerEntry,
  GenerationAuditLog,
  ModelCostTelemetry
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

const DATA_DIR = path.join(process.cwd(), 'server', 'data');

function readJsonFile<T>(filename: string, defaultValue: T): T {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return defaultValue;
  }
}

function writeJsonFile<T>(filename: string, data: T): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export class LocalExamRepository implements ExamRepository {
  async getExams(): Promise<ExamRecord[]> {
    return readJsonFile<ExamRecord[]>('exams.json', []);
  }

  async getExamById(examId: string): Promise<ExamRecord | null> {
    const exams = await this.getExams();
    return exams.find(e => e.exam_id === examId) || null;
  }

  async saveExam(exam: ExamRecord): Promise<void> {
    const exams = await this.getExams();
    const idx = exams.findIndex(e => e.exam_id === exam.exam_id);
    if (idx >= 0) exams[idx] = exam;
    else exams.push(exam);
    writeJsonFile('exams.json', exams);
  }

  async deleteExam(examId: string): Promise<void> {
    const exams = await this.getExams();
    const filtered = exams.filter(e => e.exam_id !== examId);
    writeJsonFile('exams.json', filtered);
  }

  async updateExamStatus(examId: string, status: string): Promise<void> {
    const exam = await this.getExamById(examId);
    if (exam) {
      exam.status = status as any;
      await this.saveExam(exam);
    }
  }

  async getPatternVersions(examId: string): Promise<ExamPatternVersion[]> {
    const exam = await this.getExamById(examId);
    return exam?.pattern_versions || [];
  }

  async savePatternVersion(version: ExamPatternVersion): Promise<void> {
    const exam = await this.getExamById(version.exam_id);
    if (exam) {
      if (!exam.pattern_versions) exam.pattern_versions = [];
      const idx = exam.pattern_versions.findIndex(v => v.version_id === version.version_id);
      if (idx >= 0) exam.pattern_versions[idx] = version;
      else exam.pattern_versions.push(version);
      await this.saveExam(exam);
    }
  }

  async getFactVerifications(examId: string): Promise<Record<string, ExamFactVerification>> {
    const exam = await this.getExamById(examId);
    return exam?.fact_verifications || ({} as any);
  }

  async saveFactVerification(verification: ExamFactVerification): Promise<void> {
    const exam = await this.getExamById(verification.exam_id);
    if (exam) {
      if (!exam.fact_verifications) exam.fact_verifications = {} as any;
      exam.fact_verifications[verification.fact_name] = verification;
      await this.saveExam(exam);
    }
  }
}

export class LocalSourceRepository implements SourceRepository {
  async getSources(examId?: string): Promise<SourceRecord[]> {
    const sources = readJsonFile<SourceRecord[]>('sources.json', []);
    if (examId) return sources.filter(s => s.exam_id === examId);
    return sources;
  }

  async getSourceById(sourceId: string): Promise<SourceRecord | null> {
    const sources = await this.getSources();
    return sources.find(s => s.source_id === sourceId) || null;
  }

  async saveSource(source: SourceRecord): Promise<void> {
    const sources = await this.getSources();
    const idx = sources.findIndex(s => s.source_id === source.source_id);
    if (idx >= 0) sources[idx] = source;
    else sources.push(source);
    writeJsonFile('sources.json', sources);
  }

  async findSourceByContentHash(contentHash: string): Promise<SourceRecord | null> {
    const sources = await this.getSources();
    return sources.find(s => s.content_hash === contentHash) || null;
  }
}

export class LocalDocumentRepository implements DocumentRepository {
  async getDocuments(examId?: string): Promise<DocumentRecord[]> {
    const docs = readJsonFile<DocumentRecord[]>('source_documents.json', []);
    if (examId) return docs.filter(d => d.exam_id === examId);
    return docs;
  }

  async getDocumentById(documentId: string): Promise<DocumentRecord | null> {
    const docs = await this.getDocuments();
    return docs.find(d => d.document_id === documentId) || null;
  }

  async saveDocument(doc: DocumentRecord): Promise<void> {
    const docs = await this.getDocuments();
    const idx = docs.findIndex(d => d.document_id === doc.document_id);
    if (idx >= 0) docs[idx] = doc;
    else docs.push(doc);
    writeJsonFile('source_documents.json', docs);
  }

  async findDocumentByContentHash(contentHash: string): Promise<DocumentRecord | null> {
    const docs = await this.getDocuments();
    return docs.find(d => d.content_hash === contentHash) || null;
  }
}

export class LocalPYQRepository implements PYQRepository {
  async getPreviousPapers(examId?: string): Promise<PreviousPaperRecord[]> {
    const papers = readJsonFile<PreviousPaperRecord[]>('previous_papers.json', []);
    if (examId) return papers.filter(p => p.exam_id === examId);
    return papers;
  }

  async getPaperById(paperId: string): Promise<PreviousPaperRecord | null> {
    const papers = await this.getPreviousPapers();
    return papers.find(p => p.paper_id === paperId) || null;
  }

  async savePreviousPaper(paper: PreviousPaperRecord): Promise<void> {
    const papers = await this.getPreviousPapers();
    const idx = papers.findIndex(p => p.paper_id === paper.paper_id);
    if (idx >= 0) papers[idx] = paper;
    else papers.push(paper);
    writeJsonFile('previous_papers.json', papers);
  }

  async getPYQQuestions(paperId?: string, examId?: string): Promise<PYQQuestionRecord[]> {
    let questions = readJsonFile<PYQQuestionRecord[]>('pyq_questions.json', []);
    if (paperId) questions = questions.filter(q => q.paper_id === paperId);
    if (examId) questions = questions.filter(q => q.exam_id === examId);
    return questions;
  }

  async getPYQQuestionById(questionId: string): Promise<PYQQuestionRecord | null> {
    const questions = await this.getPYQQuestions();
    return questions.find(q => q.pyq_question_id === questionId) || null;
  }

  async savePYQQuestion(question: PYQQuestionRecord): Promise<void> {
    const questions = await this.getPYQQuestions();
    const idx = questions.findIndex(q => q.pyq_question_id === question.pyq_question_id);
    if (idx >= 0) questions[idx] = question;
    else questions.push(question);
    writeJsonFile('pyq_questions.json', questions);
  }

  async saveAnalysisRun(run: any): Promise<void> {
    const runs = readJsonFile<any[]>('pyq_analysis_runs.json', []);
    runs.push(run);
    writeJsonFile('pyq_analysis_runs.json', runs);
  }
}

export class LocalIntelligenceRepository implements IntelligenceRepository {
  async getIntelligenceProfile(examId: string, profileVersion?: number): Promise<any | null> {
    const profiles = readJsonFile<any[]>('exam_intelligence_profiles.json', []);
    const matching = profiles.filter(p => p.exam_id === examId);
    if (matching.length === 0) return null;
    if (profileVersion) return matching.find(p => p.profile_version === profileVersion) || null;
    return matching[matching.length - 1];
  }

  async saveIntelligenceProfile(profile: any): Promise<void> {
    const profiles = readJsonFile<any[]>('exam_intelligence_profiles.json', []);
    const idx = profiles.findIndex(p => p.intelligence_profile_id === profile.intelligence_profile_id);
    if (idx >= 0) profiles[idx] = profile;
    else profiles.push(profile);
    writeJsonFile('exam_intelligence_profiles.json', profiles);
  }
}

export class LocalPreparationBasisRepository implements PreparationBasisRepository {
  async getPreparationBases(examId?: string): Promise<PreparationBasis[]> {
    const bases = readJsonFile<PreparationBasis[]>('preparation_bases.json', []);
    if (examId) return bases.filter(b => b.exam_id === examId);
    return bases;
  }

  async getPreparationBasisById(basisId: string): Promise<PreparationBasis | null> {
    const bases = await this.getPreparationBases();
    return bases.find(b => b.preparation_basis_id === basisId) || null;
  }

  async getPreparationBasisByMode(examId: string, mode: string): Promise<PreparationBasis | null> {
    const bases = await this.getPreparationBases(examId);
    return bases.find(b => b.preparation_mode === mode && b.is_active !== false) || null;
  }

  async savePreparationBasis(basis: PreparationBasis): Promise<void> {
    const bases = await this.getPreparationBases();
    const idx = bases.findIndex(b => b.preparation_basis_id === basis.preparation_basis_id);
    if (idx >= 0) bases[idx] = basis;
    else bases.push(basis);
    writeJsonFile('preparation_bases.json', bases);
  }
}

export class LocalBlueprintRepository implements BlueprintRepository {
  async getBlueprints(examId?: string): Promise<MockBlueprintRecord[]> {
    const bps = readJsonFile<MockBlueprintRecord[]>('blueprints.json', []);
    if (examId) return bps.filter(b => b.exam_id === examId);
    return bps;
  }

  async getBlueprintById(blueprintId: string): Promise<MockBlueprintRecord | null> {
    const bps = await this.getBlueprints();
    return bps.find(b => b.blueprint_id === blueprintId) || null;
  }

  async saveBlueprint(blueprint: MockBlueprintRecord): Promise<void> {
    const bps = await this.getBlueprints();
    const idx = bps.findIndex(b => b.blueprint_id === blueprint.blueprint_id);
    if (idx >= 0) bps[idx] = blueprint;
    else bps.push(blueprint);
    writeJsonFile('blueprints.json', bps);
  }

  async lockBlueprint(blueprintId: string, lockedBy?: string): Promise<void> {
    const bp = await this.getBlueprintById(blueprintId);
    if (bp) {
      bp.status = 'BLUEPRINT_LOCKED';
      bp.locked_at = new Date().toISOString();
      if (lockedBy) bp.locked_by = lockedBy;
      await this.saveBlueprint(bp);
    }
  }

  async getNextMockNumber(seriesId: string): Promise<number> {
    const mocks = readJsonFile<MockTestRecord[]>('mocks.json', []);
    const seriesMocks = mocks.filter(m => m.series_id === seriesId);
    return seriesMocks.length + 1;
  }
}

export class LocalMockRepository implements MockRepository {
  async getMocks(examId?: string): Promise<MockTestRecord[]> {
    const mocks = readJsonFile<MockTestRecord[]>('mocks.json', []);
    if (examId) return mocks.filter(m => m.exam_id === examId);
    return mocks;
  }

  async getMockById(mockId: string): Promise<MockTestRecord | null> {
    const mocks = await this.getMocks();
    return mocks.find(m => m.mock_id === mockId) || null;
  }

  async saveMock(mock: MockTestRecord): Promise<void> {
    const mocks = await this.getMocks();
    const idx = mocks.findIndex(m => m.mock_id === mock.mock_id);
    if (idx >= 0) mocks[idx] = mock;
    else mocks.push(mock);
    writeJsonFile('mocks.json', mocks);
  }

  async finalizeMock(
    mockId: string,
    auditorId?: string,
    auditorNotes?: string
  ): Promise<FinalizeMockResult> {
    const mock = await this.getMockById(mockId);
    if (!mock) {
      throw new Error(`MOCK_NOT_FOUND: Mock ${mockId} does not exist`);
    }

    if (mock.status === 'FINAL') {
      throw new Error(`MOCK_ALREADY_FINAL: Mock ${mockId} is already in FINAL state`);
    }

    const allQuestions = mock.sections.flatMap(s => s.questions);
    const unaccepted = allQuestions.filter(q => q.candidate_status && q.candidate_status !== 'ACCEPTED');
    if (unaccepted.length > 0) {
      throw new Error(`MOCK_HAS_UNACCEPTED_QUESTIONS: Mock contains ${unaccepted.length} questions not marked ACCEPTED`);
    }

    mock.status = 'FINAL';
    mock.finalized_at = new Date().toISOString();
    mock.audit_notes = auditorNotes;

    await this.saveMock(mock);

    // Commit accepted questions to duplicate ledger
    const ledgerRepo = new LocalLedgerRepository();
    const { added, duplicatesBlocked } = await ledgerRepo.commitAcceptedQuestions(
      allQuestions,
      mock.exam_id,
      mock.mock_id,
      mock.series_id
    );

    // Append audit log
    const auditRepo = new LocalAuditRepository();
    await auditRepo.appendAuditLog({
      log_id: `log_fin_${Date.now().toString(36)}`,
      audit_type: 'MOCK_FINALIZATION_AUDIT',
      exam_id: mock.exam_id,
      mock_id: mock.mock_id,
      reason: auditorNotes || 'Mock test finalized and questions committed to ledger',
      status: 'SUCCESS',
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      mock,
      addedToLedger: added,
      duplicatesBlocked
    };
  }
}

export class LocalQuestionAuditRepository implements QuestionAuditRepository {
  async getAuditsByQuestion(questionId: string): Promise<any[]> {
    const audits = readJsonFile<any[]>('question_audits.json', []);
    return audits.filter(a => a.mock_question_id === questionId);
  }

  async saveQuestionAudit(audit: any): Promise<void> {
    const audits = readJsonFile<any[]>('question_audits.json', []);
    audits.push(audit);
    writeJsonFile('question_audits.json', audits);
  }
}

export class LocalLedgerRepository implements LedgerRepository {
  async getLedgerEntries(seriesId?: string, topic?: string): Promise<DuplicateLedgerEntry[]> {
    let ledger = readJsonFile<DuplicateLedgerEntry[]>('duplicate_ledger.json', []);
    if (seriesId) ledger = ledger.filter(e => e.series_id === seriesId || e.mock_ids?.includes(seriesId));
    if (topic) ledger = ledger.filter(e => e.topic === topic);
    return ledger;
  }

  async findMatches(criteria: {
    canonical_hash?: string;
    series_id?: string;
    topic?: string;
  }): Promise<DuplicateLedgerEntry[]> {
    let ledger = await this.getLedgerEntries(criteria.series_id, criteria.topic);
    if (criteria.canonical_hash) {
      ledger = ledger.filter(e => e.canonical_hash === criteria.canonical_hash || e.question_hash === criteria.canonical_hash);
    }
    return ledger;
  }

  async commitAcceptedQuestions(
    questions: MockQuestion[],
    examId: string,
    mockId: string,
    seriesId?: string
  ): Promise<{ added: number; duplicatesBlocked: number }> {
    const ledger = await this.getLedgerEntries();
    let added = 0;
    let duplicatesBlocked = 0;

    for (const q of questions) {
      // Exclude synthetic and demo questions
      if (
        (q as any).is_synthetic_test_data ||
        q.data_provenance === 'SYNTHETIC_TEST_DATA' ||
        q.data_provenance === 'DEMO_DATA' ||
        q.generation_provenance === 'TEST_SYNTHESIS' ||
        q.generation_provenance === 'DEMO_SYNTHESIS'
      ) {
        continue;
      }

      const hash = q.canonical_hash || crypto.createHash('sha256').update(q.question_text).digest('hex').substring(0, 16);
      const existing = ledger.find(item => item.canonical_hash === hash || item.question_hash === hash);

      if (existing) {
        existing.duplicate_attempts_blocked = (existing.duplicate_attempts_blocked || 0) + 1;
        if (!existing.mock_ids.includes(mockId)) existing.mock_ids.push(mockId);
        duplicatesBlocked++;
      } else {
        ledger.push({
          ledger_id: `ledg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
          question_hash: hash,
          canonical_hash: hash,
          canonical_question_preview: q.question_text.substring(0, 100),
          canonical_full_text: q.question_text,
          topic: q.topic,
          subtopic: q.subtopic,
          mock_id: mockId,
          mock_ids: [mockId],
          series_id: seriesId,
          exam_id: examId,
          first_registered_at: new Date().toISOString(),
          duplicate_attempts_blocked: 0,
          similarity_cluster_key: `${examId}_${q.topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          core_concept: q.core_concept,
          core_fact: q.core_answerable_fact,
          core_fact_representation: q.core_fact_representation,
          structural_fingerprint: q.structural_fingerprint,
          semantic_representation: q.semantic_representation
        });
        added++;
      }
    }

    writeJsonFile('duplicate_ledger.json', ledger);
    return { added, duplicatesBlocked };
  }
}

export class LocalAuditRepository implements AuditRepository {
  async getAuditLogs(entityType?: string, entityId?: string): Promise<GenerationAuditLog[]> {
    let logs = readJsonFile<GenerationAuditLog[]>('generation_audit_logs.json', []);
    if (entityId) logs = logs.filter(l => l.exam_id === entityId || l.mock_id === entityId);
    return logs;
  }

  async appendAuditLog(log: GenerationAuditLog): Promise<void> {
    const logs = await this.getAuditLogs();
    logs.push(log);
    writeJsonFile('generation_audit_logs.json', logs);
  }
}

export class LocalAIUsageRepository implements AIUsageRepository {
  async recordUsage(record: AIUsageRecord): Promise<void> {
    const logs = readJsonFile<AIUsageRecord[]>('ai_usage_logs.json', []);
    logs.push(record);
    writeJsonFile('ai_usage_logs.json', logs);
  }

  async getUsage(mockId?: string, researchRunId?: string): Promise<AIUsageRecord[]> {
    let logs = readJsonFile<AIUsageRecord[]>('ai_usage_logs.json', []);
    if (mockId) logs = logs.filter(l => l.mock_id === mockId);
    if (researchRunId) logs = logs.filter(l => l.research_run_id === researchRunId);
    return logs;
  }
}

export function createLocalRegistry(): RepositoryRegistry {
  return {
    exams: new LocalExamRepository(),
    sources: new LocalSourceRepository(),
    documents: new LocalDocumentRepository(),
    pyqs: new LocalPYQRepository(),
    intelligence: new LocalIntelligenceRepository(),
    bases: new LocalPreparationBasisRepository(),
    blueprints: new LocalBlueprintRepository(),
    mocks: new LocalMockRepository(),
    questionAudits: new LocalQuestionAuditRepository(),
    ledger: new LocalLedgerRepository(),
    auditLogs: new LocalAuditRepository(),
    aiUsage: new LocalAIUsageRepository()
  };
}

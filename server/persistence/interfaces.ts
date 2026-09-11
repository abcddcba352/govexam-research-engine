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
} from '../../src/types.ts';

export interface ExamRepository {
  getExams(): Promise<ExamRecord[]>;
  getExamById(examId: string): Promise<ExamRecord | null>;
  saveExam(exam: ExamRecord): Promise<void>;
  deleteExam(examId: string): Promise<void>;
  updateExamStatus(examId: string, status: string): Promise<void>;
  getPatternVersions(examId: string): Promise<ExamPatternVersion[]>;
  savePatternVersion(version: ExamPatternVersion): Promise<void>;
  getFactVerifications(examId: string): Promise<Record<string, ExamFactVerification>>;
  saveFactVerification(verification: ExamFactVerification): Promise<void>;
}

export interface SourceRepository {
  getSources(examId?: string): Promise<SourceRecord[]>;
  getResearchSources?(examId:string,limit?:number):Promise<SourceRecord[]>;
  getSourceById(sourceId: string): Promise<SourceRecord | null>;
  saveSource(source: SourceRecord): Promise<void>;
  findSourceByContentHash(contentHash: string): Promise<SourceRecord | null>;
}

export interface DocumentRecord {
  document_id: string;
  source_id?: string;
  exam_id?: string;
  document_type: string;
  title: string;
  storage_bucket: string;
  storage_path: string;
  original_url?: string;
  mime_type?: string;
  file_size?: number;
  page_count?: number;
  content_hash: string;
  language?: string;
  publication_date?: string;
  retrieved_at: string;
  extraction_status?: string;
  verification_status?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface DocumentRepository {
  getDocuments(examId?: string): Promise<DocumentRecord[]>;
  getDocumentById(documentId: string): Promise<DocumentRecord | null>;
  saveDocument(doc: DocumentRecord): Promise<void>;
  findDocumentByContentHash(contentHash: string): Promise<DocumentRecord | null>;
}

export interface PYQRepository {
  getPreviousPapers(examId?: string): Promise<PreviousPaperRecord[]>;
  getPaperById(paperId: string): Promise<PreviousPaperRecord | null>;
  savePreviousPaper(paper: PreviousPaperRecord): Promise<void>;
  getPYQQuestions(paperId?: string, examId?: string): Promise<PYQQuestionRecord[]>;
  getPYQQuestionById(questionId: string): Promise<PYQQuestionRecord | null>;
  savePYQQuestion(question: PYQQuestionRecord): Promise<void>;
  saveAnalysisRun(run: any): Promise<void>;
}

export interface IntelligenceRepository {
  getIntelligenceProfile(examId: string, profileVersion?: number): Promise<any | null>;
  saveIntelligenceProfile(profile: any): Promise<void>;
}

export interface PreparationBasisRepository {
  getPreparationBases(examId?: string): Promise<PreparationBasis[]>;
  getPreparationBasisById(basisId: string): Promise<PreparationBasis | null>;
  getPreparationBasisByMode(examId: string, mode: string): Promise<PreparationBasis | null>;
  savePreparationBasis(basis: PreparationBasis): Promise<void>;
}

export interface BlueprintRepository {
  getBlueprints(examId?: string): Promise<MockBlueprintRecord[]>;
  getBlueprintById(blueprintId: string): Promise<MockBlueprintRecord | null>;
  saveBlueprint(blueprint: MockBlueprintRecord): Promise<void>;
  lockBlueprint(blueprintId: string, lockedBy?: string): Promise<void>;
  getNextMockNumber(seriesId: string): Promise<number>;
}

export interface FinalizeMockResult {
  success: boolean;
  mock: MockTestRecord;
  addedToLedger: number;
  duplicatesBlocked?: number;
}

export interface MockRepository {
  getMocks(examId?: string): Promise<MockTestRecord[]>;
  getMockById(mockId: string): Promise<MockTestRecord | null>;
  saveMock(mock: MockTestRecord): Promise<void>;
  finalizeMock(
    mockId: string,
    auditorId?: string,
    auditorNotes?: string
  ): Promise<FinalizeMockResult>;
}

export interface QuestionAuditRepository {
  getAuditsByQuestion(questionId: string): Promise<any[]>;
  saveQuestionAudit(audit: any): Promise<void>;
}

export interface LedgerRepository {
  getLedgerEntries(seriesId?: string, topic?: string): Promise<DuplicateLedgerEntry[]>;
  findMatches(criteria: {
    canonical_hash?: string;
    series_id?: string;
    topic?: string;
  }): Promise<DuplicateLedgerEntry[]>;
  commitAcceptedQuestions(
    questions: MockQuestion[],
    examId: string,
    mockId: string,
    seriesId?: string
  ): Promise<{ added: number; duplicatesBlocked: number }>;
}

export interface AuditRepository {
  getAuditLogs(entityType?: string, entityId?: string): Promise<GenerationAuditLog[]>;
  appendAuditLog(log: GenerationAuditLog): Promise<void>;
}

export interface AIUsageRecord {
  usage_id: string;
  research_run_id?: string;
  generation_run_id?: string;
  mock_id?: string;
  model_id: string;
  model_tier: string;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens?: number;
  search_queries?: number;
  api_requests?: number;
  actual_billed_cost: number;
  paid_tier_equivalent_cost: number;
  pricing_version: string;
  created_at?: string;
}

export interface AIUsageRepository {
  recordUsage(record: AIUsageRecord): Promise<void>;
  getUsage(mockId?: string, researchRunId?: string): Promise<AIUsageRecord[]>;
}

export interface RepositoryRegistry {
  exams: ExamRepository;
  sources: SourceRepository;
  documents: DocumentRepository;
  pyqs: PYQRepository;
  intelligence: IntelligenceRepository;
  bases: PreparationBasisRepository;
  blueprints: BlueprintRepository;
  mocks: MockRepository;
  questionAudits: QuestionAuditRepository;
  ledger: LedgerRepository;
  auditLogs: AuditRepository;
  aiUsage: AIUsageRepository;
}

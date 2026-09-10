import type { CollectedArticle, CurrentAffairsEvidence } from './currentAffairs.ts';
export type ResearchMode = 'HYBRID' | 'GOOGLE_API' | 'DIRECT_WEB';

export interface ExamIdentification {
  commission: string;
  state_or_central: string;
  exam: string;
  post: string;
  stage: string;
  paper: string;
  recruitment_cycle: string;
}

export type AuthorityType = 
  | 'State PSC'
  | 'Central Commission'
  | 'Railway Recruitment Board'
  | 'Police Recruitment Board'
  | 'Teacher Recruitment Board';

export type AuthorityStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'DEPRECATED';

export interface OfficialSourceRegistryRecord {
  authority_id: string;
  authority_name: string;
  authority_type: AuthorityType | string;
  state: string;
  official_domain: string;
  notification_path: string;
  syllabus_path: string;
  question_paper_path: string;
  answer_key_path: string;
  results_path: string;
  gazette_domain: string;
  other_official_domains: string[];
  verified_at: string;
  status: AuthorityStatus;
}

export type SourceTrustLevel = 
  | 'LEVEL_5_OFFICIAL'
  | 'LEVEL_4_GOVERNMENT'
  | 'LEVEL_3_ACADEMIC'
  | 'LEVEL_2_SECONDARY'
  | 'LEVEL_1_DISCOVERY';

export type VerificationStatus =
  | 'VERIFIED_OFFICIAL'
  | 'VERIFIED_GOVERNMENT'
  | 'VERIFIED_MULTIPLE_SOURCES'
  | 'PARTIALLY_VERIFIED'
  | 'SECONDARY_ONLY'
  | 'CONFLICT'
  | 'UNVERIFIED';

export type DataProvenance =
  | 'RETRIEVED_OFFICIAL'
  | 'USER_UPLOADED_OFFICIAL_VERIFIED'
  | 'SECONDARY_ARCHIVE'
  | 'USER_UPLOAD_UNVERIFIED'
  | 'SYNTHETIC_TEST_DATA'
  | 'DEMO_DATA';

export type ResearchProvenance =
  | 'LIVE_DIRECT_WEB'
  | 'LIVE_GOOGLE_GROUNDING'
  | 'VERIFIED_DATABASE_REUSE'
  | 'USER_PROVIDED_SOURCE'
  | 'TEST_RESEARCH_FIXTURE'
  | 'DEMO_RESEARCH_FIXTURE';

export type GenerationProvenance =
  | 'LIVE_GEMINI'
  | 'VERIFIED_DATABASE_TRANSFORMATION'
  | 'TEST_SYNTHESIS'
  | 'DEMO_SYNTHESIS';

export type ExecutionEnvironment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT' | 'TEST';

export type PersistenceBackend = 'JSON_FIXTURE' | 'LOCAL_FILE' | 'DATABASE';

export interface ResearchFact {
  fact_id?: string;
  critical_field?: CriticalFactName;
  evidence_validated?: boolean;
  fact: string;
  value: string;
  source_url: string;
  source_title: string;
  source_domain: string;
  source_level: SourceTrustLevel;
  publication_date: string;
  retrieved_at: string;
  is_current: boolean;
  confidence: number; // 0 - 100
  research_mode: ResearchMode;
  verification_status: VerificationStatus;
  data_provenance?: DataProvenance;
  evidence_text?: string;
  evidence_snippet?: string;
  conflict_details?: string;
  verified_by?: string;
}

export interface ResearchRunLog {
  collection_diagnostics?: Array<{stage:string;target:string;status:string;detail:string}>;
  collected_sources?: Array<{url:string;title:string;kind:string;characters:number}>;
  run_id: string;
  exam_id: string;
  query_input: string;
  research_mode: ResearchMode;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  queries_attempted: number;
  pages_visited: number;
  documents_found: number;
  documents_parsed: number;
  official_sources_found: number;
  secondary_sources_found: number;
  youtube_sources_found: number;
  failures: number;
  Gemini_tokens: number;
  Google_search_queries: number;
  estimated_cost: number;
  identification: ExamIdentification;
  facts: ResearchFact[];
  summary_notes?: string;
  research_status?: 'RESEARCH_SUCCESS' | 'RESEARCH_PARTIAL' | 'RESEARCH_PARTIAL_QUOTA_EXHAUSTED' | 'RESEARCH_FAILED';
  unresolved_facts?: string[];
  fallback_applied?: boolean;
  attempted_models?: string[];
  ui_message?: string;
}

export interface ResearchRequestPayload {
  exam_id?: string;
  exam_query: string;
  research_mode: ResearchMode;
  user_provided_urls?: string[];
  uploaded_document_text?: string;
  uploaded_document_name?: string;
}

// ==========================================
// PREPARATION BASIS & NOTIFICATION MODES
// ==========================================

export type PreparationMode =
  | 'PRE_NOTIFICATION_PREPARATION'
  | 'ACTIVE_NOTIFICATION'
  | 'HISTORICAL_PRACTICE'
  | 'CUSTOM_PRACTICE';

export type PreparationBasisStatus =
  | 'HISTORICAL_BASIS_VERIFIED'
  | 'HISTORICAL_BASIS_PARTIAL'
  | 'INSUFFICIENT_BASIS'
  | 'CURRENT_NOTIFICATION_VERIFIED';

export type FutureNotificationAvailability =
  | 'NOT_YET_RELEASED'
  | 'ACTIVE'
  | 'RELEASED'
  | 'UNKNOWN';

export type PatternChangeRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';

export interface PreparationBasis {
  preparation_basis_id: string;
  exam_id: string;
  preparation_mode: PreparationMode;
  historical_exam_version: string;
  recruitment_cycle: string;
  notification: string;
  syllabus_version: string;
  pattern_version: string;
  pyq_intelligence_version: string;
  last_verified_date: string;
  future_notification_availability: FutureNotificationAvailability;
  pattern_change_risk: PatternChangeRisk;
  confidence: number;
  source_references: string[];
  status: PreparationBasisStatus;
  risk_reasons?: string[];
  basis_summary?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PatternChangeReport {
  exam_id: string;
  exam_title?: string;
  old_version_id: string;
  new_version_id: string;
  old_recruitment_cycle: string;
  new_recruitment_cycle: string;
  generated_at: string;
  has_pattern_changed: boolean;
  candidate_facing: boolean;
  is_verified: boolean;
  verification_notes?: string;
  total_questions: { old_value: number; new_value: number; difference: number; changed: boolean };
  duration_minutes: { old_value: number; new_value: number; difference: number; changed: boolean };
  total_marks: { old_value: number; new_value: number; difference: number; changed: boolean };
  negative_marking: { old_rate: number; new_rate: number; changed: boolean };
  sections_added: string[];
  sections_removed: string[];
  syllabus_topics_added: string[];
  syllabus_topics_removed: string[];
  guidance_for_candidates: string;
  summary: string;
}

// ==========================================
// 1. EXAM INTAKE & EXAM DATABASE SCHEMA
// ==========================================

export type ExamStatus = 'INTAKE_SUBMITTED' | 'RESEARCH_COMPLETED' | 'MOCK_READY' | 'ARCHIVED';

export type ExamProfileStatus =
  | 'NEW'
  | 'RESEARCH_REQUIRED'
  | 'PARTIALLY_VERIFIED'
  | 'VERIFIED'
  | 'STALE'
  | 'CONFLICT';

export type PatternStatus = 'VERIFIED' | 'UNVERIFIED' | 'CONFLICT';

export type CriticalFactName =
  | 'authority'
  | 'exam_name'
  | 'recruitment_cycle'
  | 'stage_tier'
  | 'paper'
  | 'question_count'
  | 'marks'
  | 'duration'
  | 'negative_marking'
  | 'language_rules'
  | 'section_structure'
  | 'syllabus_version';

export const CRITICAL_EXAM_FACTS: readonly CriticalFactName[] = [
  'authority',
  'exam_name',
  'recruitment_cycle',
  'stage_tier',
  'paper',
  'question_count',
  'marks',
  'duration',
  'negative_marking',
  'language_rules',
  'section_structure',
  'syllabus_version'
] as const;

export interface ExamFactVerification {
  fact_id: string;
  exam_id: string;
  fact_name: CriticalFactName;
  fact_label: string;
  fact_value: string | number | string[];
  source_id?: string;
  source_title?: string;
  source_url?: string;
  document_id?: string;
  evidence_text: string;
  page_or_section?: string;
  verification_status: VerificationStatus;
  confidence: number;
  applicable_cycle: string;
  verified_at?: string;
  verified_by?: string;
}

export interface ExamPattern {
  total_questions: number;
  duration_minutes: number;
  total_marks: number;
  marks_per_question: number;
  negative_marking_rate: number; // e.g. 0.25 (1/4) or 0.33 (1/3) or 0
  sections: string[];
  mediums: string[];
}

export interface ExamPatternVersion {
  version_id: string;
  exam_id: string;
  recruitment_cycle: string;
  notification_number?: string;
  effective_date?: string;
  pattern: ExamPattern;
  syllabus_topics: string[];
  fact_verifications?: Record<CriticalFactName, ExamFactVerification>;
  is_active: boolean;
  notes?: string;
}

export interface ExamRecord {
  exam_id: string;
  intake_id: string;
  title: string;
  commission: string;
  state_or_central: string;
  post: string;
  stage: string;
  paper: string;
  recruitment_cycle: string;
  pattern: ExamPattern;
  syllabus_topics: string[];
  status: ExamStatus;
  exam_profile_status: ExamProfileStatus;
  pattern_status: PatternStatus;
  last_researched_at?: string;
  pattern_verified_at?: string;
  syllabus_verified_at?: string;
  current_affairs_updated_at?: string;
  source_confidence_score?: number; // 0 - 100
  target_date?: string;
  created_at: string;
  updated_at: string;
  research_run_id?: string;
  active_cycle?: string;
  pattern_versions?: ExamPatternVersion[];
  fact_verifications?: Record<CriticalFactName, ExamFactVerification>;
  preparation_mode?: PreparationMode;
  preparation_basis?: PreparationBasis;
  data_provenance?: DataProvenance;
}

export interface ExamIntakeInput {
  title: string;
  commission: string;
  state_or_central: string;
  post: string;
  stage: string;
  paper: string;
  recruitment_cycle: string;
  total_questions: number;
  duration_minutes: number;
  marks_per_question: number;
  negative_marking_rate: number;
  sections: string[];
  syllabus_topics: string[];
  mediums: string[];
  target_date?: string;
  notes?: string;
  exam_profile_status?: ExamProfileStatus;
  pattern_status?: PatternStatus;
  preparation_mode?: PreparationMode;
}

// ==========================================
// 2. SOURCES DATABASE SCHEMA
// ==========================================

export type DocumentType = 
  | 'GAZETTE'
  | 'NOTIFICATION'
  | 'SYLLABUS'
  | 'PREVIOUS_PAPER'
  | 'ANSWER_KEY'
  | 'GOVT_ORDER'
  | 'SECONDARY';

export interface SourceRecord {
  research_evidence?: import('./researchCoverage.ts').ResearchEvidence;
  research_document?: {text:string;retrieved_at:string;content_hash:string};
  collected_article?: CollectedArticle;
  source_id: string;
  exam_id?: string;
  authority_id?: string;
  title: string;
  url: string;
  domain: string;
  source_level: SourceTrustLevel;
  document_type: DocumentType;
  verification_status: VerificationStatus;
  data_provenance?: DataProvenance;
  retrieved_at: string;
  publication_date?: string;
  last_verified_at?: string;
  content_hash?: string;
  is_current: boolean;
  file_hash?: string;
  file_size_kb?: number;
  summary?: string;
}

// ==========================================
// 3. MOCK TEST & QUESTION SCHEMA
// ==========================================

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type MockStatus =
  | 'DRAFT'
  | 'GENERATING'
  | 'VALIDATING'
  | 'READY_FOR_AUDIT'
  | 'FINAL'
  | 'FAILED'
  | 'LIVE_VALIDATION_PASSED_PENDING_DATABASE';

export type GenerationStatus =
  | 'GENERATION_SUCCESS'
  | 'GENERATION_PARTIAL'
  | 'GENERATION_FAILED';

// Candidate Lifecycle Stages
export type CandidateStatus =
  | 'GENERATED'
  | 'STRUCTURE_CHECK'
  | 'FACT_CHECK'
  | 'ANSWER_CHECK'
  | 'QUALITY_CHECK'
  | 'DUPLICATE_CHECK'
  | 'LANGUAGE_CHECK'
  | 'READY'
  | 'REPAIR_REQUIRED'
  | 'REPLACEMENT_REQUIRED'
  | 'REJECTED'
  | 'ACCEPTED';

export type AmbiguityStatus =
  | 'ONE_CLEAR_ANSWER'
  | 'POTENTIAL_AMBIGUITY'
  | 'MULTIPLE_CORRECT'
  | 'NO_CORRECT_OPTION';

export type AnswerResolutionStatus =
  | 'GENERATOR_CORRECT'
  | 'VALIDATOR_CORRECT'
  | 'QUESTION_AMBIGUOUS'
  | 'SOURCE_CONFLICT'
  | 'REPLACE_REQUIRED'
  | 'AGREEMENT';

export type FactClaimStatus =
  | 'SUPPORTED'
  | 'CONTRADICTED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'NOT_SOURCE_REQUIRED';

export type QuestionStyleStatus =
  | 'STYLE_ALIGNED'
  | 'STYLE_ACCEPTABLE'
  | 'STYLE_WEAK'
  | 'STYLE_MISMATCH';

export type PyqRelationship =
  | 'NEW'
  | 'RELATED_TO_PYQ'
  | 'ADJACENT_TO_PYQ'
  | 'SAME_FACT_AS_PYQ';

export type BilingualParityStatus =
  | 'PARITY_PASS'
  | 'MINOR_REPAIR'
  | 'MAJOR_MISMATCH'
  | 'NOT_APPLICABLE';

export type MockAuditStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'REPAIR_REQUIRED'
  | 'READY_FOR_AUDITOR'
  | 'PASSED'
  | 'FAILED';

export interface SourceLineage {
  source_id?: string;
  document_id?: string;
  source_url?: string;
  source_title: string;
  source_level?: SourceTrustLevel | string;
  publication_date?: string;
  retrieved_at?: string;
  evidence_snippet?: string;
  fact_verified_at?: string;
}

export interface FactClaimAudit {
  claim: string;
  status: FactClaimStatus;
  source_ref?: string;
  evidence?: string;
}

export interface NumericalValidationResult {
  calculation_input?: string;
  calculation_method?: string;
  calculated_answer?: string;
  option_matching_result?: string;
  is_deterministic_match: boolean;
  notes?: string;
}

export interface ReasoningValidationResult {
  internally_consistent: boolean;
  solution_exists: boolean;
  solution_unique: boolean;
  deduced_option_index?: number;
  notes?: string;
}

export type OptionSymmetryStatus =
  | 'SYMMETRIC'
  | 'MINOR_ASYMMETRY'
  | 'MAJOR_IMBALANCE'
  | 'ANSWER_LEAK';

export type OptionOutlierLevel = 'NO_OUTLIER' | 'MINOR_OUTLIER' | 'MAJOR_OUTLIER';

export type BlindAuditCueLevel = 'NO_CUE' | 'WEAK_CUE' | 'STRONG_CUE';

export interface OptionQualityAudit {
  symmetry_status: OptionSymmetryStatus;
  symmetry_score: number; // 0 to 100
  outlier_level: OptionOutlierLevel;
  outlier_reasons: string[];
  length_ratio: number;
  median_length: number;
  correct_option_length_deviation: number;
  clause_counts: number[];
  entity_counts: number[];
  date_or_number_counts: number[];
  has_parenthetical: boolean[];
  parenthetical_leak_detected: boolean;
  stem_echo_detected: boolean;
  stem_echo_words?: string[];
  extreme_qualifiers_detected: boolean;
  extreme_qualifier_options?: number[];
  same_semantic_category: boolean;
  semantic_category_notes?: string;
  blind_audit_cue_level: BlindAuditCueLevel;
  predicted_option_index?: number;
  distractor_quality_score: number; // 1 to 5
  weak_distractors?: { option_index: number; reason: string }[];
  flags: string[];
  recommendation: 'PASS' | 'REPAIR' | 'REPLACE';
}

export interface CoreFactRepresentation {
  subject: string;
  topic: string;
  subtopic?: string;
  entities: string[];
  relation: string;
  property_tested: string;
  object_or_value: string;
  time_scope?: string;
  effective_date?: string;
  cutoff_date?: string;
  jurisdiction?: string;
  correct_answer_concept: string;
  fact_fingerprint?: string;
}

export interface StructuralFingerprint {
  template_family: 'NUMERICAL' | 'REASONING_PUZZLE' | 'DATA_INTERPRETATION' | 'PASSAGE' | 'SEATING' | 'CODING' | 'SERIES' | 'OTHER';
  structure_signature: string;
  variables: Record<string, string | number>;
  operators?: string[];
}

export interface SemanticRepresentation {
  concept_intent_vector?: number[];
  semantic_summary: string;
  key_terms: string[];
}

export interface QuestionAuditResult {
  structure_status: 'PASS' | 'FAIL';
  fact_status: FactClaimStatus;
  answer_status: 'PASS' | 'VALIDATOR_DISAGREES' | 'FAIL';
  ambiguity_status: AmbiguityStatus;
  source_status: 'PASS' | 'FAIL';
  distractor_score: number; // 1 to 5
  distractor_notes?: string[];
  style_status: QuestionStyleStatus;
  blueprint_alignment: 'ALIGNED' | 'MISALIGNED';
  difficulty_alignment: 'MATCH' | 'MINOR_DEVIATION' | 'MISMATCH';
  cognitive_alignment: 'MATCH' | 'COGNITIVE_MISMATCH';
  duplicate_status: DuplicateDecision;
  duplicate_layer_matched?: string;
  pyq_copy_status: PyqRelationship;
  language_status: BilingualParityStatus;
  bilingual_parity_score?: number; // 0 - 100
  visual_status: 'PASS' | 'FAIL' | 'NOT_REQUIRED';
  overall_status: 'PASS' | 'REPAIR' | 'REPLACE';
  critical_blockers: string[];
  observed_difficulty?: QuestionDifficulty;
  observed_cognitive?: string;
  validator_answer_index?: number;
  answer_resolution?: AnswerResolutionStatus;
  fact_claims_audit?: FactClaimAudit[];
  numerical_audit?: NumericalValidationResult;
  reasoning_audit?: ReasoningValidationResult;
  option_quality_audit?: OptionQualityAudit;
  symmetry_audit?: OptionQualityAudit;
  core_fact_representation?: CoreFactRepresentation;
  structural_fingerprint?: StructuralFingerprint;
  semantic_representation?: SemanticRepresentation;
  audited_at: string;
}

export interface VisualSpecification {
  visual_type: 'TABLE' | 'BAR_CHART' | 'LINE_CHART' | 'PIE_CHART' | 'MAP' | 'VENN' | 'SCIENCE_DIAGRAM' | 'GEOMETRY' | 'SEATING_DIAGRAM' | 'OTHER';
  visual_specification?: string;
  data_values?: Record<string, any> | Array<any>;
  labels?: string[];
  alt_text: string;
  answer_dependency: boolean;
  ascii_art?: string;
}

export interface BilingualQuestion {
  secondary_language: string;
  question_text: string;
  options: string[];
  explanation: string;
  parity_score: number;
}

export interface QuestionProvenance {
  exam_id: string;
  mock_id: string;
  series_id?: string;
  blueprint_id?: string;
  blueprint_version?: number;
  slot_id?: string;
  generation_run_id: string;
  model: string;
  generation_timestamp: string;
  source_ids: string[];
  validation_run_ids: string[];
  repair_count: number;
  replacement_count: number;
  generation_provenance?: GenerationProvenance;
  research_provenance?: ResearchProvenance;
}

export interface MockQuestion {
  current_affairs_evidence?: CurrentAffairsEvidence;
  question_id: string;
  mock_id: string;
  question_number: number;
  section_name: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  topic: string;
  subtopic?: string;
  difficulty: QuestionDifficulty;
  canonical_hash: string;
  source_reference?: string;
  slot_id?: string;
  blueprint_id?: string;
  question_type?: string;
  cognitive_level?: string;
  core_concept_target?: string;
  answerable_fact_family?: string;

  // Rich lifecycle & audit properties
  candidate_status?: CandidateStatus;
  source_lineage?: SourceLineage[];
  audit_result?: QuestionAuditResult;
  provenance?: QuestionProvenance;
  core_concept?: string;
  core_answerable_fact?: string;
  entities?: string[];
  relationships?: string[];
  correct_answer_concept?: string;
  semantic_fingerprint?: string;
  fact_fingerprint?: string;
  visual_specification?: VisualSpecification;
  bilingual?: BilingualQuestion;
  is_synthetic_test_data?: boolean;
  data_provenance?: DataProvenance;
  generation_provenance?: GenerationProvenance;
  research_provenance?: ResearchProvenance;
  option_quality_audit?: OptionQualityAudit;
  symmetry_status?: OptionSymmetryStatus;
  duplicate_score?: number;
  duplicate_layer_matched?: string;
  pyq_copy_status?: PyqRelationship;
  core_fact_representation?: CoreFactRepresentation;
  structural_fingerprint?: StructuralFingerprint;
  semantic_representation?: SemanticRepresentation;
  first_pass_status?: CandidateStatus;
  repair_attempts?: number;
  replacement_attempts?: number;
  validation_blockers?: string[];
  generation_model_id?: string;
}

export interface MockSection {
  section_id: string;
  section_name: string;
  total_questions: number;
  marks_per_question: number;
  questions: MockQuestion[];
}

export interface MockQualityAuditCheck {
  id: string;
  title: string;
  category: 'STRUCTURE' | 'SYLLABUS' | 'COGNITIVE' | 'AUTHENTICITY' | 'LEGAL_TEMPORAL' | 'EVIDENCE';
  passed: boolean;
  score?: number; // 0-100
  details: string;
  affected_question_numbers?: number[];
  affected_slot_ids?: string[];
}

export interface MockQualityAudit {
  audit_id: string;
  mock_id: string;
  exam_id: string;
  blueprint_id?: string;
  status: MockAuditStatus;
  overall_score: number; // 0-100
  total_questions_audited: number;
  accepted_questions_count: number;
  repair_required_count: number;
  replacement_required_count: number;
  critical_blockers_count: number;
  checks: MockQualityAuditCheck[];
  summary: string;
  audited_at: string;
  auditor_signoff?: {
    auditor_name: string;
    signed_at: string;
    notes?: string;
  };
}

export interface MockTestRecord {
  mock_id: string;
  exam_id: string;
  exam_title: string;
  mock_number: number;
  title: string;
  blueprint_id?: string;
  blueprint_version?: number;
  test_mode?: string;
  created_at: string;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  negative_marking_rate: number;
  difficulty_mix: {
    easy: number;
    medium: number;
    hard: number;
  };
  sections: MockSection[];
  duplicates_prevented_count: number;
  status: MockStatus;
  generation_status?: GenerationStatus;
  audit_notes?: string;
  finalized_at?: string;
  quality_audit?: MockQualityAudit;
  preparation_mode?: PreparationMode;
  preparation_basis_id?: string;
  preparation_basis?: PreparationBasis;
  target_exam_date?: string | null;
  preparation_as_of_date?: string;
  current_affairs_cutoff?: string;
  current_affairs_mode?: 'OFFICIAL_EXAM_CUTOFF' | 'PREPARATION_CURRENT_AFFAIRS' | 'HISTORICAL_PRACTICE';
  series_id?: string;
  data_provenance?: DataProvenance;
  generation_provenance?: GenerationProvenance;
  research_provenance?: ResearchProvenance;
  duplicate_layers_status?: string;
  disclaimer?: string;
}

// ==========================================
// 4. DUPLICATE LEDGER SCHEMA
// ==========================================

export type DuplicateDecision =
  | 'UNIQUE'
  | 'POSSIBLE_DUPLICATE'
  | 'DUPLICATE'
  | 'STRUCTURAL_REPEAT'
  | 'SAME_FACT_REPEAT';

export interface DuplicateLedgerEntry {
  ledger_id: string;
  question_hash: string;
  canonical_hash: string;
  normalized_text?: string;
  canonical_question_preview: string;
  canonical_full_text?: string;
  core_concept?: string;
  core_fact?: string;
  semantic_fingerprint?: string;
  question_archetype?: string;
  subject?: string;
  topic: string;
  subtopic?: string;
  dataset_identifier?: string;
  passage_identifier?: string;
  mock_id?: string;
  mock_ids: string[];
  series_id?: string;
  test_mode?: string;
  exam_id: string;
  first_registered_at: string;
  duplicate_attempts_blocked: number;
  similarity_cluster_key: string;
  core_fact_representation?: CoreFactRepresentation;
  structural_fingerprint?: StructuralFingerprint;
  semantic_representation?: SemanticRepresentation;
}

export interface DuplicateCheckResult {
  is_duplicate: boolean;
  decision: DuplicateDecision;
  question_hash: string;
  canonical_hash?: string;
  matching_ledger_entry?: DuplicateLedgerEntry;
  similarity_score?: number;
  layer_matched?:
    | StandardDuplicateLayerId
    | 'LAYER_1_CANONICAL_HASH'
    | 'LAYER_2_JACCARD_TOKENS'
    | 'LAYER_2_LEXICAL_JACCARD'
    | 'LAYER_3_SEMANTIC'
    | 'LAYER_3_ONTOLOGY_SEMANTIC'
    | 'LAYER_4_CORE_FACT'
    | 'LAYER_4_CORE_ANSWERABLE_FACT'
    | 'LAYER_5_STRUCTURAL'
    | 'LAYER_5_STRUCTURAL_TEMPLATE';
  reason?: string;
  layers_executed?: string[];
  scope_matched?: 'SAME_MOCK' | 'SAME_MOCK_SERIES' | 'PREVIOUS_YEAR_QUESTION';
}

export type AuditType =
  | 'RESEARCH_AUDIT'
  | 'PATTERN_VERIFICATION_AUDIT'
  | 'GENERATION_AUDIT'
  | 'FINALIZATION_AUDIT'
  | 'MOCK_FINALIZATION_AUDIT'
  | 'PYQ_ANALYSIS_AUDIT'
  | 'QUESTION_GENERATION_AUDIT'
  | 'QUESTION_FACT_VERIFICATION'
  | 'QUESTION_ANSWER_VERIFICATION'
  | 'QUESTION_DUPLICATE_AUDIT'
  | 'QUESTION_LANGUAGE_AUDIT'
  | 'QUESTION_REPAIR_AUDIT'
  | 'QUESTION_REPLACEMENT_AUDIT'
  | 'MOCK_QUALITY_AUDIT';

export interface GenerationAuditLog {
  log_id: string;
  audit_type: AuditType;
  action?: string;
  exam_id: string;
  exam_title?: string;
  mock_id?: string;
  recruitment_cycle?: string;
  field_name?: CriticalFactName | string;
  previous_value?: any;
  new_value?: any;
  reason?: string;
  source_id?: string;
  source_ref?: string;
  auditor?: string;
  status?: GenerationStatus | 'SUCCESS' | 'FAILURE';
  attempt_count?: number;
  target_count?: number;
  validated_count?: number;
  duplicates_blocked?: number;
  error_message?: string;
  created_at: string;
}

export type SystemAuditLog = GenerationAuditLog;

export interface FactCheckItem {
  fact_name: CriticalFactName;
  fact_label: string;
  verified: boolean;
  status: VerificationStatus;
  has_evidence: boolean;
  value: string | number | string[];
  evidence_text: string;
  source_ref?: string;
}

export interface MockReadinessCheckResult {
  can_generate: boolean;
  status: 'READY' | 'NOT_READY';
  exam_id: string;
  exam_title: string;
  applicable_cycle: string;
  checks: {
    exam_identity_verified: boolean;
    exam_pattern_verified: boolean;
    syllabus_available: boolean;
    test_mode_selected: boolean;
    language_selected: boolean;
    question_count_resolved: boolean;
    marks_pattern_resolved: boolean;
    duration_resolved: boolean;
    negative_marking_resolved: boolean;
    source_confidence_sufficient: boolean;
    all_critical_facts_verified: boolean;
    no_critical_conflicts: boolean;
  };
  fact_checks: Record<CriticalFactName, FactCheckItem>;
  source_confidence_score: number;
  missing_requirements: string[];
  redirect_action?: 'RESEARCH_REQUIRED' | 'INTAKE_UPDATE' | 'AUDITOR_REVIEW' | null;
  reason?: string;
  preparation_mode?: PreparationMode;
  preparation_basis?: PreparationBasis;
  persistence_validation?: {
    isValid: boolean;
    status: 'VALID' | 'PRODUCTION_PERSISTENCE_INVALID';
    message: string;
  };
}

// ==========================================
// 5. PREVIOUS-YEAR QUESTION PAPER INTELLIGENCE
// ==========================================

export type PreviousPaperOfficialStatus =
  | 'OFFICIAL'
  | 'GOVERNMENT_ARCHIVE'
  | 'SECONDARY_COPY'
  | 'USER_UPLOAD_UNVERIFIED';

export type PaperExtractionStatus = 'PENDING' | 'EXTRACTING' | 'EXTRACTED' | 'FAILED';
export type PaperAnalysisStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface PreviousPaperRecord {
  paper_id: string;
  exam_id: string;
  exam_version_id?: string;
  recruitment_cycle: string;
  year: number;
  exam_date?: string;
  stage: string;
  paper_name: string;
  paper_number: string | number;
  shift?: string;
  booklet_code?: string;
  language: string;
  question_count: number;
  marks: number;
  duration_minutes: number;
  source_id?: string;
  document_id?: string;
  official_status: PreviousPaperOfficialStatus;
  data_provenance?: DataProvenance;
  answer_key_id?: string;
  final_answer_key_id?: string;
  content_hash: string;
  extraction_status: PaperExtractionStatus;
  analysis_status: PaperAnalysisStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type PYQAnswerVerificationStatus =
  | 'FINAL_OFFICIAL'
  | 'OFFICIAL'
  | 'AUDITOR_VERIFIED'
  | 'SECONDARY'
  | 'CONFLICT'
  | 'UNVERIFIED';

export type PYQQuestionType =
  | 'DIRECT_FACT'
  | 'CONCEPTUAL'
  | 'APPLICATION'
  | 'STATEMENT_SINGLE'
  | 'STATEMENT_COMBINATION'
  | 'ASSERTION_REASON'
  | 'MATCHING'
  | 'CHRONOLOGY'
  | 'CORRECT_STATEMENT'
  | 'INCORRECT_STATEMENT'
  | 'MULTI_STATEMENT_COUNT'
  | 'DATA_INTERPRETATION'
  | 'NUMERICAL'
  | 'LOGICAL_REASONING'
  | 'PUZZLE'
  | 'MAP_BASED'
  | 'IMAGE_BASED'
  | 'TABLE_BASED'
  | 'PASSAGE_BASED'
  | 'LEGAL_PROVISION'
  | 'CURRENT_AFFAIRS'
  | 'STATIC_CURRENT_LINK'
  | 'LANGUAGE_GRAMMAR'
  | 'COMPREHENSION'
  | 'OTHER';

export type PYQCognitiveLevel =
  | 'RECALL'
  | 'UNDERSTAND'
  | 'APPLY'
  | 'ANALYSE'
  | 'MULTI_STEP_REASONING';

export type PYQDifficultyLevel = 'EASY' | 'MODERATE' | 'DIFFICULT';

export type StaticOrCurrent = 'STATIC' | 'CURRENT' | 'STATIC_CURRENT_LINK';

export type StateSpecificity = 'STATE_SPECIFIC' | 'INDIA_GENERAL' | 'INTERNATIONAL';

export type DistractorStyle =
  | 'SAME_CATEGORY'
  | 'NEAR_FACT'
  | 'DATE_CONFUSION'
  | 'PERSON_CONFUSION'
  | 'PLACE_CONFUSION'
  | 'TERM_CONFUSION'
  | 'CONCEPT_REVERSAL'
  | 'PARTIALLY_TRUE'
  | 'STATEMENT_COMBINATION'
  | 'NUMERICAL_NEAR_MISS'
  | 'COMMON_MISCONCEPTION'
  | 'CHRONOLOGY_SWAP'
  | 'LEGAL_SECTION_CONFUSION'
  | 'PLAUSIBLE_BUT_UNRELATED'
  | 'OTHER';

export type WhyAskedReasonTag =
  | 'CORE_SYLLABUS'
  | 'HIGH_FREQUENCY_TOPIC'
  | 'STATE_IMPORTANCE'
  | 'NATIONAL_IMPORTANCE'
  | 'CURRENT_AFFAIRS_TRIGGER'
  | 'RECENT_GOVERNMENT_SCHEME'
  | 'NEW_ACT_OR_RULE'
  | 'RECENT_JUDGMENT'
  | 'BUDGET_TRIGGER'
  | 'ECONOMIC_SURVEY_TRIGGER'
  | 'OFFICIAL_REPORT_TRIGGER'
  | 'NEW_STATISTIC'
  | 'SCIENCE_TECH_DEVELOPMENT'
  | 'ENVIRONMENT_EVENT'
  | 'INTERNATIONAL_EVENT'
  | 'ANNIVERSARY'
  | 'CULTURAL_RELEVANCE'
  | 'GEOGRAPHICAL_RELEVANCE'
  | 'REPEATED_COMMISSION_THEME'
  | 'ROTATIONAL_TOPIC'
  | 'TEXTBOOK_CORE'
  | 'CONCEPTUAL_APPLICATION'
  | 'UNKNOWN';

export interface AdjacentConceptRecord {
  concept: string;
  relationship_to_pyq: string;
  syllabus_relevance: string;
  future_relevance: 'HIGH' | 'MEDIUM' | 'LOW';
  source_requirement?: string;
}

export interface PYQQuestionRecord {
  pyq_question_id: string;
  paper_id: string;
  exam_id: string;
  question_number: number;

  // Bilingual / English Content
  question_en: string;
  option_a_en: string;
  option_b_en: string;
  option_c_en: string;
  option_d_en: string;

  question_local?: string;
  option_a_local?: string;
  option_b_local?: string;
  option_c_local?: string;
  option_d_local?: string;

  // Answer & Key Linking
  correct_answer: 'A' | 'B' | 'C' | 'D';
  provisional_answer?: 'A' | 'B' | 'C' | 'D';
  answer_verification_status: PYQAnswerVerificationStatus;
  answer_source_citation?: string;
  provisional_conflict_history?: string;

  question_source_page?: number;
  answer_key_source_page?: number;

  // Visuals
  has_image: boolean;
  has_table: boolean;
  has_chart: boolean;
  has_map: boolean;
  has_diagram: boolean;
  visual_reference?: string;
  visual_type?: string;
  visual_page?: number;
  visual_description?: string;
  visual_required_for_answer?: boolean;
  visual_review_required?: boolean; // VISUAL_EXTRACTION_REVIEW_REQUIRED

  raw_question_text: string;
  normalized_question_text: string;

  // Classification
  primary_subject: string;
  primary_topic: string;
  secondary_topics?: string[];
  subtopic: string;
  microtopic: string;

  question_type: PYQQuestionType;
  question_archetype: string;

  difficulty: PYQDifficultyLevel;
  difficulty_factors?: {
    knowledge_obscurity?: string;
    reasoning_steps?: number;
    statement_complexity?: string;
    distractor_similarity?: string;
    cross_topic_integration?: boolean;
    calculation_complexity?: string;
    elimination_required?: string;
  };

  cognitive_level: PYQCognitiveLevel;

  static_or_current: StaticOrCurrent;
  event_date?: string;
  exam_date?: string;
  current_affairs_age_months?: number;

  state_specificity: StateSpecificity;
  state_domain?: string;

  source_domain: string;
  knowledge_type: string;
  concept_depth: string;
  question_length: 'SHORT' | 'MEDIUM' | 'LONG';
  option_style: string;
  distractor_style: DistractorStyle;
  distractor_quality_score: number; // 1 to 5
  distractor_details?: {
    option_a_trap?: string;
    option_b_trap?: string;
    option_c_trap?: string;
    option_d_trap?: string;
    trap_archetype?: string;
  };
  elimination_possible: boolean;
  question_relevance: 'HIGH' | 'MEDIUM' | 'LOW';

  // Why Was This Asked
  reason_tags: WhyAskedReasonTag[];
  reason_summary: string;
  evidence_strength: 'STRONG' | 'MODERATE' | 'SPECULATIVE';

  // Adjacent Testable Concepts
  adjacent_concepts: AdjacentConceptRecord[];

  // Same-Fact Fingerprint
  core_concept: string;
  core_answerable_fact: string;
  entities: string[];
  relationships: string[];
  correct_answer_concept: string;
  pyq_fact_fingerprint: string;

  // Human Auditor Review
  auditor_reviewed?: boolean;
  auditor_name?: string;
  auditor_notes?: string;
  reviewed_at?: string;

  data_provenance?: DataProvenance;
  research_provenance?: ResearchProvenance;
  paper_source?: string;
  source_document_id?: string;
  answer_key_source?: string;
  official_url?: string;
  content_hash?: string;

  created_at: string;
  updated_at: string;
}

export interface ExamQuestionFormatProfile {
  format: PYQQuestionType;
  count: number;
  percentage: number;
  years_observed: number[];
  confidence: number;
}

export type TopicTrendDirection =
  | 'STABLE_CORE'
  | 'INCREASING'
  | 'DECREASING'
  | 'CYCLICAL'
  | 'EMERGING'
  | 'RARE'
  | 'INSUFFICIENT_DATA';

export interface TopicTrend {
  subject: string;
  topic: string;
  subtopic?: string;
  sample_size: number;
  question_count: number;
  observed_pyq_weight: number; // percentage
  official_blueprint_weight?: number; // percentage if defined
  years_appeared: number[];
  consecutive_year_appearances: number;
  recurrence_interval_years: number | null;
  trend_direction: TopicTrendDirection;
  sample_size_caution: string;
}

export interface ExamIntelligenceProfile {
  profile_id: string;
  exam_id: string;
  exam_version_id?: string;
  recruitment_cycle: string;
  analysis_date: string;
  papers_analysed_count: number;
  questions_analysed_count: number;
  answers_verified_count: number;
  visual_questions_count: number;
  unverified_questions_count: number;

  // Topic & Subject distributions
  subject_distribution: Array<{
    subject: string;
    count: number;
    percentage: number;
    official_weight?: number;
  }>;
  topic_distribution: TopicTrend[];
  subtopic_distribution: Array<{
    subject: string;
    topic: string;
    subtopic: string;
    count: number;
    percentage: number;
  }>;

  // Question Format & Cognitive
  format_distribution: ExamQuestionFormatProfile[];
  difficulty_distribution: {
    easy_pct: number;
    moderate_pct: number;
    difficult_pct: number;
  };
  cognitive_distribution: {
    recall_pct: number;
    understand_pct: number;
    apply_pct: number;
    analyse_pct: number;
    multi_step_pct: number;
  };

  // Dimensions
  static_vs_current: {
    static_pct: number;
    current_pct: number;
    link_pct: number;
    typical_window_months: string;
  };
  state_vs_national: {
    state_specific_pct: number;
    india_general_pct: number;
    international_pct: number;
  };
  visual_ratio: number;
  distractor_style_distribution: Record<string, number>;
  answer_position_distribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    A_pct: number;
    B_pct: number;
    C_pct: number;
    D_pct: number;
  };

  // Thematic Insights
  top_recurring_themes: Array<{
    theme: string;
    count: number;
    why_asked: string;
    sample_question_ids: string[];
  }>;
  emerging_themes: Array<{
    theme: string;
    first_appeared_year: number;
    latest_year: number;
    count: number;
  }>;
  rotational_topics: Array<{
    topic: string;
    cycle_length_years: number;
    last_seen_year: number;
  }>;
  adjacent_testable_areas: Array<{
    concept: string;
    source_pyq_concept: string;
    future_relevance: 'HIGH' | 'MEDIUM' | 'LOW';
    syllabus_area: string;
  }>;

  confidence_score: number; // 0 to 100
  readiness_status: 'NO_PYQ_DATA' | 'LIMITED_DATA' | 'SUFFICIENT' | 'HIGH_CONFIDENCE';
  comparable_exam_evidence?: Array<{
    comparable_exam: string;
    reason: string;
    observed_overlap: string;
  }>;
}

export interface PYQClusterRecord {
  cluster_id: string;
  exam_id: string;
  cluster_name: string;
  cluster_type: 'EXACT_FACT_REPEAT' | 'RELATED_FACT' | 'SAME_CONCEPT' | 'SAME_FORMAT' | 'UNRELATED';
  core_concept: string;
  question_ids: string[];
  questions_preview: Array<{
    id: string;
    year: number;
    number: number;
    text: string;
    answer: string;
  }>;
}

export type PYQAnalysisRunStatus =
  | 'QUEUED'
  | 'EXTRACTING'
  | 'ANSWER_LINKING'
  | 'CLASSIFYING'
  | 'ANALYSING'
  | 'BUILDING_INTELLIGENCE'
  | 'READY_FOR_REVIEW'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED';

export interface PYQAnalysisRun {
  run_id: string;
  paper_id?: string;
  exam_id: string;
  status: PYQAnalysisRunStatus;
  papers_count: number;
  questions_count: number;
  successful_count: number;
  failed_count: number;
  unverified_count: number;
  tokens_used: number;
  model_used: string;
  duration_ms: number;
  cost_estimate_usd: number;
  created_at: string;
  updated_at: string;
  error_message?: string;
}

export type ExamIntelligenceReadiness =
  | 'NO_PYQ_DATA'
  | 'LIMITED_DATA'
  | 'SUFFICIENT'
  | 'HIGH_CONFIDENCE';

// ==========================================
// 6. EVIDENCE-BASED MOCK BLUEPRINT ENGINE
// ==========================================

export type TestMode = 'FULL_LENGTH' | 'SUBJECT_WISE' | 'TOPIC_WISE' | 'CUSTOM';

export type BlueprintStatus =
  | 'DRAFT'
  | 'ALLOCATING'
  | 'VALIDATING'
  | 'NEEDS_REVIEW'
  | 'APPROVED'
  | 'BLUEPRINT_LOCKED'
  | 'SUPERSEDED'
  | 'FAILED';

export type PYQRelationshipType =
  | 'STABLE_CORE_NEW_FACT'
  | 'ADJACENT_TO_PYQ'
  | 'ROTATIONAL_TOPIC'
  | 'CURRENT_EXTENSION'
  | 'UNDERTESTED_SYLLABUS'
  | 'NEW_APPLICATION_OF_CORE_CONCEPT'
  | 'COMPARABLE_EXAM_STYLE'
  | 'NO_PYQ_EVIDENCE';

export type BlueprintVisualType =
  | 'NONE'
  | 'MAP'
  | 'BAR_CHART'
  | 'LINE_GRAPH'
  | 'PIE_CHART'
  | 'TABLE'
  | 'SCIENCE_DIAGRAM'
  | 'VENN'
  | 'SEATING_DIAGRAM'
  | 'GEOMETRY'
  | 'IMAGE'
  | 'OTHER';

export type CurrentAffairsCategory =
  | 'STATE'
  | 'NATIONAL'
  | 'INTERNATIONAL'
  | 'ECONOMY'
  | 'SCIENCE_TECH'
  | 'ENVIRONMENT'
  | 'REPORTS_INDICES'
  | 'APPOINTMENTS'
  | 'SCHEMES'
  | 'SPORTS'
  | 'AWARDS'
  | 'DEFENCE'
  | 'OTHER';

export interface CurrentAffairsWindow {
  window_start: string;
  window_end: string;
  cutoff_date: string;
  category?: CurrentAffairsCategory;
}

export interface BlueprintQuestionSlot {
  slot_id: string;
  blueprint_id: string;
  question_number: number;

  subject: string;
  topic: string;
  subtopic: string;
  microtopic: string;

  question_type: PYQQuestionType | string;
  question_archetype: string;

  difficulty: 'EASY' | 'MODERATE' | 'DIFFICULT';
  cognitive_level: 'RECALL' | 'UNDERSTAND' | 'APPLY' | 'ANALYSE' | 'MULTI_STEP_REASONING';

  static_current: 'STATIC' | 'CURRENT' | 'CURRENT_LINKED_STATIC';
  state_scope: 'STATE_SPECIFIC' | 'INDIA_GENERAL' | 'INTERNATIONAL';

  core_concept_target: string;
  answerable_fact_family: string;

  source_requirement: string;

  visual_requirement: boolean;
  visual_type?: BlueprintVisualType;

  current_affairs_window?: CurrentAffairsWindow;

  pyq_relationship: PYQRelationshipType;

  future_relevance: 'HIGH' | 'MEDIUM' | 'LOW';

  avoid_fact_fingerprints: string[];
  avoid_question_fingerprints: string[];
  avoid_archetype_patterns: string[];

  target_answer_position: 'A' | 'B' | 'C' | 'D';

  distractor_strategy?: string;
  language_requirement?: string;

  reason_for_inclusion: string;
  evidence_basis: string;

  auditor_overridden?: boolean;
  override_reason?: string;

  status: 'DRAFT' | 'READY' | 'LOCKED';
}

export interface BlueprintAuditCheckResult {
  check_name: string;
  pass: boolean;
  severity: 'CRITICAL' | 'WARN' | 'INFO';
  message: string;
  details?: string;
}

export interface BlueprintAuditResult {
  overall_status: 'PASS' | 'WARN' | 'FAIL';

  pattern_score: number; // 0 - 100
  syllabus_score: number; // 0 - 100
  historical_alignment_score: number; // 0 - 100
  diversity_score: number; // 0 - 100
  non_repeat_score: number; // 0 - 100
  format_realism_score: number; // 0 - 100
  difficulty_alignment_score: number; // 0 - 100
  current_relevance_score: number; // 0 - 100
  source_readiness_score: number; // 0 - 100
  total_score: number; // 0 - 100

  check_results: Record<string, BlueprintAuditCheckResult>;
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

export interface MockBlueprintRecord {
  blueprint_id: string;
  exam_id: string;
  exam_version_id: string;
  recruitment_cycle: string;
  series_id: string;
  preparation_mode?: PreparationMode;
  preparation_basis_id?: string;
  data_provenance?: DataProvenance;
  generation_provenance?: GenerationProvenance;
  research_provenance?: ResearchProvenance;
  mock_number: number;
  test_mode: TestMode;
  subject_id?: string;
  topic_id?: string;
  language: string;
  question_count: number;
  total_marks: number;
  negative_marking: number;
  duration_minutes: number;
  current_affairs_cutoff: string;
  target_exam_date?: string | null;
  preparation_as_of_date?: string;
  current_affairs_mode?: 'OFFICIAL_EXAM_CUTOFF' | 'PREPARATION_CURRENT_AFFAIRS' | 'HISTORICAL_PRACTICE';
  status: BlueprintStatus;
  blueprint_version: number;
  created_at: string;
  updated_at: string;
  locked_at?: string;
  locked_by?: string;
  superseded_by?: string;

  allow_cross_mode_reuse: boolean;

  slots: BlueprintQuestionSlot[];

  allocation_summary: {
    sections: Array<{ section_name: string; count: number; official_count: number }>;
    subjects: Array<{
      subject: string;
      count: number;
      official_weight_pct?: number;
      pyq_observed_pct?: number;
      target_weight_pct: number;
      rationale?: string;
    }>;
    topics: Array<{
      topic: string;
      subject: string;
      count: number;
      tag?: string;
      relevance_score?: number;
    }>;
    difficulties: { easy_count: number; moderate_count: number; difficult_count: number };
    cognitive: { recall: number; understand: number; apply: number; analyse: number; multi_step: number };
    formats: Array<{ format: string; count: number }>;
    static_current: { static_count: number; current_count: number; linked_count: number };
    state_scope: { state_count: number; india_count: number; international_count: number };
    visual_count: number;
    answer_positions: { A: number; B: number; C: number; D: number };
    pyq_relationships: Record<string, number>;
  };

  audit_result?: BlueprintAuditResult;

  series_ledger_preview?: {
    existing_final_mocks: number;
    questions_used: number;
    unique_facts_used: number;
    fact_families_planned: number;
    blocked_duplicates: number;
    uniqueness_pressure: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
    pressure_details?: string;
  };

  pyq_intelligence_status: 'SUFFICIENT' | 'HIGH_CONFIDENCE' | 'LIMITED' | 'NO_PYQ_DATA';
  preparation_basis?: PreparationBasis;
  notes?: string;
}

export interface BlueprintAuditLog {
  audit_id: string;
  log_id?: string;
  blueprint_id: string;
  blueprint_version: number;
  slot_id?: string;
  slot_number?: number;
  question_number?: number;
  action?: string;
  field_name?: string;
  field_changed?: string;
  old_value?: any;
  new_value?: any;
  reason: string;
  auditor: string;
  auditor_name?: string;
  timestamp: string;
}

export type BlueprintAuditLogEntry = BlueprintAuditLog;

export interface CreateBlueprintInput {
  exam_id: string;
  test_mode: TestMode;
  subject_id?: string;
  topic_id?: string;
  custom_params?: {
    question_count?: number;
    subjects?: string[];
    topics?: string[];
    difficulty_preference?: 'BALANCED' | 'HARDER' | 'FOUNDATIONAL';
    language?: string;
    current_affairs_cutoff?: string;
    current_affairs_months?: number;
    target_exam_date?: string | null;
    preparation_as_of_date?: string;
    current_affairs_mode?: 'OFFICIAL_EXAM_CUTOFF' | 'PREPARATION_CURRENT_AFFAIRS' | 'HISTORICAL_PRACTICE';
  };
  allow_cross_mode_reuse?: boolean;
  preparation_mode?: PreparationMode;
}

// ==========================================
// 8. MODEL CAPABILITY TIERS & COST TELEMETRY
// ==========================================

export type ModelCapabilityTier = 'QUALITY_TIER' | 'ECONOMY_TIER';

export type ModelTierFallbackPolicy =
  | 'STOP_AND_REPORT'
  | 'ALLOW_ECONOMY_FALLBACK_WITH_STRICT_AUDIT';

export interface ModelPricingConfig {
  model_id: string;
  tier: ModelCapabilityTier;
  cost_per_million_input_tokens: number;
  cost_per_million_output_tokens: number;
  cost_per_million_thinking_tokens?: number;
  cost_per_thousand_search_queries?: number;
  free_tier_daily_request_limit?: number;
}

export interface ModelCostTelemetry {
  model_id: string;
  tier: ModelCapabilityTier;
  is_free_tier: boolean;
  actual_billed_cost: number;
  estimated_paid_tier_equivalent_cost: number;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
  search_queries: number;
  pricing_version: string;
  retrieved_at: string;
}

// ==========================================
// 9. STANDARDIZED DUPLICATE LAYER DEFINITIONS
// ==========================================

export type StandardDuplicateLayerId =
  | 'LAYER_1_CANONICAL_HASH'
  | 'LAYER_2_LEXICAL_JACCARD'
  | 'LAYER_3_ONTOLOGY_SEMANTIC'
  | 'LAYER_4_CORE_ANSWERABLE_FACT'
  | 'LAYER_5_STRUCTURAL_TEMPLATE';

export const STANDARDIZED_DUPLICATE_LAYERS = {
  LAYER_1: {
    id: 'LAYER_1_CANONICAL_HASH' as const,
    name: 'Canonical Hash',
    description: 'Exact SHA-256 canonical hash collision'
  },
  LAYER_2: {
    id: 'LAYER_2_LEXICAL_JACCARD' as const,
    name: 'Lexical Similarity / Jaccard',
    description: 'Lexical n-gram and token set Jaccard similarity'
  },
  LAYER_3: {
    id: 'LAYER_3_ONTOLOGY_SEMANTIC' as const,
    name: 'Ontology-Based Semantic Similarity',
    description: 'Domain concept ontology and synonym-mapped semantic cosine similarity (not neural embeddings unless embedding model is explicitly enabled)'
  },
  LAYER_4: {
    id: 'LAYER_4_CORE_ANSWERABLE_FACT' as const,
    name: 'Core Answerable Fact',
    description: 'Core answerable fact representation, property tested, and temporal relationship'
  },
  LAYER_5: {
    id: 'LAYER_5_STRUCTURAL_TEMPLATE' as const,
    name: 'Structural / Template Similarity',
    description: 'Structural problem template and numerical signature similarity'
  }
} as const;

// ==========================================
// 10. PERSISTENCE ARCHITECTURE & SUPABASE SCHEMA TYPES
// ==========================================

export interface DatabaseHealthStatus {
  healthy: boolean;
  environment: ExecutionEnvironment;
  backend: PersistenceBackend;
  schema_exists: boolean;
  tables_checked: number;
  tables_missing: string[];
  rpc_available: boolean;
  buckets_checked: number;
  buckets_missing: string[];
  read_write_verified: boolean;
  latency_ms?: number;
  error?: string;
}

export interface StorageHealthStatus {
  healthy: boolean;
  buckets_accessible: string[];
  upload_download_verified: boolean;
  hash_verified: boolean;
  cleanup_verified: boolean;
  error?: string;
}

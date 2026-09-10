-- ============================================================================
-- GOVEXAM RESEARCH ENGINE: PRODUCTION PERSISTENCE SCHEMA
-- Dedicated Schema: govexam
-- Version: 20260908000000
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS govexam;

-- ============================================================================
-- 1. EXAMS & PATTERN VERSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS govexam.exams (
    exam_id text PRIMARY KEY,
    title text NOT NULL,
    authority text,
    state text,
    exam_level text,
    stage_tier text,
    paper text,
    active_exam_version_id text,
    exam_profile_status text DEFAULT 'NEW',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS govexam.exam_pattern_versions (
    exam_pattern_version_id text PRIMARY KEY,
    exam_id text NOT NULL REFERENCES govexam.exams(exam_id) ON DELETE RESTRICT,
    recruitment_cycle text NOT NULL,
    notification_number text,
    notification_date date,
    effective_date date,
    question_count integer NOT NULL,
    marks numeric NOT NULL,
    duration_minutes integer NOT NULL,
    negative_marking numeric,
    language_rules jsonb,
    section_structure jsonb,
    syllabus_version_id text,
    verification_status text DEFAULT 'UNVERIFIED',
    data_provenance text NOT NULL DEFAULT 'RETRIEVED_OFFICIAL',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS govexam.exam_fact_verifications (
    verification_id text PRIMARY KEY,
    exam_id text NOT NULL REFERENCES govexam.exams(exam_id) ON DELETE CASCADE,
    exam_pattern_version_id text REFERENCES govexam.exam_pattern_versions(exam_pattern_version_id) ON DELETE SET NULL,
    fact_name text NOT NULL,
    fact_value jsonb,
    source_id text,
    document_id text,
    evidence_text text,
    evidence_locator text,
    verification_status text NOT NULL DEFAULT 'UNVERIFIED',
    confidence numeric DEFAULT 0,
    applicable_cycle text,
    verified_by text,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_fact_exam_id ON govexam.exam_fact_verifications(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_fact_pattern_id ON govexam.exam_fact_verifications(exam_pattern_version_id);
CREATE INDEX IF NOT EXISTS idx_exam_fact_name ON govexam.exam_fact_verifications(fact_name);
CREATE INDEX IF NOT EXISTS idx_exam_fact_status ON govexam.exam_fact_verifications(verification_status);

-- ============================================================================
-- 2. PREPARATION BASIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS govexam.preparation_bases (
    preparation_basis_id text PRIMARY KEY,
    exam_id text NOT NULL REFERENCES govexam.exams(exam_id) ON DELETE RESTRICT,
    preparation_mode text NOT NULL,
    historical_exam_version_id text,
    recruitment_cycle text NOT NULL,
    notification_number text,
    syllabus_version_id text,
    pattern_version_id text,
    pyq_intelligence_version_id text,
    future_notification_availability text NOT NULL DEFAULT 'UNKNOWN',
    pattern_change_risk text NOT NULL DEFAULT 'UNKNOWN',
    confidence numeric NOT NULL DEFAULT 0,
    status text NOT NULL,
    basis_summary text,
    risk_reasons jsonb,
    source_references jsonb,
    last_verified_at timestamptz,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prep_basis_exam_mode ON govexam.preparation_bases(exam_id, preparation_mode);

-- ============================================================================
-- 3. SOURCE REGISTRY & DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS govexam.sources (
    source_id text PRIMARY KEY,
    exam_id text REFERENCES govexam.exams(exam_id) ON DELETE SET NULL,
    authority_name text,
    source_type text,
    source_level text,
    title text NOT NULL,
    source_url text,
    official_domain text,
    publication_date date,
    retrieved_at timestamptz NOT NULL DEFAULT now(),
    last_verified_at timestamptz,
    verification_status text NOT NULL DEFAULT 'UNVERIFIED',
    research_provenance text NOT NULL DEFAULT 'LIVE_DIRECT_WEB',
    data_provenance text NOT NULL DEFAULT 'RETRIEVED_OFFICIAL',
    content_hash text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_source_content_hash ON govexam.sources(content_hash) WHERE content_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS govexam.source_documents (
    document_id text PRIMARY KEY,
    source_id text REFERENCES govexam.sources(source_id) ON DELETE SET NULL,
    exam_id text REFERENCES govexam.exams(exam_id) ON DELETE SET NULL,
    document_type text NOT NULL,
    title text NOT NULL,
    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    original_url text,
    mime_type text DEFAULT 'application/pdf',
    file_size bigint DEFAULT 0,
    page_count integer,
    content_hash text NOT NULL,
    language text DEFAULT 'en',
    publication_date date,
    retrieved_at timestamptz NOT NULL DEFAULT now(),
    extraction_status text DEFAULT 'PENDING',
    verification_status text DEFAULT 'UNVERIFIED',
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_doc_content_hash ON govexam.source_documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_doc_exam_id ON govexam.source_documents(exam_id);

-- ============================================================================
-- 4. PREVIOUS PAPERS & PYQ QUESTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS govexam.previous_papers (
    paper_id text PRIMARY KEY,
    exam_id text NOT NULL REFERENCES govexam.exams(exam_id) ON DELETE RESTRICT,
    exam_pattern_version_id text REFERENCES govexam.exam_pattern_versions(exam_pattern_version_id) ON DELETE SET NULL,
    recruitment_cycle text NOT NULL,
    year integer NOT NULL,
    exam_date date,
    stage text,
    paper_name text NOT NULL,
    paper_number text,
    shift text,
    booklet_code text,
    language text DEFAULT 'en',
    question_count integer NOT NULL,
    marks numeric NOT NULL,
    duration_minutes integer NOT NULL,
    source_id text REFERENCES govexam.sources(source_id) ON DELETE SET NULL,
    document_id text REFERENCES govexam.source_documents(document_id) ON DELETE SET NULL,
    official_status text NOT NULL DEFAULT 'OFFICIAL',
    answer_key_document_id text,
    final_answer_key_document_id text,
    content_hash text,
    data_provenance text NOT NULL DEFAULT 'RETRIEVED_OFFICIAL',
    extraction_status text DEFAULT 'PENDING',
    analysis_status text DEFAULT 'PENDING',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS govexam.pyq_questions (
    pyq_question_id text PRIMARY KEY,
    paper_id text NOT NULL REFERENCES govexam.previous_papers(paper_id) ON DELETE CASCADE,
    question_number integer NOT NULL,
    question_en text NOT NULL,
    option_a_en text NOT NULL,
    option_b_en text NOT NULL,
    option_c_en text NOT NULL,
    option_d_en text NOT NULL,
    question_local text,
    option_a_local text,
    option_b_local text,
    option_c_local text,
    option_d_local text,
    correct_answer text,
    answer_verification_status text DEFAULT 'PROVISIONAL',
    subject text,
    topic text,
    subtopic text,
    microtopic text,
    question_type text,
    question_archetype text,
    difficulty text,
    cognitive_level text,
    static_current text,
    state_scope text,
    core_concept text,
    core_answerable_fact text,
    core_fact_representation jsonb,
    semantic_fingerprint jsonb,
    structural_fingerprint jsonb,
    source_page integer,
    answer_key_source_page integer,
    visual_metadata jsonb,
    data_provenance text NOT NULL DEFAULT 'RETRIEVED_OFFICIAL',
    analysis_status text DEFAULT 'PENDING',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_pyq_paper_question_num UNIQUE (paper_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_pyq_paper_id ON govexam.pyq_questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_pyq_subject ON govexam.pyq_questions(subject);
CREATE INDEX IF NOT EXISTS idx_pyq_topic ON govexam.pyq_questions(topic);
CREATE INDEX IF NOT EXISTS idx_pyq_subtopic ON govexam.pyq_questions(subtopic);
CREATE INDEX IF NOT EXISTS idx_pyq_type ON govexam.pyq_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_pyq_core_concept ON govexam.pyq_questions(core_concept);

CREATE TABLE IF NOT EXISTS govexam.pyq_analysis_runs (
    run_id text PRIMARY KEY,
    paper_id text NOT NULL REFERENCES govexam.previous_papers(paper_id) ON DELETE CASCADE,
    model text NOT NULL,
    status text NOT NULL,
    questions_processed integer NOT NULL DEFAULT 0,
    questions_failed integer NOT NULL DEFAULT 0,
    token_usage jsonb,
    cost_telemetry jsonb,
    analysis_schema_version text DEFAULT '2026-v1',
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    audit_information jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS govexam.pyq_question_analysis (
    analysis_id text PRIMARY KEY,
    run_id text NOT NULL REFERENCES govexam.pyq_analysis_runs(run_id) ON DELETE CASCADE,
    pyq_question_id text NOT NULL REFERENCES govexam.pyq_questions(pyq_question_id) ON DELETE CASCADE,
    analysis_result jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. EXAM INTELLIGENCE PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS govexam.exam_intelligence_profiles (
    intelligence_profile_id text PRIMARY KEY,
    exam_id text NOT NULL REFERENCES govexam.exams(exam_id) ON DELETE RESTRICT,
    exam_pattern_version_id text REFERENCES govexam.exam_pattern_versions(exam_pattern_version_id) ON DELETE SET NULL,
    recruitment_cycle text NOT NULL,
    papers_analysed integer NOT NULL DEFAULT 0,
    questions_analysed integer NOT NULL DEFAULT 0,
    profile_version integer NOT NULL DEFAULT 1,
    subject_distribution jsonb,
    topic_distribution jsonb,
    subtopic_distribution jsonb,
    question_format_distribution jsonb,
    difficulty_distribution jsonb,
    cognitive_distribution jsonb,
    static_current_distribution jsonb,
    state_scope_distribution jsonb,
    distractor_profile jsonb,
    answer_position_distribution jsonb,
    trend_analysis jsonb,
    adjacent_testable_concepts jsonb,
    current_affairs_profile jsonb,
    confidence numeric DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intel_exam_version ON govexam.exam_intelligence_profiles(exam_id, profile_version);

-- ============================================================================
-- 6. MOCK SERIES, BLUEPRINTS & SLOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS govexam.mock_series (
    series_id text PRIMARY KEY,
    exam_id text NOT NULL REFERENCES govexam.exams(exam_id) ON DELETE RESTRICT,
    preparation_basis_id text NOT NULL REFERENCES govexam.preparation_bases(preparation_basis_id) ON DELETE RESTRICT,
    preparation_mode text NOT NULL,
    test_mode text NOT NULL,
    subject_id text,
    topic_id text,
    allow_cross_mode_reuse boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS govexam.blueprints (
    blueprint_id text PRIMARY KEY,
    exam_id text NOT NULL REFERENCES govexam.exams(exam_id) ON DELETE RESTRICT,
    exam_pattern_version_id text REFERENCES govexam.exam_pattern_versions(exam_pattern_version_id) ON DELETE SET NULL,
    preparation_basis_id text NOT NULL REFERENCES govexam.preparation_bases(preparation_basis_id) ON DELETE RESTRICT,
    series_id text NOT NULL REFERENCES govexam.mock_series(series_id) ON DELETE RESTRICT,
    mock_number integer NOT NULL,
    test_mode text NOT NULL,
    language text DEFAULT 'en',
    question_count integer NOT NULL,
    total_marks numeric NOT NULL,
    duration_minutes integer NOT NULL,
    negative_marking numeric NOT NULL,
    current_affairs_cutoff date,
    preparation_as_of_date date,
    current_affairs_mode text DEFAULT 'PREPARATION_CURRENT_AFFAIRS',
    status text NOT NULL DEFAULT 'DRAFT',
    blueprint_version integer NOT NULL DEFAULT 1,
    audit_result jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    locked_at timestamptz
);

CREATE TABLE IF NOT EXISTS govexam.blueprint_slots (
    slot_id text PRIMARY KEY,
    blueprint_id text NOT NULL REFERENCES govexam.blueprints(blueprint_id) ON DELETE CASCADE,
    question_number integer NOT NULL,
    subject text NOT NULL,
    topic text NOT NULL,
    subtopic text,
    microtopic text,
    question_type text,
    question_archetype text,
    difficulty text,
    cognitive_level text,
    static_current text,
    state_scope text,
    core_concept_target text,
    answerable_fact_family text,
    source_requirement jsonb,
    visual_requirement boolean NOT NULL DEFAULT false,
    visual_type text,
    current_affairs_window jsonb,
    pyq_relationship text,
    future_relevance text,
    target_answer_position text,
    reason_for_inclusion text,
    evidence_basis jsonb,
    status text NOT NULL DEFAULT 'READY',
    CONSTRAINT uq_blueprint_slot_num UNIQUE (blueprint_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_slot_blueprint ON govexam.blueprint_slots(blueprint_id);

-- ============================================================================
-- 7. MOCKS, QUESTIONS & QUESTION AUDITS
-- ============================================================================

CREATE TABLE IF NOT EXISTS govexam.mocks (
    mock_id text PRIMARY KEY,
    series_id text NOT NULL REFERENCES govexam.mock_series(series_id) ON DELETE RESTRICT,
    exam_id text NOT NULL REFERENCES govexam.exams(exam_id) ON DELETE RESTRICT,
    preparation_basis_id text NOT NULL REFERENCES govexam.preparation_bases(preparation_basis_id) ON DELETE RESTRICT,
    exam_pattern_version_id text REFERENCES govexam.exam_pattern_versions(exam_pattern_version_id) ON DELETE SET NULL,
    blueprint_id text NOT NULL REFERENCES govexam.blueprints(blueprint_id) ON DELETE RESTRICT,
    blueprint_version integer NOT NULL DEFAULT 1,
    mock_number integer NOT NULL,
    preparation_mode text NOT NULL,
    test_mode text NOT NULL,
    language text DEFAULT 'en',
    question_count integer NOT NULL,
    total_marks numeric NOT NULL,
    negative_marking numeric NOT NULL,
    duration_minutes integer NOT NULL,
    current_affairs_cutoff date,
    preparation_as_of_date date,
    status text NOT NULL DEFAULT 'DRAFT',
    generation_status text DEFAULT 'GENERATION_SUCCESS',
    quality_audit_status text DEFAULT 'NOT_AUDITED',
    generation_model_summary jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    finalized_at timestamptz,
    auditor_id text,
    audit_signature jsonb,
    CONSTRAINT uq_mock_series_mock_num UNIQUE (series_id, mock_number)
);

CREATE TABLE IF NOT EXISTS govexam.mock_questions (
    mock_question_id text PRIMARY KEY,
    mock_id text NOT NULL REFERENCES govexam.mocks(mock_id) ON DELETE CASCADE,
    blueprint_id text REFERENCES govexam.blueprints(blueprint_id) ON DELETE SET NULL,
    slot_id text REFERENCES govexam.blueprint_slots(slot_id) ON DELETE SET NULL,
    question_number integer NOT NULL,
    question_en text NOT NULL,
    option_a_en text NOT NULL,
    option_b_en text NOT NULL,
    option_c_en text NOT NULL,
    option_d_en text NOT NULL,
    question_local text,
    option_a_local text,
    option_b_local text,
    option_c_local text,
    option_d_local text,
    correct_answer text NOT NULL,
    explanation_en text NOT NULL,
    explanation_local text,
    subject text NOT NULL,
    topic text NOT NULL,
    subtopic text,
    microtopic text,
    question_type text,
    question_archetype text,
    difficulty text,
    cognitive_level text,
    core_concept text,
    core_answerable_fact text,
    core_fact_representation jsonb,
    generation_provenance text NOT NULL DEFAULT 'LIVE_GEMINI',
    generation_model_id text,
    generation_run_id text,
    semantic_fingerprint jsonb,
    structural_fingerprint jsonb,
    source_reference_ids jsonb,
    primary_source_id text,
    fact_verified_at timestamptz,
    candidate_status text NOT NULL DEFAULT 'ACCEPTED',
    repair_count integer NOT NULL DEFAULT 0,
    replacement_count integer NOT NULL DEFAULT 0,
    option_quality_audit jsonb,
    question_quality_audit jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_mock_question_num UNIQUE (mock_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_mock_q_mock_id ON govexam.mock_questions(mock_id);
CREATE INDEX IF NOT EXISTS idx_mock_q_slot_id ON govexam.mock_questions(slot_id);

CREATE TABLE IF NOT EXISTS govexam.question_audits (
    question_audit_id text PRIMARY KEY,
    mock_question_id text NOT NULL REFERENCES govexam.mock_questions(mock_question_id) ON DELETE CASCADE,
    validation_run_id text,
    structure_status text,
    blueprint_alignment text,
    answer_status text,
    one_best_answer_status text,
    fact_status text,
    source_status text,
    option_symmetry_status text,
    distractor_score numeric,
    difficulty_alignment text,
    cognitive_alignment text,
    duplicate_status text,
    pyq_copy_status text,
    language_status text,
    visual_status text,
    critical_blockers jsonb,
    overall_status text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. DUPLICATE LEDGER (PERMANENT POST-FINALIZATION COMMIT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS govexam.duplicate_ledger (
    ledger_entry_id text PRIMARY KEY,
    series_id text NOT NULL REFERENCES govexam.mock_series(series_id) ON DELETE RESTRICT,
    mock_id text NOT NULL REFERENCES govexam.mocks(mock_id) ON DELETE RESTRICT,
    mock_question_id text NOT NULL REFERENCES govexam.mock_questions(mock_question_id) ON DELETE RESTRICT,
    canonical_hash text NOT NULL,
    normalized_text text NOT NULL,
    subject text NOT NULL,
    topic text NOT NULL,
    subtopic text,
    core_concept text,
    core_answerable_fact text,
    core_fact_representation jsonb,
    semantic_fingerprint jsonb,
    structural_fingerprint jsonb,
    question_archetype text,
    time_scope text,
    dataset_identifier text,
    passage_identifier text,
    committed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_series ON govexam.duplicate_ledger(series_id);
CREATE INDEX IF NOT EXISTS idx_ledger_subject ON govexam.duplicate_ledger(subject);
CREATE INDEX IF NOT EXISTS idx_ledger_topic ON govexam.duplicate_ledger(topic);
CREATE INDEX IF NOT EXISTS idx_ledger_hash ON govexam.duplicate_ledger(canonical_hash);
CREATE INDEX IF NOT EXISTS idx_ledger_core_concept ON govexam.duplicate_ledger(core_concept);

-- ============================================================================
-- 9. RESEARCH RUNS, AUDIT LOGS & AI COST TELEMETRY
-- ============================================================================

CREATE TABLE IF NOT EXISTS govexam.research_runs (
    run_id text PRIMARY KEY,
    exam_id text NOT NULL REFERENCES govexam.exams(exam_id) ON DELETE RESTRICT,
    research_mode text NOT NULL,
    status text NOT NULL,
    research_provenance text NOT NULL DEFAULT 'LIVE_DIRECT_WEB',
    pages_visited integer NOT NULL DEFAULT 0,
    documents_processed integer NOT NULL DEFAULT 0,
    official_sources_found integer NOT NULL DEFAULT 0,
    search_grounding_calls integer NOT NULL DEFAULT 0,
    research_gaps jsonb,
    conflicts jsonb,
    model_usage jsonb,
    token_usage jsonb,
    cost_telemetry jsonb,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS govexam.audit_logs (
    audit_id text PRIMARY KEY,
    audit_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    actor_id text,
    old_value jsonb,
    new_value jsonb,
    reason text NOT NULL,
    source_reference text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON govexam.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON govexam.audit_logs(audit_type);
CREATE INDEX IF NOT EXISTS idx_audit_created ON govexam.audit_logs(created_at);

CREATE TABLE IF NOT EXISTS govexam.ai_usage (
    usage_id text PRIMARY KEY,
    research_run_id text,
    generation_run_id text,
    mock_id text,
    model_id text NOT NULL,
    model_tier text NOT NULL,
    input_tokens integer NOT NULL DEFAULT 0,
    output_tokens integer NOT NULL DEFAULT 0,
    thinking_tokens integer NOT NULL DEFAULT 0,
    search_queries integer NOT NULL DEFAULT 0,
    api_requests integer NOT NULL DEFAULT 1,
    actual_billed_cost numeric NOT NULL DEFAULT 0,
    paid_tier_equivalent_cost numeric NOT NULL DEFAULT 0,
    pricing_version text NOT NULL DEFAULT '2026-03-v1',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. ATOMIC MOCK FINALIZATION POSTGRES FUNCTION (RPC)
-- ============================================================================

CREATE OR REPLACE FUNCTION govexam.finalize_mock(
    p_mock_id text,
    p_auditor_id text DEFAULT 'Auditor',
    p_audit_notes text DEFAULT 'Mock test verified and finalized.'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mock govexam.mocks%ROWTYPE;
    v_unaccepted_count integer;
    v_questions_count integer;
    v_ledger_inserted integer := 0;
BEGIN
    -- 1. Row-lock mock record
    SELECT * INTO v_mock
    FROM govexam.mocks
    WHERE mock_id = p_mock_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'MOCK_NOT_FOUND: Mock % does not exist', p_mock_id;
    END IF;

    IF v_mock.status = 'FINAL' THEN
        RAISE EXCEPTION 'MOCK_ALREADY_FINAL: Mock % is already in FINAL state', p_mock_id;
    END IF;

    -- 2. Verify all questions are ACCEPTED
    SELECT count(*), count(*) FILTER (WHERE candidate_status <> 'ACCEPTED')
    INTO v_questions_count, v_unaccepted_count
    FROM govexam.mock_questions
    WHERE mock_id = p_mock_id;

    IF v_questions_count = 0 THEN
        RAISE EXCEPTION 'MOCK_HAS_NO_QUESTIONS: Mock % has 0 questions', p_mock_id;
    END IF;

    IF v_unaccepted_count > 0 THEN
        RAISE EXCEPTION 'MOCK_HAS_UNACCEPTED_QUESTIONS: Mock % contains % questions not marked ACCEPTED', p_mock_id, v_unaccepted_count;
    END IF;

    -- 3. Verify quality audit is passed
    IF v_mock.quality_audit_status <> 'PASSED' THEN
        RAISE EXCEPTION 'QUALITY_AUDIT_NOT_PASSED: Mock % quality audit is %', p_mock_id, v_mock.quality_audit_status;
    END IF;

    -- 4. Transition mock state to FINAL
    UPDATE govexam.mocks
    SET status = 'FINAL',
        finalized_at = now(),
        auditor_id = p_auditor_id,
        audit_signature = jsonb_build_object('signed_at', now(), 'notes', p_audit_notes, 'auditor_id', p_auditor_id)
    WHERE mock_id = p_mock_id;

    -- 5. Atomically insert all questions into permanent duplicate ledger
    INSERT INTO govexam.duplicate_ledger (
        ledger_entry_id,
        series_id,
        mock_id,
        mock_question_id,
        canonical_hash,
        normalized_text,
        subject,
        topic,
        subtopic,
        core_concept,
        core_answerable_fact,
        core_fact_representation,
        semantic_fingerprint,
        structural_fingerprint,
        question_archetype,
        committed_at
    )
    SELECT
        'ledg_' || substr(md5(random()::text || q.mock_question_id), 1, 16),
        v_mock.series_id,
        v_mock.mock_id,
        q.mock_question_id,
        substr(md5(lower(regexp_replace(q.question_en, '[^a-zA-Z0-9]', '', 'g'))), 1, 16),
        lower(regexp_replace(q.question_en, '[^a-zA-Z0-9 ]', '', 'g')),
        q.subject,
        q.topic,
        q.subtopic,
        q.core_concept,
        q.core_answerable_fact,
        q.core_fact_representation,
        q.semantic_fingerprint,
        q.structural_fingerprint,
        q.question_archetype,
        now()
    FROM govexam.mock_questions q
    WHERE q.mock_id = p_mock_id
      AND q.generation_provenance NOT IN ('TEST_SYNTHESIS', 'DEMO_SYNTHESIS');

    GET DIAGNOSTICS v_ledger_inserted = ROW_COUNT;

    -- 6. Append audit log record
    INSERT INTO govexam.audit_logs (
        audit_id,
        audit_type,
        entity_type,
        entity_id,
        actor_id,
        reason,
        metadata
    ) VALUES (
        'audit_fin_' || substr(md5(random()::text || p_mock_id), 1, 16),
        'MOCK_FINALIZATION_AUDIT',
        'MOCK',
        p_mock_id,
        p_auditor_id,
        p_audit_notes,
        jsonb_build_object(
            'series_id', v_mock.series_id,
            'questions_committed', v_ledger_inserted,
            'finalized_at', now()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'mock_id', p_mock_id,
        'status', 'FINAL',
        'questions_committed', v_ledger_inserted
    );
END;
$$;

-- ============================================================================
-- 11. ROW LEVEL SECURITY (SERVER ADMIN CLIENT PRIVILEGES)
-- ============================================================================

ALTER TABLE govexam.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.exam_pattern_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.exam_fact_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.preparation_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.previous_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.pyq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.pyq_analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.pyq_question_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.exam_intelligence_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.mock_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.blueprint_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.mocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.mock_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.question_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.duplicate_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.research_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE govexam.ai_usage ENABLE ROW LEVEL SECURITY;

-- Allow server service_role full administrative access across all tables
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'govexam'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS service_role_all ON govexam.%I;', tbl);
        EXECUTE format('CREATE POLICY service_role_all ON govexam.%I TO service_role USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;

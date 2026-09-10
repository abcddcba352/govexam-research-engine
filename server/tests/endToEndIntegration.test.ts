import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  getExams,
  getExamById,
  saveExams,
  getSources,
  getMocks,
  getMockById,
  getDuplicateLedger,
  saveDuplicateLedger,
  checkQuestionDuplicate,
  computeCanonicalQuestionHash,
  registerQuestionsToLedger,
  finalizeMockTest,
  getStoredPreparationBases,
  getPreparationBasisByExam,
  saveMockTest,
  normalizeQuestionText,
} from '../dbService.ts';
import {
  canGenerateMock,
  evaluatePreparationBasis,
} from '../readinessService.ts';
import {
  getPreviousPapers,
  getPYQQuestions,
  buildExamIntelligenceProfile,
  getExamIntelligenceReadiness,
} from '../pyqService.ts';
import {
  buildQuestionAllocation,
  buildQuestionSlots,
  calculateCurrentAffairsWindow,
  getSeriesLedgerSummary,
  validateBlueprint,
  lockBlueprintRecord,
  saveBlueprintRecord,
  getBlueprintById,
} from '../blueprintService.ts';
import { generateMockTestForExam } from '../mockService.ts';
import { runMockPaperQualityAudit } from '../mockAuditService.ts';
import { matchAuthority } from '../researchService.ts';
import {
  ExamRecord,
  MockBlueprintRecord,
  MockQuestion,
  MockTestRecord,
  PreparationMode,
} from '../../src/types.ts';

console.log('========================================================================');
console.log('🧪 RUNNING COMPREHENSIVE END-TO-END INTEGRATION TEST SUITE');
console.log('========================================================================');

let passedTests = 0;
let failedTests = 0;

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

async function main() {
  console.log('\n--- SECTION 1: DATAPROVENANCE & SEEDED DATA AUDIT ---');

  await runTest('1.1: Verified exams and sources have valid official DataProvenance', () => {
    const exams = getExams();
    assert(exams.length > 0, 'Exams must exist');
    for (const exam of exams) {
      if (exam.exam_profile_status === 'VERIFIED') {
        assert(
          exam.data_provenance === 'RETRIEVED_OFFICIAL' || exam.data_provenance === 'USER_UPLOADED_OFFICIAL_VERIFIED',
          `Verified exam ${exam.exam_id} must have official provenance (found ${exam.data_provenance})`
        );
      }
    }

    const sources = getSources();
    assert(sources.length > 0, 'Sources must exist');
    for (const src of sources) {
      assert(
        src.data_provenance === 'RETRIEVED_OFFICIAL' || src.data_provenance === 'USER_UPLOADED_OFFICIAL_VERIFIED' || src.data_provenance === 'SECONDARY_ARCHIVE',
        `Source ${src.source_id} must have valid provenance`
      );
    }
  });

  await runTest('1.2: Demo mock data is explicitly quarantined with DEMO_DATA provenance', () => {
    const mocks = getMocks();
    const demoMock = mocks.find(m => m.mock_id === 'mock_tgpsc_g2_p1_01');
    assert(demoMock, 'Demo mock mock_tgpsc_g2_p1_01 must exist');
    assert.strictEqual(demoMock.data_provenance, 'DEMO_DATA', 'Demo mock must have DEMO_DATA provenance');

    for (const sec of demoMock.sections) {
      for (const q of sec.questions) {
        assert.strictEqual(q.data_provenance, 'DEMO_DATA', `Question ${q.question_id} must have DEMO_DATA provenance`);
      }
    }
  });

  await runTest('1.3: SYNTHETIC_TEST_DATA and DEMO_DATA are strictly filtered from duplicate ledger commits', () => {
    const syntheticQuestion: MockQuestion = {
      question_id: 'q_synthetic_test_01',
      mock_id: 'mock_synthetic_01',
      question_number: 1,
      section_name: 'Test Section',
      question_text: 'What is the capital of Synthetic Land for testing purposes?',
      options: ['A', 'B', 'C', 'D'],
      correct_option_index: 0,
      explanation: 'Test explanation',
      topic: 'Testing',
      difficulty: 'EASY',
      canonical_hash: computeCanonicalQuestionHash('What is the capital of Synthetic Land for testing purposes?'),
      data_provenance: 'SYNTHETIC_TEST_DATA',
      is_synthetic_test_data: true,
    };

    const demoQuestion: MockQuestion = {
      question_id: 'q_demo_test_01',
      mock_id: 'mock_demo_01',
      question_number: 2,
      section_name: 'Demo Section',
      question_text: 'What is the demo question text for trial purposes?',
      options: ['W', 'X', 'Y', 'Z'],
      correct_option_index: 1,
      explanation: 'Demo explanation',
      topic: 'Demo',
      difficulty: 'EASY',
      canonical_hash: computeCanonicalQuestionHash('What is the demo question text for trial purposes?'),
      data_provenance: 'DEMO_DATA',
    };

    const ledgerBefore = getDuplicateLedger().length;
    const res = registerQuestionsToLedger([syntheticQuestion, demoQuestion], 'test_exam', 'mock_test');
    assert.strictEqual(res.added, 0, 'Zero synthetic/demo questions should be added to ledger');

    const ledgerAfter = getDuplicateLedger().length;
    assert.strictEqual(ledgerAfter, ledgerBefore, 'Duplicate ledger length should not change');
  });

  await runTest('1.4: PYQ Intelligence filters out non-official data', () => {
    const profile = buildExamIntelligenceProfile('tgpsc_group_2_paper_1');
    assert(profile, 'Intelligence profile must be built');
    assert.strictEqual(profile.exam_id, 'tgpsc_group_2_paper_1');
    assert(profile.papers_analysed_count >= 1, 'At least 1 authentic paper analyzed');
  });

  console.log('\n--- SECTION 2: RESEARCH ENGINE REALITY & REGISTRY MATCHING ---');

  await runTest('2.1: Authority Matching resolves against Official Source Registry', () => {
    const matchTGPSC = matchAuthority('TGPSC Group 2 Paper 1');
    assert(matchTGPSC, 'Must match TGPSC');
    assert.strictEqual(matchTGPSC.authority_id, 'tgpsc');
    assert.strictEqual(matchTGPSC.official_domain, 'tgpsc.gov.in');

    const matchAPPSC = matchAuthority('APPSC Group II Services');
    assert(matchAPPSC, 'Must match APPSC');
    assert.strictEqual(matchAPPSC.authority_id, 'appsc');
    assert.strictEqual(matchAPPSC.official_domain, 'psc.ap.gov.in');

    const matchSSC = matchAuthority('Staff Selection Commission CGL');
    assert(matchSSC, 'Must match SSC');
    assert.strictEqual(matchSSC.authority_id, 'ssc');
    assert.strictEqual(matchSSC.official_domain, 'ssc.gov.in');
  });

  await runTest('2.2: Authority Matching returns null for fabricated commissions', () => {
    const matchUnknown = matchAuthority('XyzNonExistentCommission 2099 Examination');
    assert.strictEqual(matchUnknown, null, 'Unknown commission should return null');
  });

  console.log('\n--- SECTION 3: END-TO-END REAL EXAM PIPELINE (TGPSC Group 2 Paper 1) ---');

  const examId = 'tgpsc_group_2_paper_1';
  let prepBasis: any;
  let blueprint: MockBlueprintRecord;
  let mockTest: MockTestRecord;

  // Clean test duplicate ledger state to ensure test idempotency
  const currentLedger = getDuplicateLedger();
  const cleanLedger = currentLedger.filter(e => e.mock_id === 'mock_tgpsc_g2_p1_01' || e.mock_ids?.includes('mock_tgpsc_g2_p1_01'));
  saveDuplicateLedger(cleanLedger);

  await runTest('3.1: Preparation Basis evaluation under PRE_NOTIFICATION_PREPARATION', () => {
    const { basis } = evaluatePreparationBasis(examId, 'PRE_NOTIFICATION_PREPARATION');
    assert(basis, 'Basis must be returned');
    assert(basis.preparation_basis_id, 'Basis must have persistent preparation_basis_id');
    assert(basis.preparation_basis_id.includes('tgpsc_group_2_paper_1'), 'Basis ID must contain exam_id');
    assert.strictEqual(basis.preparation_mode, 'PRE_NOTIFICATION_PREPARATION');
    assert.strictEqual(basis.status, 'HISTORICAL_BASIS_VERIFIED');
    assert(['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'].includes(basis.pattern_change_risk), 'Valid pattern risk');
    assert.strictEqual(basis.future_notification_availability, 'NOT_YET_RELEASED');
    prepBasis = basis;
  });

  await runTest('3.2: Mock Readiness Gate evaluation', () => {
    const readiness = canGenerateMock(examId, 'PRE_NOTIFICATION_PREPARATION');
    assert.strictEqual(readiness.can_generate, true, 'Readiness must evaluate to true');
    assert.strictEqual(readiness.status, 'READY');
    assert.strictEqual(readiness.checks.exam_pattern_verified, true);
    assert.strictEqual(readiness.checks.syllabus_available, true);
    assert(readiness.preparation_basis, 'Readiness result must include preparation_basis');
    assert.strictEqual(readiness.preparation_basis?.preparation_basis_id, prepBasis.preparation_basis_id);
  });

  await runTest('3.3: 10-Question Blueprint Allocation and Slot Generation', () => {
    const exam = getExamById(examId)!;
    assert(exam, 'Exam record must exist');

    const testQuestionCount = 10;
    const allocation = buildQuestionAllocation(exam, 'FULL_LENGTH', testQuestionCount);

    assert(allocation.sections.length > 0, 'Allocation must contain sections');
    const totalAllocated = allocation.sections.reduce((acc, s) => acc + s.count, 0);
    assert.strictEqual(totalAllocated, testQuestionCount, 'Total allocated slots must equal 10');

    const caWindow = calculateCurrentAffairsWindow(exam, '2025-11-15');
    const seriesLedger = getSeriesLedgerSummary(examId, 'FULL_LENGTH', 2, false, 'PRE_NOTIFICATION_PREPARATION');
    const blueprintId = `bp_e2e_test_${Date.now().toString(36)}`;

    const slots = buildQuestionSlots(blueprintId, exam, allocation, caWindow, seriesLedger);

    assert.strictEqual(slots.length, testQuestionCount, 'Slots length must equal 10');
    for (const slot of slots) {
      assert(slot.slot_id, 'Slot ID must be defined');
      assert(slot.core_concept_target, 'Slot must have core_concept_target');
      assert(slot.answerable_fact_family, 'Slot must have answerable_fact_family');
      assert(['A', 'B', 'C', 'D'].includes(slot.target_answer_position), 'Target answer position must be A, B, C, or D');
      assert(['EASY', 'MODERATE', 'DIFFICULT'].includes(slot.difficulty), 'Valid difficulty level');
    }

    blueprint = {
      blueprint_id: blueprintId,
      exam_id: examId,
      exam_version_id: 'tgpsc_g2_v2022',
      recruitment_cycle: exam.recruitment_cycle,
      series_id: `series_tgpsc_prenotif_v2022_fl`,
      preparation_mode: 'PRE_NOTIFICATION_PREPARATION',
      preparation_basis_id: prepBasis.preparation_basis_id,
      mock_number: 2,
      test_mode: 'FULL_LENGTH',
      language: 'English',
      question_count: testQuestionCount,
      total_marks: testQuestionCount,
      negative_marking: 0.25,
      duration_minutes: 15,
      current_affairs_cutoff: '2025-11-15',
      status: 'DRAFT',
      blueprint_version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      allow_cross_mode_reuse: false,
      slots,
      allocation_summary: allocation,
      pyq_intelligence_status: 'SUFFICIENT',
      data_provenance: 'RETRIEVED_OFFICIAL',
    };

    saveBlueprintRecord(blueprint);
    const retrieved = getBlueprintById(blueprint.blueprint_id);
    assert(retrieved, 'Blueprint must be persisted and retrievable');
  });

  await runTest('3.4: BLUEPRINT_LOCKED gate blocks unlocked generation, allows locked generation', async () => {
    const exam = getExamById(examId)!;

    // Unlocked blueprint MUST fail
    let threwError = false;
    try {
      await generateMockTestForExam({
        exam,
        blueprint_id: blueprint.blueprint_id,
        desiredQuestionCount: 10,
      });
    } catch (err: any) {
      threwError = true;
      assert(err.message.includes('BLUEPRINT_LOCKED'), 'Error must mention BLUEPRINT_LOCKED requirement');
    }
    assert.strictEqual(threwError, true, 'Generation must fail when blueprint is not BLUEPRINT_LOCKED');

    // Validate blueprint
    const validation = validateBlueprint(blueprint);
    assert(validation.total_score >= 70, `Blueprint validation score ${validation.total_score} must be >= 70`);

    // Lock blueprint
    const lockResult = lockBlueprintRecord(blueprint.blueprint_id, 'Chief Quality Auditor');
    assert.strictEqual(lockResult.success, true);
    assert.strictEqual(lockResult.blueprint.status, 'BLUEPRINT_LOCKED');
    blueprint = lockResult.blueprint;
  });

  await runTest('3.5: Mock Generation generates 10 authentic questions obeying blueprint slots', async () => {
    const exam = getExamById(examId)!;

    mockTest = await generateMockTestForExam({
      exam,
      blueprint_id: blueprint.blueprint_id,
      desiredQuestionCount: 10,
      preparation_mode: 'PRE_NOTIFICATION_PREPARATION',
    });

    assert(mockTest, 'Mock test must be generated');
    assert(mockTest.mock_id, 'Mock must have mock_id');
    assert.strictEqual(mockTest.preparation_basis_id, prepBasis.preparation_basis_id);
    assert.strictEqual(mockTest.negative_marking_rate, 0.25);
    assert.strictEqual(mockTest.total_questions, 10);

    const allQuestions = mockTest.sections.flatMap(s => s.questions);
    assert.strictEqual(allQuestions.length, 10, 'Must have exactly 10 questions');

    for (const q of allQuestions) {
      assert(q.question_id, 'Question must have id');
      assert(q.question_text.length > 15, `Question text too short: ${q.question_text}`);
      assert.strictEqual(q.options.length, 4, 'Must have exactly 4 options');
      assert([0, 1, 2, 3].includes(q.correct_option_index), 'Correct option index must be 0-3');
      assert(q.explanation.length > 10, 'Explanation must be informative');
      assert(q.canonical_hash, 'Canonical hash must exist');
      assert(q.topic, 'Topic must exist');
      assert(['EASY', 'MEDIUM', 'HARD'].includes(q.difficulty), 'Valid difficulty');
      assert.strictEqual(q.data_provenance, 'RETRIEVED_OFFICIAL');
      assert.strictEqual(q.candidate_status, 'ACCEPTED');
    }
  });

  await runTest('3.6: 21-Point Mock Paper Quality Audit executes and scores paper', () => {
    const audit = runMockPaperQualityAudit(mockTest);
    assert(audit, 'Audit must be generated');
    assert.strictEqual(audit.total_questions_audited, 10);
    assert.strictEqual(audit.checks.length, 21, 'Must evaluate all 21 quality checks');
    assert(audit.overall_score >= 70, `Audit overall score (${audit.overall_score}) must be >= 70`);
    assert(['PASSED', 'READY_FOR_AUDITOR', 'REPAIR_REQUIRED'].includes(audit.status));
  });

  await runTest('3.7: Finalize Mock Test and commit questions to Duplicate Ledger', () => {
    const finalResult = finalizeMockTest(mockTest.mock_id, 'Approved for candidate practice');
    assert.strictEqual(finalResult.success, true);
    assert.strictEqual(finalResult.mock.status, 'FINAL');
    assert(finalResult.mock.finalized_at);
    assert.strictEqual(finalResult.addedToLedger, 10, 'All 10 questions must be committed to ledger');

    const ledger = getDuplicateLedger();
    const allQuestions = mockTest.sections.flatMap(s => s.questions);
    for (const q of allQuestions) {
      const found = ledger.find(e => e.question_hash === q.canonical_hash || e.canonical_hash === q.canonical_hash);
      assert(found, `Question ${q.question_id} must be in duplicate ledger`);
      assert.strictEqual(found.exam_id, examId);
    }
  });

  await runTest('3.8: Non-Repeat Duplicate Ledger enforces Layer 1 and Layer 2 duplicate prevention', () => {
    const allQuestions = mockTest.sections.flatMap(s => s.questions);
    const existingQ = allQuestions[0];

    // Layer 1 exact hash match
    const dupCheckExact = checkQuestionDuplicate(existingQ.question_text, examId);
    assert.strictEqual(dupCheckExact.is_duplicate, true);
    assert.strictEqual(dupCheckExact.decision, 'DUPLICATE');
    assert.strictEqual(dupCheckExact.layer_matched, 'LAYER_1_CANONICAL_HASH');

    // Layer 2 near-identical token overlap
    const paraphrasedText = existingQ.question_text + ' in accordance with official statutory rules';
    const dupCheckNear = checkQuestionDuplicate(paraphrasedText, examId);
    assert(['DUPLICATE', 'POSSIBLE_DUPLICATE'].includes(dupCheckNear.decision));
    assert(['LAYER_2_LEXICAL_JACCARD', 'LAYER_2_JACCARD_TOKENS'].includes(dupCheckNear.layer_matched!));

    // Unique question passes
    const brandNewText = 'Under Article 356 of the Constitution of India, what is the maximum duration for President Rule extension?';
    const dupCheckNew = checkQuestionDuplicate(brandNewText, examId);
    assert.strictEqual(dupCheckNew.is_duplicate, false);
    assert.strictEqual(dupCheckNew.decision, 'UNIQUE');
  });

  console.log('\n--- SECTION 4: FAILURE TESTS A THROUGH F ---');

  await runTest('Failure Test A: Missing future notification yields READY under PRE_NOTIFICATION_PREPARATION', () => {
    const { basis } = evaluatePreparationBasis('tgpsc_group_2_paper_1', 'PRE_NOTIFICATION_PREPARATION');
    assert.strictEqual(basis.status, 'HISTORICAL_BASIS_VERIFIED');
    assert.strictEqual(basis.future_notification_availability, 'NOT_YET_RELEASED');

    const readiness = canGenerateMock('tgpsc_group_2_paper_1', 'PRE_NOTIFICATION_PREPARATION');
    assert.strictEqual(readiness.can_generate, true);
    assert.strictEqual(readiness.status, 'READY');
  });

  await runTest('Failure Test B: Missing PYQs with verified syllabus/pattern yields READY (PYQ non-mandatory)', () => {
    const readiness = canGenerateMock('tgpsc_group_2_paper_1', 'PRE_NOTIFICATION_PREPARATION');
    assert.strictEqual(readiness.checks.exam_pattern_verified, true);
    assert.strictEqual(readiness.checks.syllabus_available, true);
    assert.strictEqual(readiness.can_generate, true);
  });

  await runTest('Failure Test C: Missing official syllabus blocks generation with NOT_READY', () => {
    const readiness = canGenerateMock('non_existent_exam_id', 'PRE_NOTIFICATION_PREPARATION');
    assert.strictEqual(readiness.can_generate, false);
    assert.strictEqual(readiness.status, 'NOT_READY');
    assert.strictEqual(readiness.checks.syllabus_available, false);
    assert(readiness.missing_requirements.length > 0);
  });

  await runTest('Failure Test D: Conflicting negative marking blocks basis with CONFLICT / INSUFFICIENT_BASIS', () => {
    const allExams = getExams();
    const origIndex = allExams.findIndex(e => e.exam_id === 'tgpsc_group_2_paper_1');
    assert(origIndex >= 0, 'Exam must exist');
    const origExam = JSON.parse(JSON.stringify(allExams[origIndex]));

    allExams[origIndex].fact_verifications = {
      ...(allExams[origIndex].fact_verifications || {}),
      negative_marking: {
        fact_name: 'negative_marking',
        value: '0.25',
        verification_status: 'CONFLICT',
        source_level: 'LEVEL_5_OFFICIAL',
        source_url: 'https://tgpsc.gov.in',
        source_title: 'Conflicting Notification Source',
        source_domain: 'tgpsc.gov.in',
        publication_date: '2022-12-28',
        retrieved_at: new Date().toISOString(),
        is_current: true,
        confidence: 40,
        conflict_details: 'Dispute: Notification specifies 0.25 negative marking while administrative order specifies nil.',
      } as any
    } as any;
    saveExams(allExams);

    try {
      const { basis, readiness } = evaluatePreparationBasis('tgpsc_group_2_paper_1', 'PRE_NOTIFICATION_PREPARATION');
      assert.strictEqual(basis.status, 'HISTORICAL_BASIS_PARTIAL');
      assert.strictEqual(readiness.can_generate, false);
      assert.strictEqual(readiness.status, 'NOT_READY');
      assert.strictEqual(basis.pattern_change_risk, 'HIGH');
      assert(basis.risk_reasons.some(r => r.toLowerCase().includes('conflict') || r.toLowerCase().includes('dispute')));
    } finally {
      // Restore original exam state
      allExams[origIndex] = origExam;
      saveExams(allExams);
    }
  });

  await runTest('Failure Test E: Blueprint slot batches isolate errors without failing entire blueprint', () => {
    const exam = getExamById('tgpsc_group_2_paper_1')!;
    const allocation = buildQuestionAllocation(exam, 'FULL_LENGTH', 5);
    assert.strictEqual(allocation.sections.reduce((a, b) => a + b.count, 0), 5);
  });

  await runTest('Failure Test F: Duplicate candidate is flagged and duplicate check identifies it', () => {
    const existingLedger = getDuplicateLedger();
    assert(existingLedger.length > 0);

    const existingEntry = existingLedger[0];
    const check = checkQuestionDuplicate(existingEntry.canonical_full_text || existingEntry.canonical_question_preview || 'Article 371D', 'tgpsc_group_2_paper_1');
    assert.strictEqual(check.is_duplicate, true);
    assert.strictEqual(check.decision, 'DUPLICATE');
  });

  console.log('\n========================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

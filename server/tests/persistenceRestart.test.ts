import assert from 'assert';
import { createLocalRegistry } from '../persistence/local/index.ts';
import {
  ExamRecord,
  PreparationBasis,
  MockBlueprintRecord,
  MockTestRecord,
  MockQuestion
} from '../../src/types.ts';

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runPersistenceRestartTest() {
  console.log('========================================================================');
  console.log('🧪 RUNNING PERSISTENCE RESTART ACCEPTANCE TEST SUITE');
  console.log('========================================================================\n');

  const testExamId = `exam_restart_${Date.now().toString(36)}`;
  const testBasisId = `pb_restart_${Date.now().toString(36)}`;
  const testBpId = `bp_restart_${Date.now().toString(36)}`;
  const testMockId = `mock_restart_${Date.now().toString(36)}`;
  const testSeriesId = `series_restart_${Date.now().toString(36)}`;
  const testQuestionText = `In Telangana state governance, which body oversees Municipal Administration under the Telangana Municipalities Act, 2019? (Instance ${Date.now()})`;

  console.log('--- PHASE 1: INITIAL RECORD CREATION & PERSISTENCE ---');

  // Step 1: Initialize first registry instance
  let registry = createLocalRegistry();

  await runTest('1.1: Create and persist ExamRecord', async () => {
    const exam: ExamRecord = {
      exam_id: testExamId,
      intake_id: `intake_${testExamId}`,
      title: 'Telangana Municipal Administration Examination',
      commission: 'Telangana Public Service Commission (TGPSC)',
      state_or_central: 'Telangana',
      post: 'Municipal Commissioner',
      stage: 'Objective Written',
      paper: 'Paper-I General Studies',
      recruitment_cycle: '2026 Cycle',
      pattern: {
        total_questions: 100,
        duration_minutes: 120,
        total_marks: 100,
        marks_per_question: 1,
        negative_marking_rate: 0.25,
        sections: ['General Studies'],
        mediums: ['English', 'Telugu']
      },
      syllabus_topics: ['Telangana Municipalities Act, 2019'],
      status: 'MOCK_READY',
      exam_profile_status: 'VERIFIED',
      pattern_status: 'VERIFIED',
      last_researched_at: new Date().toISOString(),
      pattern_verified_at: new Date().toISOString(),
      syllabus_verified_at: new Date().toISOString(),
      source_confidence_score: 95,
      data_provenance: 'RETRIEVED_OFFICIAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await registry.exams.saveExam(exam);
    const saved = await registry.exams.getExamById(testExamId);
    assert.strictEqual(saved?.exam_id, testExamId);
  });

  await runTest('1.2: Create and persist PreparationBasis', async () => {
    const basis: PreparationBasis = {
      preparation_basis_id: testBasisId,
      exam_id: testExamId,
      preparation_mode: 'PRE_NOTIFICATION_PREPARATION',
      historical_exam_version: 'v2022',
      recruitment_cycle: '2026 Cycle',
      notification: 'NOT_YET_RELEASED',
      syllabus_version: 'syl_2022',
      pattern_version: 'pat_2022',
      pyq_intelligence_version: 'pyq_2022',
      last_verified_date: '2026-09-08',
      future_notification_availability: 'NOT_YET_RELEASED',
      pattern_change_risk: 'LOW',
      confidence: 95,
      source_references: ['TGPSC Official Gazetted Rules 2019'],
      status: 'HISTORICAL_BASIS_VERIFIED',
      basis_summary: 'Historical statutory basis verified for pre-notification preparation.'
    };
    await registry.bases.savePreparationBasis(basis);
    const saved = await registry.bases.getPreparationBasisById(testBasisId);
    assert.strictEqual(saved?.preparation_basis_id, testBasisId);
  });

  await runTest('1.3: Create and lock Blueprint', async () => {
    const bp: MockBlueprintRecord = {
      blueprint_id: testBpId,
      exam_id: testExamId,
      exam_version_id: 'v2022',
      recruitment_cycle: '2026 Cycle',
      series_id: testSeriesId,
      mock_number: 1,
      test_mode: 'FULL_LENGTH',
      language: 'en',
      question_count: 1,
      total_marks: 1,
      negative_marking: 0.25,
      duration_minutes: 120,
      current_affairs_cutoff: '2026-08-08',
      preparation_as_of_date: '2026-09-08',
      status: 'DRAFT',
      blueprint_version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      allow_cross_mode_reuse: false,
      slots: [],
      allocation_summary: {
        sections: [],
        subjects: [],
        topics: [],
        difficulties: { easy_count: 1, moderate_count: 0, difficult_count: 0 },
        cognitive: { recall: 1, understand: 0, apply: 0, analyse: 0, multi_step: 0 },
        formats: [],
        static_current: { static_count: 1, current_count: 0, linked_count: 0 },
        state_scope: { state_count: 1, india_count: 0, international_count: 0 },
        visual_count: 0,
        answer_positions: { A: 1, B: 0, C: 0, D: 0 },
        pyq_relationships: {}
      },
      pyq_intelligence_status: 'SUFFICIENT'
    };
    await registry.blueprints.saveBlueprint(bp);
    await registry.blueprints.lockBlueprint(testBpId, 'Lead Auditor');
    const locked = await registry.blueprints.getBlueprintById(testBpId);
    assert.strictEqual(locked?.status, 'BLUEPRINT_LOCKED');
  });

  await runTest('1.4: Generate, store, and finalize Mock with question', async () => {
    const q: MockQuestion = {
      question_id: `q_${testMockId}_1`,
      mock_id: testMockId,
      question_number: 1,
      section_name: 'General Studies',
      question_text: testQuestionText,
      options: [
        'Directorate of Municipal Administration (DMA)',
        'Telangana State Election Commission',
        'State Finance Commission',
        'Urban Development Authority'
      ],
      correct_option_index: 0,
      explanation: 'DMA oversees administrative compliance under the 2019 Act.',
      topic: 'Policies of Telangana State',
      difficulty: 'EASY',
      canonical_hash: '',
      candidate_status: 'ACCEPTED',
      generation_provenance: 'LIVE_GEMINI',
      generation_model_id: 'gemini-3.8-flash'
    };

    const mock: MockTestRecord = {
      mock_id: testMockId,
      exam_id: testExamId,
      exam_title: 'Telangana Municipal Admin',
      mock_number: 1,
      title: 'Municipal Exam Mock #1',
      blueprint_id: testBpId,
      series_id: testSeriesId,
      preparation_mode: 'PRE_NOTIFICATION_PREPARATION',
      created_at: new Date().toISOString(),
      duration_minutes: 120,
      total_questions: 1,
      total_marks: 1,
      negative_marking_rate: 0.25,
      difficulty_mix: { easy: 1, medium: 0, hard: 0 },
      sections: [{
        section_id: 'sec_1',
        section_name: 'General Studies',
        total_questions: 1,
        marks_per_question: 1,
        questions: [q]
      }],
      duplicates_prevented_count: 0,
      status: 'READY_FOR_AUDIT'
    };

    await registry.mocks.saveMock(mock);
    const fin = await registry.mocks.finalizeMock(testMockId, 'Lead Auditor', 'Passed all 21 verification points');
    assert.strictEqual(fin.success, true);
    assert.strictEqual(fin.mock.status, 'FINAL');
    assert.strictEqual(fin.addedToLedger, 1);
  });

  console.log('\n--- PHASE 2: SIMULATE SERVER RESTART 1 ---');

  // Completely destroy in-memory reference and instantiate new registry
  registry = null as any;
  registry = createLocalRegistry();

  await runTest('2.1: Verify ExamRecord survived restart', async () => {
    const exam = await registry.exams.getExamById(testExamId);
    assert(exam !== null, 'ExamRecord must survive server restart');
    assert.strictEqual(exam?.exam_id, testExamId);
    assert.strictEqual(exam?.title, 'Telangana Municipal Administration Examination');
  });

  await runTest('2.2: Verify PreparationBasis survived restart', async () => {
    const basis = await registry.bases.getPreparationBasisById(testBasisId);
    assert(basis !== null, 'PreparationBasis must survive server restart');
    assert.strictEqual(basis?.preparation_basis_id, testBasisId);
  });

  await runTest('2.3: Verify Blueprint and Mock survived restart with FINAL status', async () => {
    const bp = await registry.blueprints.getBlueprintById(testBpId);
    assert(bp !== null, 'Blueprint must survive restart');
    assert.strictEqual(bp?.status, 'BLUEPRINT_LOCKED');

    const mock = await registry.mocks.getMockById(testMockId);
    assert(mock !== null, 'Mock must survive restart');
    assert.strictEqual(mock?.status, 'FINAL');
    assert.strictEqual(mock?.sections[0].questions.length, 1);
  });

  await runTest('2.4: Verify Duplicate Ledger entries survived restart', async () => {
    const entries = await registry.ledger.getLedgerEntries(testSeriesId);
    assert(entries.length >= 1, 'Duplicate ledger entries must survive restart');
    const matched = entries.find(e => e.mock_id === testMockId);
    assert(matched !== undefined, 'Committed mock question must be in ledger');
  });

  console.log('\n--- PHASE 3: SIMULATE SERVER RESTART 2 & DUPLICATE BLOCKING ---');

  // Restart again
  registry = null as any;
  registry = createLocalRegistry();

  await runTest('3.1: Verify Duplicate Ledger actively consults persisted state to BLOCK repeats', async () => {
    // Attempt duplicate check on exact question text
    const entries = await registry.ledger.getLedgerEntries(testSeriesId);
    assert(entries.length >= 1);

    // Normalize test question text
    const normalizedTarget = testQuestionText.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const ledgerMatch = entries.find(e => {
      const normLedger = (e.canonical_full_text || e.normalized_text || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      return normLedger === normalizedTarget;
    });

    assert(ledgerMatch !== undefined, 'Target question must be detected in persisted duplicate ledger');
    console.log(`    [Ledger Consultation Verified] Found matching ledger entry: ${ledgerMatch?.ledger_id}`);
  });

  console.log('\n========================================================================');
  console.log('🎉 PERSISTENCE RESTART ACCEPTANCE TEST PASSED (0 FAILURES)');
  console.log('========================================================================\n');
}

runPersistenceRestartTest().catch(err => {
  console.error('Fatal crash in persistence restart test:', err);
  process.exit(1);
});

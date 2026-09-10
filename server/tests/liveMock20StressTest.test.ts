import assert from 'assert';
import {
  getExamById,
  finalizeMockTest,
  getDuplicateLedger,
  saveDuplicateLedger,
  getMockById,
  computeCanonicalQuestionHash
} from '../dbService.ts';
import {
  buildQuestionAllocation,
  buildQuestionSlots,
  calculateCurrentAffairsWindow,
  getSeriesLedgerSummary,
  saveBlueprintRecord,
  lockBlueprintRecord,
  getBlueprintById
} from '../blueprintService.ts';
import { generateMockTestForExam } from '../mockService.ts';
import {
  runMultiLayerDuplicateCheck,
  analyzeOptionSymmetry
} from '../questionValidationService.ts';
import { MockTestRecord, MockQuestion, MockBlueprintRecord } from '../../src/types.ts';

let passedCount = 0;
let failedCount = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedCount++;
  }
}

async function main() {
  console.log('========================================================================');
  console.log('🧪 RUNNING 20-QUESTION PRODUCTION MOCK & DUPLICATE STRESS TEST');
  console.log('========================================================================\n');

  const examId = 'tgpsc_group_2_paper_1';
  const exam = getExamById(examId)!;
  assert(exam, 'Exam must exist');

  const initialLedger = [...getDuplicateLedger()];
  // Reset ledger to base official PYQ entries for clean stress run
  const baseLedger = initialLedger.filter(e => !e.mock_id || e.ledger_id.startsWith('led_00'));
  saveDuplicateLedger(baseLedger);

  let blueprint20: MockBlueprintRecord;
  let mock1: MockTestRecord;

  try {
  await runTest('Phase 1: Allocate & Lock 20-Question Blueprint', () => {
    const allocation = buildQuestionAllocation(exam, 'FULL_LENGTH', 20);
    const caWindow = calculateCurrentAffairsWindow(exam, '2025-11-15');
    const seriesLedger = getSeriesLedgerSummary(examId, 'FULL_LENGTH', 1, false, 'PRE_NOTIFICATION_PREPARATION');
    const blueprintId = `bp_stress_20q_${Date.now().toString(36)}`;
    const slots = buildQuestionSlots(blueprintId, exam, allocation, caWindow, seriesLedger);

    const bpRecord: MockBlueprintRecord = {
      blueprint_id: blueprintId,
      exam_id: examId,
      exam_version_id: 'v2024_01',
      recruitment_cycle: exam.recruitment_cycle,
      series_id: 'series_tgpsc_g2_prenotif_v1_full',
      preparation_mode: 'PRE_NOTIFICATION_PREPARATION',
      mock_number: 1,
      test_mode: 'FULL_LENGTH',
      language: 'English',
      question_count: 20,
      total_marks: 20,
      negative_marking: 0.25,
      duration_minutes: 150,
      current_affairs_cutoff: '2025-10-31',
      status: 'ALLOCATING',
      blueprint_version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      allow_cross_mode_reuse: false,
      pyq_intelligence_status: 'HIGH_CONFIDENCE',
      slots,
      allocation_summary: allocation,
    };

    saveBlueprintRecord(bpRecord);

    const lockResult = lockBlueprintRecord(bpRecord.blueprint_id, 'Chief Lead Validator');
    assert.strictEqual(lockResult.success, true);
    assert.strictEqual(lockResult.blueprint.status, 'BLUEPRINT_LOCKED');
    blueprint20 = lockResult.blueprint;
  });

  await runTest('Phase 2: Generate Mock 1 (20 Questions) with full symmetry & duplicate checks', async () => {
    mock1 = await generateMockTestForExam({
      exam,
      blueprint_id: blueprint20.blueprint_id,
      desiredQuestionCount: 20,
      preparation_mode: 'PRE_NOTIFICATION_PREPARATION'
    });

    assert(mock1, 'Mock 1 generated');
    assert.strictEqual(mock1.total_questions, 20);

    const allQ = mock1.sections.flatMap(s => s.questions);
    assert.strictEqual(allQ.length, 20);

    // All questions must be ACCEPTED with no answer leaks
    for (const q of allQ) {
      assert.strictEqual(q.candidate_status, 'ACCEPTED');
      assert(q.option_quality_audit, 'Must have option quality audit');
      assert.notStrictEqual(q.symmetry_status, 'ANSWER_LEAK', `Question #${q.question_number} must not leak answer`);
      assert(q.generation_provenance, 'Must track generation provenance');
      assert(q.research_provenance, 'Must track research provenance');
    }
  });

  await runTest('Phase 3: Finalize Mock 1 and commit 20 questions to Duplicate Ledger', () => {
    const finalRes = finalizeMockTest(mock1.mock_id, 'Auditor signoff for 20-question production mock');
    assert.strictEqual(finalRes.success, true);
    assert.strictEqual(finalRes.mock.status, 'FINAL');
    assert.strictEqual(finalRes.mock.duplicate_layers_status, 'ALL_APPLICABLE_DUPLICATE_LAYERS_EXECUTED_AND_PASSED');
    assert.strictEqual(finalRes.addedToLedger, 20, 'All 20 questions committed to ledger');

    const ledger = getDuplicateLedger();
    const allQ = mock1.sections.flatMap(s => s.questions);
    for (const q of allQ) {
      const entry = ledger.find(e => e.canonical_hash === q.canonical_hash || e.question_hash === q.canonical_hash);
      assert(entry, `Question #${q.question_number} must be in ledger`);
      assert.strictEqual(entry.mock_id, mock1.mock_id);
    }
  });

  await runTest('Phase 4: Mock 2 Duplicate Stress Test — Layer 1 Collision blocked', () => {
    const allQ = mock1.sections.flatMap(s => s.questions);
    const candidateQ: MockQuestion = {
      ...allQ[0],
      question_id: 'q_mock2_dup1',
      mock_id: 'mock_2'
    };

    const res = runMultiLayerDuplicateCheck(candidateQ, blueprint20.slots[0], examId, []);
    assert.strictEqual(res.decision, 'DUPLICATE');
    assert.strictEqual(res.layer, 'LAYER_1_CANONICAL_HASH');
    assert.strictEqual(res.scope_matched, 'SAME_MOCK_SERIES');
  });

  await runTest('Phase 5: Mock 2 Duplicate Stress Test — Layer 2 Lexical Paraphrase blocked', () => {
    const allQ = mock1.sections.flatMap(s => s.questions);
    const originalText = allQ[1].question_text;
    const paraphrased = originalText.includes('prescribed statutory')
      ? originalText.replace('prescribed statutory', 'statutory prescribed')
      : (originalText.endsWith('?') ? originalText.slice(0, -1) + ' exactly?' : originalText + ' exactly');

    const candidateQ: MockQuestion = {
      ...allQ[1],
      question_id: 'q_mock2_dup2',
      mock_id: 'mock_2',
      question_text: paraphrased,
      canonical_hash: computeCanonicalQuestionHash(paraphrased)
    };

    const res = runMultiLayerDuplicateCheck(candidateQ, blueprint20.slots[1], examId, []);
    assert(
      res.decision === 'DUPLICATE' || res.decision === 'POSSIBLE_DUPLICATE',
      `Expected DUPLICATE or POSSIBLE_DUPLICATE, got ${res.decision}`
    );
    assert.strictEqual(res.layer, 'LAYER_2_JACCARD_TOKENS');
    assert(res.duplicateScore >= 0.70);
  });

  await runTest('Phase 6: Mock 2 Duplicate Stress Test — Layer 4 Core Fact Repeat blocked', () => {
    const allQ = mock1.sections.flatMap(s => s.questions);
    const targetSlot = blueprint20.slots[2];

    // Completely novel phrasing asking the exact same core answerable fact
    const novelPhrasing = `In the context of ${targetSlot.topic}, which specific provision was mandated for ${targetSlot.answerable_fact_family}?`;
    const candidateQ: MockQuestion = {
      ...allQ[2],
      question_id: 'q_mock2_dup4',
      mock_id: 'mock_2',
      question_text: novelPhrasing,
      canonical_hash: computeCanonicalQuestionHash(novelPhrasing)
    };

    const res = runMultiLayerDuplicateCheck(candidateQ, targetSlot, examId, []);
    assert(
      res.decision === 'SAME_FACT_REPEAT' || res.decision === 'DUPLICATE',
      `Expected SAME_FACT_REPEAT or DUPLICATE, got ${res.decision}`
    );
  });

  await runTest('Phase 7: Mock 2 Independent Fact in same topic is UNIQUE and passes', () => {
    const targetSlot = blueprint20.slots[3];
    const independentQuestionText = `Under ${targetSlot.topic}, what is the penalty specified for non-compliance with statutory disclosure mandates?`;

    const candidateQ: MockQuestion = {
      question_id: 'q_mock2_unique',
      mock_id: 'mock_2',
      question_number: 4,
      section_name: targetSlot.subject,
      question_text: independentQuestionText,
      options: ['Penalty of Rs 5,000', 'Penalty of Rs 10,000', 'Penalty of Rs 25,000', 'Penalty of Rs 50,000'],
      correct_option_index: 2,
      explanation: 'Statutory non-compliance penalty is Rs 25,000.',
      topic: targetSlot.topic,
      difficulty: 'MEDIUM',
      canonical_hash: computeCanonicalQuestionHash(independentQuestionText),
      core_concept_target: 'Penalty for statutory non-compliance',
      answerable_fact_family: 'Statutory Penalties'
    };

    const res = runMultiLayerDuplicateCheck(candidateQ, targetSlot, examId, []);
    assert.strictEqual(res.decision, 'UNIQUE');
    assert.strictEqual(res.layer, 'CLEAN');
  });
  } finally {
    saveDuplicateLedger(initialLedger);
  }

  console.log('\n========================================================================');
  console.log(`📊 20-QUESTION STRESS TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Stress test runner crashed:', err);
  process.exit(1);
});

import dotenv from 'dotenv';
dotenv.config();

import assert from 'assert';
import { getExamById } from '../dbService.ts';
import {
  buildQuestionAllocation,
  buildQuestionSlots,
  calculateCurrentAffairsWindow,
  getSeriesLedgerSummary,
  saveBlueprintRecord,
  lockBlueprintRecord
} from '../blueprintService.ts';
import { generateMockTestForExam } from '../mockService.ts';
import { MockBlueprintRecord } from '../../src/types.ts';

async function main() {
  console.log('========================================================================');
  console.log('🌟 RUNNING LIVE GEMINI MOCK GENERATION VERIFICATION');
  console.log('========================================================================\n');

  const examId = 'tgpsc_group_2_paper_1';
  const exam = getExamById(examId)!;
  assert(exam, 'Exam must exist');

  console.log(`Exam: ${exam.title} (${exam.exam_id})`);
  const apiKey = process.env.GEMINI_API_KEY || '';
  console.log(`API Key detected: Yes (${apiKey ? apiKey.slice(0, 8) + '...' : 'None'})`);

  const allocation = buildQuestionAllocation(exam, 'FULL_LENGTH', 5);
  const caWindow = calculateCurrentAffairsWindow(exam, '2025-11-15');
  const seriesLedger = getSeriesLedgerSummary(examId, 'FULL_LENGTH', 1, false, 'PRE_NOTIFICATION_PREPARATION');
  const blueprintId = `bp_live_gemini_${Date.now().toString(36)}`;
  const slots = buildQuestionSlots(blueprintId, exam, allocation, caWindow, seriesLedger);

  const bpRecord: MockBlueprintRecord = {
    blueprint_id: blueprintId,
    exam_id: examId,
    exam_version_id: 'v2024_01',
    recruitment_cycle: exam.recruitment_cycle,
    series_id: 'series_tgpsc_g2_live_gemini',
    preparation_mode: 'PRE_NOTIFICATION_PREPARATION',
    mock_number: 1,
    test_mode: 'FULL_LENGTH',
    language: 'English',
    question_count: 5,
    total_marks: 5,
    negative_marking: 0.25,
    duration_minutes: 45,
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
  console.log(`Blueprint locked: ${lockResult.blueprint.blueprint_id}`);

  console.log('\nInvoking live Gemini generation (5 slots with thinking models)...');
  const startTime = Date.now();
  const mockTest = await generateMockTestForExam({
    exam,
    blueprint_id: lockResult.blueprint.blueprint_id,
    desiredQuestionCount: 5,
    preparation_mode: 'PRE_NOTIFICATION_PREPARATION'
  });
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\nMock generated in ${elapsedSec}s! Total questions: ${mockTest.total_questions}`);
  const questions = mockTest.sections.flatMap(s => s.questions);

  for (const q of questions) {
    console.log(`\n--- [Q${q.question_number}] (Provenance: ${q.generation_provenance}) ---`);
    console.log(`Stem: ${q.question_text}`);
    console.log(`Options:`);
    q.options.forEach((opt, idx) => {
      const marker = idx === q.correct_option_index ? ' [CORRECT]' : '';
      console.log(`  ${String.fromCharCode(65 + idx)}. ${opt}${marker}`);
    });
    console.log(`Explanation: ${q.explanation.slice(0, 150)}...`);
    console.log(`Symmetry Status: ${q.symmetry_status}`);
    console.log(`Candidate Status: ${q.candidate_status}`);
    assert.strictEqual(q.generation_provenance, 'LIVE_GEMINI', 'Must be LIVE_GEMINI');
  }

  console.log('\n========================================================================');
  console.log('🎉 LIVE GEMINI VERIFICATION COMPLETED SUCCESSFULLY!');
  console.log('========================================================================');
}

main().catch(err => {
  console.error('Test crashed:', err);
  process.exit(1);
});

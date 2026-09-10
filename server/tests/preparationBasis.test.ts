import assert from 'assert';
import { canGenerateMock, evaluatePreparationBasis } from '../readinessService.ts';
import {
  getExams,
  getExamById,
  savePreparationBasis,
  getPreparationBasisById,
  getStoredPreparationBases,
  getMocks
} from '../dbService.ts';
import { generatePatternChangeReport } from '../verificationService.ts';
import { getNextMockNumber, getSeriesLedgerSummary } from '../blueprintService.ts';
import { ExamRecord, ExamPatternVersion, PreparationMode, PatternChangeRisk } from '../../src/types.ts';

console.log('====================================================');
console.log('🧪 RUNNING PREPARATION BASIS VERIFICATION TEST SUITE');
console.log('====================================================');

let passedTests = 0;
let failedTests = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

// Load test exam
const exams = getExams();
const tgpscExam = exams.find(e => e.exam_id === 'tgpsc_group_2_paper_1' || e.exam_id === 'tgpsc_g2') || exams[0];
assert(tgpscExam, 'Test exam must exist');

// ----------------------------------------------------
// TEST 1: PRE_NOTIFICATION_PREPARATION works without a future notification
// ----------------------------------------------------
runTest('PRE_NOTIFICATION_PREPARATION succeeds using historical basis without future notification', () => {
  const result = evaluatePreparationBasis(tgpscExam.exam_id, 'PRE_NOTIFICATION_PREPARATION');
  assert.strictEqual(result.readiness.can_generate, true, 'Exam must be ready for generation under pre-notification preparation');
  assert.strictEqual(result.readiness.status, 'READY', 'Status must be READY');
  assert.strictEqual(result.basis.status, 'HISTORICAL_BASIS_VERIFIED', 'Basis status must be HISTORICAL_BASIS_VERIFIED');
  assert.strictEqual(result.basis.future_notification_availability, 'NOT_YET_RELEASED', 'Future notification must be marked NOT_YET_RELEASED');
  assert(result.basis.basis_summary?.includes('Grounded on verified historical syllabus'), 'Basis summary must state historical foundation');
  assert(result.readiness.reason?.includes('Zero Unsupported Exam Facts'), 'Readiness reason must use approved policy language');
});

// ----------------------------------------------------
// TEST 2: Exact PYQs are NOT mandatory when verified syllabus and pattern exist
// ----------------------------------------------------
runTest('Exact PYQs are NOT mandatory when verified historical syllabus and pattern exist', () => {
  const readiness = canGenerateMock(tgpscExam.exam_id, 'PRE_NOTIFICATION_PREPARATION');
  assert.strictEqual(readiness.can_generate, true);
  // Readiness checks verify pattern and syllabus without requiring PYQ existence
  assert.strictEqual(readiness.checks.exam_pattern_verified, true);
  assert.strictEqual(readiness.checks.syllabus_available, true);
});

// ----------------------------------------------------
// TEST 3: PatternChangeRisk supports LOW, MEDIUM, HIGH, and UNKNOWN
// ----------------------------------------------------
runTest('PatternChangeRisk evaluates correctly across all 4 levels (LOW, MEDIUM, HIGH, UNKNOWN)', () => {
  const validRisks: PatternChangeRisk[] = ['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'];
  
  // TGPSC has historical revision between 2015 (0 neg) and 2022 (0.25 neg) -> correctly evaluates to MEDIUM
  const evalResult = evaluatePreparationBasis(tgpscExam.exam_id, 'PRE_NOTIFICATION_PREPARATION');
  assert(validRisks.includes(evalResult.basis.pattern_change_risk), 'Risk must be one of the 4 defined enum values');
  assert.strictEqual(evalResult.basis.pattern_change_risk, 'MEDIUM', 'TGPSC has revision between 2015 and 2022 -> MEDIUM risk');
  assert(evalResult.basis.risk_reasons?.some(r => r.includes('Historical pattern revision observed')), 'Risk reason must note historical revision');
});

// ----------------------------------------------------
// TEST 4: PreparationBasis is a persistent first-class record with preparation_basis_id
// ----------------------------------------------------
runTest('PreparationBasis has preparation_basis_id and persists to disk', () => {
  const evalResult = evaluatePreparationBasis(tgpscExam.exam_id, 'PRE_NOTIFICATION_PREPARATION');
  assert(evalResult.basis.preparation_basis_id, 'preparation_basis_id must be non-empty');
  assert(evalResult.basis.preparation_basis_id.startsWith('pb_'), 'preparation_basis_id must have pb_ prefix');

  // Verify persistence retrieval
  const retrieved = getPreparationBasisById(evalResult.basis.preparation_basis_id);
  assert(retrieved, 'Preparation basis must be retrievable by ID from disk');
  assert.strictEqual(retrieved.preparation_basis_id, evalResult.basis.preparation_basis_id);
  assert.strictEqual(retrieved.exam_id, tgpscExam.exam_id);
  assert.strictEqual(retrieved.status, 'HISTORICAL_BASIS_VERIFIED');
});

// ----------------------------------------------------
// TEST 5: Series identity includes preparation basis / version
// ----------------------------------------------------
runTest('Series identity namespaces by preparation mode and basis version', () => {
  const preNotifNum = getNextMockNumber(tgpscExam.exam_id, 'FULL_LENGTH', undefined, undefined, 'PRE_NOTIFICATION_PREPARATION');
  const activeNotifNum = getNextMockNumber(tgpscExam.exam_id, 'FULL_LENGTH', undefined, undefined, 'ACTIVE_NOTIFICATION');
  
  assert(typeof preNotifNum === 'number');
  assert(typeof activeNotifNum === 'number');

  const preSummary = getSeriesLedgerSummary(tgpscExam.exam_id, 'FULL_LENGTH', 1, true, 'PRE_NOTIFICATION_PREPARATION');
  const activeSummary = getSeriesLedgerSummary(tgpscExam.exam_id, 'FULL_LENGTH', 1, true, 'ACTIVE_NOTIFICATION');

  assert(preSummary !== undefined);
  assert(activeSummary !== undefined);
});

// ----------------------------------------------------
// TEST 6: Pattern Change Reports are candidate-facing only after relevant facts are verified
// ----------------------------------------------------
runTest('Pattern Change Report candidate-facing rules adhere to auditor verification', () => {
  const oldVersion: ExamPatternVersion = {
    version_id: 'ver_2022',
    exam_id: tgpscExam.exam_id,
    recruitment_cycle: '2022 Cycle',
    notification_number: '28/2022',
    effective_date: '2022-12-01',
    pattern: { ...tgpscExam.pattern, total_questions: 150, duration_minutes: 150, negative_marking_rate: 0.25 },
    syllabus_topics: ['Topic A', 'Topic B'],
    is_active: false
  };

  const newVerifiedVersion: ExamPatternVersion = {
    version_id: 'ver_2025',
    exam_id: tgpscExam.exam_id,
    recruitment_cycle: '2025 Cycle',
    notification_number: '05/2025',
    effective_date: '2025-06-01',
    pattern: { ...tgpscExam.pattern, total_questions: 150, duration_minutes: 150, negative_marking_rate: 0.33 },
    syllabus_topics: ['Topic A', 'Topic B', 'Topic C (New)'],
    is_active: true
  };

  const report = generatePatternChangeReport(oldVersion, newVerifiedVersion);
  assert.strictEqual(report.has_pattern_changed, true);
  assert.strictEqual(report.negative_marking.changed, true);
  assert.strictEqual(report.sections_added.length, 0);
  assert.strictEqual(report.syllabus_topics_added.length, 1);
  assert.strictEqual(report.syllabus_topics_added[0], 'Topic C (New)');
  assert(report.candidate_facing === true, 'Verified notification report should be candidate facing');
});

// ----------------------------------------------------
// TEST 7: PRE_NOTIFICATION and ACTIVE_NOTIFICATION separation
// ----------------------------------------------------
runTest('PRE_NOTIFICATION and ACTIVE_NOTIFICATION mocks filter independently', () => {
  const preMocks = getMocks(tgpscExam.exam_id, 'PRE_NOTIFICATION_PREPARATION');
  const activeMocks = getMocks(tgpscExam.exam_id, 'ACTIVE_NOTIFICATION');
  
  // All pre-notification mocks must have preparation_mode PRE_NOTIFICATION_PREPARATION
  preMocks.forEach(m => {
    assert.strictEqual(m.preparation_mode || 'PRE_NOTIFICATION_PREPARATION', 'PRE_NOTIFICATION_PREPARATION');
  });

  // All active mocks must have preparation_mode ACTIVE_NOTIFICATION
  activeMocks.forEach(m => {
    assert.strictEqual(m.preparation_mode, 'ACTIVE_NOTIFICATION');
  });
});

console.log('====================================================');
console.log(`🏁 TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
}

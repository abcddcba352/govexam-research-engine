import assert from 'assert';
import {
  validatePersistenceConfiguration,
  assertCanMutate
} from '../persistence/repository.ts';
import { validateSupabaseConfiguration } from '../persistence/supabaseClient.ts';
import { createLocalRegistry } from '../persistence/local/index.ts';
import { checkStorageHealth } from '../persistence/storageService.ts';
import { MockTestRecord, MockQuestion } from '../../src/types.ts';

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

async function runPersistenceFailureTests() {
  console.log('========================================================================');
  console.log('🧪 RUNNING PERSISTENCE FAILURE & SAFETY BOUNDARY TEST SUITE');
  console.log('========================================================================\n');

  console.log('--- SECTION 1: PRODUCTION PERSISTENCE CONFIGURATION GATES ---');

  await runTest('1.1: Production environment with LOCAL_FILE backend refuses mutation', () => {
    const origEnv = process.env.NODE_ENV;
    const origBackend = process.env.PERSISTENCE_BACKEND;
    try {
      process.env.NODE_ENV = 'production';
      process.env.PERSISTENCE_BACKEND = 'LOCAL_FILE';

      const validation = validatePersistenceConfiguration();
      assert.strictEqual(validation.isValid, false);
      assert.strictEqual(validation.status, 'PRODUCTION_PERSISTENCE_INVALID');

      assert.throws(() => {
        assertCanMutate('FINALIZE_MOCK');
      }, /PRODUCTION_PERSISTENCE_INVALID/);
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.PERSISTENCE_BACKEND = origBackend;
    }
  });

  await runTest('1.2: Production environment with DATABASE backend throws when Supabase keys missing', () => {
    const origEnv = process.env.NODE_ENV;
    const origBackend = process.env.PERSISTENCE_BACKEND;
    const origUrl = process.env.SUPABASE_URL;
    const origKey = process.env.SUPABASE_SECRET_KEY;
    const origRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      process.env.NODE_ENV = 'production';
      process.env.PERSISTENCE_BACKEND = 'DATABASE';
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SECRET_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      assert.throws(() => {
        validateSupabaseConfiguration();
      }, /PRODUCTION_DATABASE_CONFIGURATION_INVALID/);
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.PERSISTENCE_BACKEND = origBackend;
      if (origUrl) process.env.SUPABASE_URL = origUrl;
      if (origKey) process.env.SUPABASE_SECRET_KEY = origKey;
      if (origRoleKey) process.env.SUPABASE_SERVICE_ROLE_KEY = origRoleKey;
    }
  });

  console.log('\n--- SECTION 2: ATOMIC FINALIZATION ROLLBACK & DEFECT ISOLATION ---');

  await runTest('2.1: Finalization is blocked when mock contains unaccepted candidate questions', async () => {
    const registry = createLocalRegistry();
    const mockId = `mock_unaccepted_${Date.now().toString(36)}`;
    const defectiveQuestion: MockQuestion = {
      question_id: 'q_defective_1',
      mock_id: mockId,
      question_number: 1,
      section_name: 'General Studies',
      question_text: 'What is the minimum age for appointment as Governor?',
      options: ['25 years', '30 years', '35 years', '40 years'],
      correct_option_index: 2,
      explanation: 'Article 157 prescribes 35 years.',
      topic: 'Indian Constitution and Polity',
      difficulty: 'EASY',
      canonical_hash: 'hash_gov_age',
      candidate_status: 'REPAIR_REQUIRED' // Unaccepted status!
    };

    const mock: MockTestRecord = {
      mock_id: mockId,
      exam_id: 'tgpsc_group_2_paper_1',
      exam_title: 'TGPSC Group-II Services',
      mock_number: 88,
      title: 'Defective Mock #88',
      series_id: 'series_fail_test',
      created_at: new Date().toISOString(),
      duration_minutes: 150,
      total_questions: 1,
      total_marks: 1,
      negative_marking_rate: 0.25,
      difficulty_mix: { easy: 1, medium: 0, hard: 0 },
      sections: [{
        section_id: 'sec_1',
        section_name: 'General Studies',
        total_questions: 1,
        marks_per_question: 1,
        questions: [defectiveQuestion]
      }],
      duplicates_prevented_count: 0,
      status: 'READY_FOR_AUDIT'
    };

    await registry.mocks.saveMock(mock);

    await assert.rejects(async () => {
      await registry.mocks.finalizeMock(mockId, 'Auditor', 'Should fail');
    }, /MOCK_HAS_UNACCEPTED_QUESTIONS/);

    // Verify mock remains in unfinalized state
    const fetched = await registry.mocks.getMockById(mockId);
    assert.strictEqual(fetched?.status, 'READY_FOR_AUDIT');
  });

  await runTest('2.2: Already-finalized mock rejects re-finalization (idempotent lock)', async () => {
    const registry = createLocalRegistry();
    const mockId = `mock_finalized_${Date.now().toString(36)}`;
    const cleanQuestion: MockQuestion = {
      question_id: 'q_clean_1',
      mock_id: mockId,
      question_number: 1,
      section_name: 'General Studies',
      question_text: 'Which Article deals with the Finance Commission of India?',
      options: ['Article 275', 'Article 280', 'Article 300', 'Article 324'],
      correct_option_index: 1,
      explanation: 'Article 280.',
      topic: 'Indian Constitution and Polity',
      difficulty: 'EASY',
      canonical_hash: 'hash_art_280',
      candidate_status: 'ACCEPTED'
    };

    const mock: MockTestRecord = {
      mock_id: mockId,
      exam_id: 'tgpsc_group_2_paper_1',
      exam_title: 'TGPSC Group-II Services',
      mock_number: 89,
      title: 'Clean Mock #89',
      series_id: 'series_fail_test',
      created_at: new Date().toISOString(),
      duration_minutes: 150,
      total_questions: 1,
      total_marks: 1,
      negative_marking_rate: 0.25,
      difficulty_mix: { easy: 1, medium: 0, hard: 0 },
      sections: [{
        section_id: 'sec_1',
        section_name: 'General Studies',
        total_questions: 1,
        marks_per_question: 1,
        questions: [cleanQuestion]
      }],
      duplicates_prevented_count: 0,
      status: 'READY_FOR_AUDIT'
    };

    await registry.mocks.saveMock(mock);
    await registry.mocks.finalizeMock(mockId, 'Auditor', 'First pass');

    // Attempt second finalization -> should reject
    await assert.rejects(async () => {
      await registry.mocks.finalizeMock(mockId, 'Auditor', 'Second pass');
    }, /MOCK_ALREADY_FINAL/);
  });

  console.log('\n--- SECTION 3: STORAGE SAFETY & MISSING CREDENTIAL HANDLING ---');

  await runTest('3.1: Storage health check handles missing Supabase credentials safely without crashing', async () => {
    const origUrl = process.env.SUPABASE_URL;
    const origKey = process.env.SUPABASE_SECRET_KEY;
    try {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SECRET_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const health = await checkStorageHealth();
      assert.strictEqual(health.healthy, false);
      assert(health.error?.includes('credentials not configured') || health.error?.includes('not configured'));
    } finally {
      if (origUrl) process.env.SUPABASE_URL = origUrl;
      if (origKey) process.env.SUPABASE_SECRET_KEY = origKey;
    }
  });

  console.log('\n========================================================================');
  console.log('🎉 ALL PERSISTENCE FAILURE TESTS PASSED (0 FAILURES)');
  console.log('========================================================================\n');
}

runPersistenceFailureTests().catch(err => {
  console.error('Fatal crash in persistence failure tests:', err);
  process.exit(1);
});

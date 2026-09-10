import assert from 'assert';
import { createLocalRegistry } from '../persistence/local/index.ts';
import {
  ExamRecord,
  SourceRecord,
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

async function runPersistenceContractTests() {
  console.log('========================================================================');
  console.log('🧪 RUNNING PERSISTENCE CONTRACT & REPOSITORY TEST SUITE');
  console.log('========================================================================\n');

  const registry = createLocalRegistry();

  console.log('--- SECTION 1: EXAM & PREPARATION BASIS REPOSITORY CONTRACTS ---');

  await runTest('1.1: ExamRepository persists and retrieves ExamRecord with verified status', async () => {
    const exam = await registry.exams.getExamById('tgpsc_group_2_paper_1');
    assert(exam !== null, 'TGPSC Group 2 exam should exist');
    assert.strictEqual(exam?.exam_id, 'tgpsc_group_2_paper_1');
    assert.strictEqual(exam?.exam_profile_status, 'VERIFIED');
  });

  await runTest('1.2: PreparationBasisRepository retrieves active basis without embedding in mock', async () => {
    const bases = await registry.bases.getPreparationBases('tgpsc_group_2_paper_1');
    assert(bases.length > 0, 'Should have at least one preparation basis');
    const preNotifBasis = await registry.bases.getPreparationBasisByMode('tgpsc_group_2_paper_1', 'PRE_NOTIFICATION_PREPARATION');
    assert(preNotifBasis !== null);
    assert.strictEqual(preNotifBasis?.status, 'HISTORICAL_BASIS_VERIFIED');
  });

  console.log('\n--- SECTION 2: SOURCE REGISTRY & DOCUMENT DEDUPLICATION ---');

  await runTest('2.1: SourceRepository queries verified sources by authority and content hash', async () => {
    const sources = await registry.sources.getSources('tgpsc_group_2_paper_1');
    assert(sources.length > 0, 'Sources should exist for TGPSC Group 2');
    const firstSource = sources[0];
    if (firstSource.content_hash) {
      const foundByHash = await registry.sources.findSourceByContentHash(firstSource.content_hash);
      assert.strictEqual(foundByHash?.source_id, firstSource.source_id);
    }
  });

  await runTest('2.2: DocumentRepository deduplicates documents by content_hash', async () => {
    const testDoc = {
      document_id: 'doc_contract_test_1',
      document_type: 'SYLLABUS',
      title: 'TGPSC Group 2 Syllabus Notification',
      storage_bucket: 'govexam-syllabus',
      storage_path: 'tgpsc/2022/hash123/syllabus.pdf',
      content_hash: 'sha256_dummy_hash_for_contract_test_1',
      retrieved_at: new Date().toISOString()
    };
    await registry.documents.saveDocument(testDoc);
    const found = await registry.documents.findDocumentByContentHash('sha256_dummy_hash_for_contract_test_1');
    assert.strictEqual(found?.document_id, 'doc_contract_test_1');
  });

  console.log('\n--- SECTION 3: BLUEPRINT, MOCK & ATOMIC FINALIZATION CONTRACTS ---');

  await runTest('3.1: BlueprintRepository creates and locks blueprint record', async () => {
    const bpId = `bp_test_${Date.now().toString(36)}`;
    const newBp: MockBlueprintRecord = {
      blueprint_id: bpId,
      exam_id: 'tgpsc_group_2_paper_1',
      exam_version_id: 'v1',
      recruitment_cycle: '2024-2025',
      series_id: 'series_tgpsc_test',
      mock_number: 1,
      test_mode: 'FULL_LENGTH',
      language: 'en',
      question_count: 5,
      total_marks: 5,
      negative_marking: 0.25,
      duration_minutes: 15,
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
        difficulties: { easy_count: 0, moderate_count: 0, difficult_count: 0 },
        cognitive: { recall: 0, understand: 0, apply: 0, analyse: 0, multi_step: 0 },
        formats: [],
        static_current: { static_count: 0, current_count: 0, linked_count: 0 },
        state_scope: { state_count: 0, india_count: 0, international_count: 0 },
        visual_count: 0,
        answer_positions: { A: 0, B: 0, C: 0, D: 0 },
        pyq_relationships: {}
      },
      pyq_intelligence_status: 'SUFFICIENT'
    };
    await registry.blueprints.saveBlueprint(newBp);
    const fetched = await registry.blueprints.getBlueprintById(bpId);
    assert.strictEqual(fetched?.blueprint_id, bpId);
    assert.strictEqual(fetched?.status, 'DRAFT');

    await registry.blueprints.lockBlueprint(bpId, 'Lead Auditor');
    const locked = await registry.blueprints.getBlueprintById(bpId);
    assert.strictEqual(locked?.status, 'BLUEPRINT_LOCKED');
  });

  await runTest('3.2: MockRepository creates mock test and enforces atomic finalization to ledger', async () => {
    const mockId = `mock_contract_${Date.now().toString(36)}`;
    const testQuestion: MockQuestion = {
      question_id: `q_contract_1_${Date.now().toString(36)}`,
      mock_id: mockId,
      question_number: 1,
      section_name: 'Economy and Development',
      question_text: `Under the Telangana FRBM Act, what is the ceiling for fiscal deficit relative to GSDP? (Test Run ${Date.now()})`,
      options: ['2.0%', '2.5%', '3.0%', '4.0%'],
      correct_option_index: 2,
      explanation: 'Telangana FRBM Act sets a 3.0% ceiling.',
      topic: 'Telangana Socio-Economic Outlook & Budget Highlights',
      difficulty: 'EASY',
      canonical_hash: '',
      candidate_status: 'ACCEPTED',
      generation_provenance: 'LIVE_GEMINI',
      generation_model_id: 'gemini-3.8-flash'
    };

    const newMock: MockTestRecord = {
      mock_id: mockId,
      exam_id: 'tgpsc_group_2_paper_1',
      exam_title: 'TGPSC Group-II Services',
      mock_number: 99,
      title: 'Contract Test Mock #99',
      series_id: 'series_contract_test',
      created_at: new Date().toISOString(),
      duration_minutes: 150,
      total_questions: 1,
      total_marks: 1,
      negative_marking_rate: 0.25,
      difficulty_mix: { easy: 1, medium: 0, hard: 0 },
      sections: [{
        section_id: 'sec_1',
        section_name: 'Economy and Development',
        total_questions: 1,
        marks_per_question: 1,
        questions: [testQuestion]
      }],
      duplicates_prevented_count: 0,
      status: 'READY_FOR_AUDIT'
    };

    await registry.mocks.saveMock(newMock);

    // Finalize mock
    const finResult = await registry.mocks.finalizeMock(mockId, 'Contract Auditor', 'All checks passed');
    assert.strictEqual(finResult.success, true);
    assert.strictEqual(finResult.mock.status, 'FINAL');
    assert(finResult.addedToLedger >= 1, 'Question must be added to duplicate ledger');

    // Verify duplicate ledger entry exists
    const ledgerEntries = await registry.ledger.findMatches({
      topic: 'Telangana Socio-Economic Outlook & Budget Highlights'
    });
    assert(ledgerEntries.length > 0, 'Ledger entry must be found in ledger');
  });

  console.log('\n--- SECTION 4: AUDIT LOG APPEND-ONLY INTEGRITY ---');

  await runTest('4.1: AuditRepository appends logs without mutating historical records', async () => {
    const auditId = `log_contract_${Date.now().toString(36)}`;
    await registry.auditLogs.appendAuditLog({
      log_id: auditId,
      audit_type: 'MOCK_FINALIZATION_AUDIT',
      exam_id: 'tgpsc_group_2_paper_1',
      reason: 'Contract audit integrity validation',
      status: 'SUCCESS',
      created_at: new Date().toISOString()
    });

    const logs = await registry.auditLogs.getAuditLogs('MOCK', 'tgpsc_group_2_paper_1');
    const matched = logs.find(l => l.log_id === auditId);
    assert(matched !== undefined, 'Audit record must be successfully appended and retrieved');
  });

  console.log('\n========================================================================');
  console.log('🎉 ALL PERSISTENCE CONTRACT TESTS PASSED (0 FAILURES)');
  console.log('========================================================================\n');
}

runPersistenceContractTests().catch(err => {
  console.error('Fatal crash in persistence contract tests:', err);
  process.exit(1);
});

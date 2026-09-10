import assert from 'assert';
import {
  analyzeOptionSymmetry,
  checkSameSemanticCategory,
  evaluateDistractorQuality,
  repairOptionSymmetryConceptually,
  computeSemanticSimilarity,
  extractSemanticConceptRepresentation,
  extractCoreFactRepresentation,
  compareCoreFactRepresentations,
  extractStructuralFingerprint,
  runMultiLayerDuplicateCheck,
  checkPYQDuplicateRisk
} from '../questionValidationService.ts';
import {
  getExecutionEnvironment,
  getPersistenceBackend,
  validatePersistenceConfiguration,
  assertCanMutate
} from '../persistence/repository.ts';
import {
  finalizeMockTest,
  getDuplicateLedger,
  saveDuplicateLedger,
  getMockById,
  saveMockTest,
  getExamById,
  computeCanonicalQuestionHash
} from '../dbService.ts';
import { generateMockTestForExam } from '../mockService.ts';
import { MockQuestion, BlueprintQuestionSlot } from '../../src/types.ts';

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
  console.log('🧪 RUNNING PRODUCTION ADVERSARIAL VALIDATION & REFINEMENTS TEST SUITE');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // SECTION 1: USER OPTION LEAK & OPTION SYMMETRY GATES (Refinements 6, 7, 8, 9, 10)
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: OPTION SYMMETRY & LEAK PREVENTION ---');

  await runTest('1.1: User Parenthetical Leak scenario (A, B with paren, C, D) flagged as ANSWER_LEAK & MAJOR_OUTLIER', () => {
    const stem = 'Which section of the Telangana Public Employment Act governs seniority fixation?';
    const options = [
      'Section 4',
      'Section 12 (as amended by the 2021 Legislative Notification on seniority lists)',
      'Section 18',
      'Section 24'
    ];
    const correctIndex = 1; // Option B has exclusive explanatory parenthetical

    const audit = analyzeOptionSymmetry(options, correctIndex, stem);

    assert.strictEqual(audit.parenthetical_leak_detected, true, 'Must detect parenthetical leak');
    assert.strictEqual(audit.outlier_level, 'MAJOR_OUTLIER', 'Parenthetical leak must trigger MAJOR_OUTLIER');
    assert.strictEqual(audit.symmetry_status, 'ANSWER_LEAK', 'Must be categorized as ANSWER_LEAK');
    assert.strictEqual(audit.recommendation, 'REPAIR', 'Must recommend REPAIR');
    assert(audit.flags.includes('PARENTHETICAL_LEAK'), 'Must flag PARENTHETICAL_LEAK');
  });

  await runTest('1.2: Conceptual Repair removes parenthetical without filler words (Refinement 10)', () => {
    const rawQuestion: MockQuestion = {
      question_id: 'q_test_paren',
      mock_id: 'm_test',
      question_number: 1,
      section_name: 'General Studies',
      question_text: 'Which section of the Act governs seniority fixation?',
      options: [
        'Section 4',
        'Section 12 (as amended by the 2021 Legislative Notification)',
        'Section 18',
        'Section 24'
      ],
      correct_option_index: 1,
      explanation: 'Section 12 specifies seniority rules.',
      topic: 'Polity',
      difficulty: 'MEDIUM',
      canonical_hash: 'hash_123'
    };

    const repaired = repairOptionSymmetryConceptually(rawQuestion);
    assert.strictEqual(repaired.options[1], 'Section 12', 'Must strip parenthetical conceptually');
    assert(!repaired.options[1].includes('('), 'Must not contain opening paren');

    const reAudit = analyzeOptionSymmetry(repaired.options, repaired.correct_option_index, repaired.question_text);
    assert.strictEqual(reAudit.symmetry_status, 'SYMMETRIC');
    assert.strictEqual(reAudit.outlier_level, 'NO_OUTLIER');
    assert.strictEqual(reAudit.recommendation, 'PASS');
  });

  await runTest('1.3: Test C: Correct option 8-10 words longer than distractors is caught by Outlier Detection (Refinement 16.C)', () => {
    const stem = 'Under the Right to Information Act, what is the role of the Public Information Officer?';
    const options = [
      'Accept applications and fees',
      'Provide requested administrative records within thirty days as mandated by statutory compliance guidelines',
      'Forward appeals to tribunal',
      'Conduct departmental disciplinary hearings'
    ];
    // Option lengths: 4, 13, 4, 4 -> correct option is +9 words longer (ratio > 3x)
    const audit = analyzeOptionSymmetry(options, 1, stem);

    assert.strictEqual(audit.outlier_level, 'MAJOR_OUTLIER');
    assert.strictEqual(audit.symmetry_status, 'ANSWER_LEAK');
    assert.strictEqual(audit.recommendation, 'REPAIR');
    assert(audit.outlier_reasons.some(r => r.includes('outlier') || r.includes('excess')));
  });

  await runTest('1.4: Test D: Uniform long legal options are NOT falsely flagged and PASS (Refinement 16.D)', () => {
    const stem = 'Which of the following statements regarding the State Administrative Tribunal is correct?';
    const options = [
      'Pursuant to Article 323A, Parliament may by law provide for the adjudication of disputes with respect to recruitment of persons.',
      'Pursuant to Article 323B, State Legislatures may establish administrative tribunals for the adjudication of public service conditions.',
      'In accordance with Article 324, the Election Commission exercises exclusive adjudicatory jurisdiction over state civil service tenures.',
      'In accordance with Article 320, the State Public Service Commission functions as the supreme appellate court for all service appeals.'
    ];
    // All 4 options are uniformly detailed and legal (18-20 words each)
    const audit = analyzeOptionSymmetry(options, 0, stem);

    assert.strictEqual(audit.outlier_level, 'NO_OUTLIER');
    assert.strictEqual(audit.symmetry_status, 'SYMMETRIC');
    assert.strictEqual(audit.recommendation, 'PASS');
    assert.strictEqual(audit.flags.length, 0);
  });

  await runTest('1.5: Mixed semantic categories (Articles vs Years) are caught (Refinement 9)', () => {
    const options = ['Article 148', 'Article 280', 'Article 324', '1950'];
    const catCheck = checkSameSemanticCategory(options, 0, 'Which constitutional article governs CAG?');
    assert.strictEqual(catCheck.sameCategory, false);
    assert(catCheck.notes?.includes('options are'));
  });

  // -------------------------------------------------------------------------
  // SECTION 2: MULTI-LAYER DUPLICATE ENGINE (Refinements 2, 3, 4, 5, 14)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 2: MULTI-LAYER DUPLICATE ENGINE (LAYERS 1-5) ---');

  await runTest('2.1: Layer 3 True Semantic Representation flags concept intent duplicate (Refinement 2)', () => {
    const textA = 'Who appoints the Comptroller and Auditor General of India?';
    const textB = 'The constitutional power of appointing the CAG is vested in which authority?';

    const sim = computeSemanticSimilarity(textA, textB);
    assert(sim >= 0.75, `Expected semantic similarity >= 0.75, got ${sim}`);

    const repA = extractSemanticConceptRepresentation(textA);
    const repB = extractSemanticConceptRepresentation(textB);
    assert(repA.key_terms.includes('comptroller_and_auditor_general'));
    assert(repA.key_terms.includes('appointment'));
    assert(repB.key_terms.includes('comptroller_and_auditor_general'));
    assert(repB.key_terms.includes('appointment'));
  });

  await runTest('2.2: Test A: Same answerable fact with low lexical similarity flagged by Layer 4 SAME_FACT_REPEAT (Refinements 3 & 16.A)', () => {
    // Seed ledger with prior question
    const ledger = getDuplicateLedger();
    const priorHash = computeCanonicalQuestionHash('Under the Indian Constitution, the authority empowered to appoint the CAG is vested with whom?');
    const priorFact = {
      subject: 'General Studies',
      topic: 'Indian Polity',
      entities: ['Comptroller and Auditor General of India'],
      relation: 'appointed_by',
      property_tested: 'appointing_authority',
      object_or_value: 'President of India',
      correct_answer_concept: 'President of India',
      fact_fingerprint: 'fp_cag_appointment'
    };

    ledger.unshift({
      ledger_id: 'led_test_cag_1',
      question_hash: priorHash,
      canonical_hash: priorHash,
      canonical_question_preview: 'Under the Indian Constitution, the authority empowered to appoint the CAG is vested with whom?',
      canonical_full_text: 'Under the Indian Constitution, the authority empowered to appoint the CAG is vested with whom?',
      topic: 'Indian Polity',
      mock_ids: ['m_prior'],
      exam_id: 'exam_tgpsc_grp2',
      first_registered_at: new Date().toISOString(),
      duplicate_attempts_blocked: 0,
      similarity_cluster_key: 'indian_polity',
      core_fact_representation: priorFact
    });
    saveDuplicateLedger(ledger);

    // New question testing identical fact with completely different wording
    const newQ: MockQuestion = {
      question_id: 'q_cag_candidate',
      mock_id: 'm_curr',
      question_number: 1,
      section_name: 'General Studies',
      question_text: 'Who appoints the Comptroller and Auditor General of India?',
      options: ['President of India', 'Prime Minister', 'Chief Justice of India', 'Parliament'],
      correct_option_index: 0,
      explanation: 'The President appoints the CAG under Article 148.',
      topic: 'Indian Polity',
      difficulty: 'EASY',
      canonical_hash: computeCanonicalQuestionHash('Who appoints the Comptroller and Auditor General of India?')
    };

    const slot: BlueprintQuestionSlot = {
      blueprint_id: 'bp_test',
      slot_id: 'slot_1',
      question_number: 1,
      subject: 'General Studies',
      topic: 'Indian Polity',
      subtopic: 'Constitutional Bodies',
      microtopic: 'CAG Article 148',
      core_concept_target: 'Comptroller and Auditor General of India',
      answerable_fact_family: 'appointing_authority',
      question_type: 'MCQ_SINGLE_BEST',
      question_archetype: 'FACTUAL',
      difficulty: 'EASY',
      cognitive_level: 'RECALL',
      static_current: 'STATIC',
      state_scope: 'INDIA_GENERAL',
      avoid_fact_fingerprints: [],
      avoid_question_fingerprints: [],
      avoid_archetype_patterns: [],
      pyq_relationship: 'STABLE_CORE_NEW_FACT',
      future_relevance: 'HIGH',
      target_answer_position: 'A',
      source_requirement: 'Constitution of India Article 148',
      visual_requirement: false,
      reason_for_inclusion: 'Core constitutional office',
      evidence_basis: 'Constitution Article 148',
      status: 'READY'
    };

    const result = runMultiLayerDuplicateCheck(newQ, slot, 'exam_tgpsc_grp2', []);
    assert.strictEqual(result.decision, 'SAME_FACT_REPEAT');
    assert(['LAYER_4_CORE_ANSWERABLE_FACT', 'LAYER_4_CORE_FACT'].includes(result.layer as any));
    assert(result.reason?.includes('same fact') || result.reason?.includes('already tested'));
  });

  await runTest('2.3: Test B: Same institution but independent property is UNIQUE (Refinements 3 & 16.B)', () => {
    // Q tests CAG tenure instead of appointment
    const newQ: MockQuestion = {
      question_id: 'q_cag_tenure',
      mock_id: 'm_curr',
      question_number: 2,
      section_name: 'General Studies',
      question_text: 'What is the prescribed tenure of office for the Comptroller and Auditor General of India?',
      options: ['5 years or 62 years', '6 years or 65 years', '6 years with no age limit', '5 years or 65 years'],
      correct_option_index: 1,
      explanation: 'CAG holds office for 6 years or until age 65.',
      topic: 'Indian Polity',
      difficulty: 'MEDIUM',
      canonical_hash: computeCanonicalQuestionHash('What is the prescribed tenure of office for the Comptroller and Auditor General of India?')
    };

    const slot: BlueprintQuestionSlot = {
      blueprint_id: 'bp_test',
      slot_id: 'slot_2',
      question_number: 2,
      subject: 'General Studies',
      topic: 'Indian Polity',
      subtopic: 'Constitutional Bodies',
      microtopic: 'CAG Article 148',
      core_concept_target: 'Comptroller and Auditor General of India',
      answerable_fact_family: 'tenure_and_age_limit',
      question_type: 'MCQ_SINGLE_BEST',
      question_archetype: 'FACTUAL',
      difficulty: 'MODERATE',
      cognitive_level: 'RECALL',
      static_current: 'STATIC',
      state_scope: 'INDIA_GENERAL',
      avoid_fact_fingerprints: [],
      avoid_question_fingerprints: [],
      avoid_archetype_patterns: [],
      pyq_relationship: 'STABLE_CORE_NEW_FACT',
      future_relevance: 'HIGH',
      target_answer_position: 'B',
      source_requirement: 'Constitution of India Article 148',
      visual_requirement: false,
      reason_for_inclusion: 'CAG tenure provisions',
      evidence_basis: 'Constitution Article 148',
      status: 'READY'
    };

    const result = runMultiLayerDuplicateCheck(newQ, slot, 'exam_tgpsc_grp2', []);
    assert.strictEqual(result.decision, 'UNIQUE', 'Independent property on same institution must be UNIQUE');
  });

  await runTest('2.4: Test E: Legitimate temporal variations across time scopes are UNIQUE (Refinements 14 & 16.E)', () => {
    const fact2024 = {
      subject: 'General Studies',
      topic: 'Economy',
      entities: ['Reserve Bank of India Governor'],
      relation: 'officeholder',
      property_tested: 'governor_appointment',
      object_or_value: 'Shaktikanta Das (2024)',
      time_scope: '2024',
      correct_answer_concept: 'Shaktikanta Das (2024)',
      fact_fingerprint: 'fp_rbi_governor_2024'
    };

    const fact2026 = {
      subject: 'General Studies',
      topic: 'Economy',
      entities: ['Reserve Bank of India Governor'],
      relation: 'officeholder',
      property_tested: 'governor_appointment',
      object_or_value: 'Subsequent Appointee (Post-2024)',
      time_scope: '2026',
      correct_answer_concept: 'Subsequent Appointee (Post-2024)',
      fact_fingerprint: 'fp_rbi_governor_2026'
    };

    const comparison = compareCoreFactRepresentations(fact2024, fact2026);
    assert.strictEqual(comparison.isSameFact, false, 'Different time scopes must not be duplicates');
    assert(comparison.reason?.includes('temporal variation'));
  });

  await runTest('2.5: Test F: Reworded question testing same answerable fact as PYQ is BLOCKED (Refinements 5 & 16.F)', () => {
    // Ramappa temple UNESCO fact in official seed PYQs
    const rewordedRamappaQuestion: MockQuestion = {
      question_id: 'q_ramappa_reworded',
      mock_id: 'm_test',
      question_number: 1,
      section_name: 'General Studies',
      question_text: 'Which Kakatiya monument inscribed as a UNESCO World Heritage site in 2021 was constructed using lightweight floating bricks and sandbox foundation?',
      options: ['Thousand Pillar Temple', 'Ramappa Temple', 'Warangal Fort', 'Alampur Navabrahma Temples'],
      correct_option_index: 1,
      explanation: 'Ramappa Temple (Rudreswara) in Mulugu was inscribed in 2021 for its floating bricks technology.',
      topic: 'Telangana History & Culture',
      difficulty: 'MEDIUM',
      canonical_hash: computeCanonicalQuestionHash('Which Kakatiya monument inscribed as a UNESCO World Heritage site in 2021 was constructed using lightweight floating bricks and sandbox foundation?')
    };

    const pyqRisk = checkPYQDuplicateRisk(rewordedRamappaQuestion, 'tgpsc_group_2_paper_1');
    assert.strictEqual(pyqRisk.isBlocked, true, 'Must block reworded PYQ fact');
    assert.strictEqual(pyqRisk.relationship, 'SAME_FACT_AS_PYQ');
  });

  await runTest('2.6: Reverse-direction phrasing testing same fact is caught (Refinement 3)', () => {
    const factDirect = {
      subject: 'General Studies',
      topic: 'Polity',
      entities: ['Comptroller and Auditor General of India'],
      relation: 'appointed_by',
      property_tested: 'appointing_authority',
      object_or_value: 'President of India',
      correct_answer_concept: 'President of India',
      fact_fingerprint: 'fp_cag_pres'
    };

    const factReverse = {
      subject: 'General Studies',
      topic: 'Polity',
      entities: ['President of India'],
      relation: 'appointed_by',
      property_tested: 'appointing_authority',
      object_or_value: 'Comptroller and Auditor General of India',
      correct_answer_concept: 'Comptroller and Auditor General of India',
      fact_fingerprint: 'fp_pres_cag'
    };

    const comp = compareCoreFactRepresentations(factDirect, factReverse);
    assert.strictEqual(comp.isSameFact, true, 'Reverse direction phrasing must be recognized as same fact');
  });

  // -------------------------------------------------------------------------
  // SECTION 3: PRODUCTION PERSISTENCE & PROVENANCE RESTRICTIONS (Refinements 1, 11, 12, 15)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 3: PERSISTENCE SAFETY & PROVENANCE GATES ---');

  await runTest('3.1: Test G: CUSTOM_PRACTICE is permitted with explicit labeling and disclaimer (Refinement 11)', async () => {
    const exam = getExamById('tgpsc_group_2_paper_1')!;

    const customMock = await generateMockTestForExam({
      exam,
      desiredQuestionCount: 5,
      preparation_mode: 'CUSTOM_PRACTICE'
    });

    assert(customMock, 'Custom practice mock generated');
    assert(customMock.title.startsWith('[Custom Practice]'), 'Title must be labeled [Custom Practice]');
    assert(customMock.disclaimer?.includes('UNOFFICIAL_PRACTICE'), 'Must have unofficial practice disclaimer');
    assert.strictEqual(customMock.preparation_mode, 'CUSTOM_PRACTICE');
  });

  await runTest('3.2: Official mock generation without blueprint throws error (Refinement 11)', async () => {
    const exam = getExamById('tgpsc_group_2_paper_1')!;

    let caught = false;
    try {
      await generateMockTestForExam({
        exam,
        desiredQuestionCount: 5,
        preparation_mode: 'PRE_NOTIFICATION_PREPARATION' // Official mode without blueprint
      });
    } catch (e: any) {
      caught = true;
      assert(e.message.includes('strictly requires an evidence-based blueprint in BLUEPRINT_LOCKED status'));
    }
    assert.strictEqual(caught, true, 'Must block official mock without locked blueprint');
  });

  await runTest('3.3: Production environment blocks mutable operations without DATABASE (Refinement 12)', () => {
    const origEnv = process.env.NODE_ENV;
    const origBackend = process.env.PERSISTENCE_BACKEND;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.PERSISTENCE_BACKEND;

      const validation = validatePersistenceConfiguration();
      assert.strictEqual(validation.isValid, false);
      assert.strictEqual(validation.status, 'PRODUCTION_PERSISTENCE_INVALID');

      let threw = false;
      try {
        assertCanMutate('mock_finalization');
      } catch (e: any) {
        threw = true;
        assert(e.message.includes('PRODUCTION_PERSISTENCE_INVALID'));
      }
      assert.strictEqual(threw, true);
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origBackend) process.env.PERSISTENCE_BACKEND = origBackend;
      else delete process.env.PERSISTENCE_BACKEND;
    }
  });

  await runTest('3.4: Production finalization strictly rejects TEST_SYNTHESIS provenance (Refinement 1 & 15)', () => {
    const origEnv = process.env.NODE_ENV;
    const origBackend = process.env.PERSISTENCE_BACKEND;

    try {
      process.env.NODE_ENV = 'production';
      process.env.PERSISTENCE_BACKEND = 'DATABASE'; // Satisfies persistence

      const mock = getMockById('mock_test_synth_1') || {
        mock_id: 'mock_test_synth_1',
        exam_id: 'exam_tgpsc_grp2',
        exam_title: 'TGPSC Group 2',
        mock_number: 99,
        title: 'Mock 99',
        status: 'READY_FOR_AUDIT',
        duration_minutes: 150,
        total_questions: 1,
        total_marks: 1,
        negative_marking_rate: 0.25,
        difficulty_mix: { easy: 1, medium: 0, hard: 0 },
        duplicates_prevented_count: 0,
        created_at: new Date().toISOString(),
        generation_provenance: 'TEST_SYNTHESIS',
        sections: [{
          section_id: 'sec_1',
          section_name: 'General Studies',
          total_questions: 1,
          marks_per_question: 1,
          questions: [{
            question_id: 'q_syn_1',
            mock_id: 'mock_test_synth_1',
            question_number: 1,
            section_name: 'General Studies',
            question_text: 'Synthetic question stem for testing provenance rejection?',
            options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
            correct_option_index: 0,
            explanation: 'Synthetic explanation.',
            topic: 'Polity',
            difficulty: 'EASY',
            canonical_hash: 'hash_syn',
            candidate_status: 'ACCEPTED',
            generation_provenance: 'TEST_SYNTHESIS'
          }]
        }]
      };
      saveMockTest(mock as any);

      let rejected = false;
      try {
        finalizeMockTest(mock.mock_id);
      } catch (err: any) {
        rejected = true;
        assert(err.message.includes('PROVENANCE_VIOLATION') || err.message.includes('TEST_SYNTHESIS'));
      }
      assert.strictEqual(rejected, true, 'Must reject TEST_SYNTHESIS in production');
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origBackend) process.env.PERSISTENCE_BACKEND = origBackend;
      else delete process.env.PERSISTENCE_BACKEND;
    }
  });

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 ADVERSARIAL VALIDATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Adversarial test runner crashed:", err);
  process.exit(1);
});

import assert from 'node:assert';
import { mapQuestionToSubject, resolveCanonicalSubjectsForExam, autoMapAllQuestions } from '../subjectMapper.ts';
import { getExamById } from '../dbService.ts';
import { buildExamIntelligenceProfile, getPYQQuestions, savePYQQuestions } from '../pyqService.ts';

async function runTests() {
  console.log("=== 1. TESTING CANONICAL SUBJECTS RESOLUTION ===");
  const eoScrExam = getExamById('appsc_endowment_officer_screening_paper_1');
  assert(eoScrExam, "EO Screening Exam should exist");
  const canonicalSubjects = resolveCanonicalSubjectsForExam(eoScrExam || 'appsc_endowment_officer_screening_paper_1');
  assert.strictEqual(canonicalSubjects.length, 2, "Expected 2 canonical subjects for EO Screening");

  const [partA, partB] = canonicalSubjects;
  assert.strictEqual(partA.name, 'Part-A: General Studies & Mental Ability');
  assert.strictEqual(partA.weight_pct, 33.33);
  assert.strictEqual(partB.name, 'Part-B: Hindu Philosophy & Temple System');
  assert.strictEqual(partB.weight_pct, 66.67);
  console.log("✓ Canonical subjects resolution verified");

  console.log("\n=== 2. TESTING mapQuestionToSubject STRATEGIES ===");

  // Strategy 1: Exact match
  const resExact = mapQuestionToSubject({
    primary_subject: 'Part-A: General Studies & Mental Ability'
  }, eoScrExam);
  assert.strictEqual(resExact.canonical_subject, 'Part-A: General Studies & Mental Ability');
  assert.strictEqual(resExact.match_strategy, 'EXACT');
  console.log("✓ Strategy 1 (Exact match) passed");

  // Strategy 2: Alias match
  const resAlias = mapQuestionToSubject({
    primary_subject: 'General Studies'
  }, eoScrExam);
  assert.strictEqual(resAlias.canonical_subject, 'Part-A: General Studies & Mental Ability');
  assert.strictEqual(resAlias.match_strategy, 'ALIAS');
  console.log("✓ Strategy 2 (Alias match) passed");

  const resAliasB = mapQuestionToSubject({
    primary_subject: 'Hindu Philosophy'
  }, eoScrExam);
  assert.strictEqual(resAliasB.canonical_subject, 'Part-B: Hindu Philosophy & Temple System');
  assert.strictEqual(resAliasB.match_strategy, 'ALIAS');
  console.log("✓ Strategy 2 (Alias match Part-B) passed");

  // Strategy 3: Question number range heuristic (e.g. Q55 with empty subject -> Part-B)
  const resRangeB = mapQuestionToSubject({
    question_number: 55,
    primary_subject: ''
  }, eoScrExam);
  assert.strictEqual(resRangeB.canonical_subject, 'Part-B: Hindu Philosophy & Temple System');
  assert.strictEqual(resRangeB.match_strategy, 'QUESTION_RANGE');
  console.log("✓ Strategy 3 (Question range Q55 -> Part-B) passed");

  const resRangeA = mapQuestionToSubject({
    question_number: 10,
    primary_subject: ''
  }, eoScrExam);
  assert.strictEqual(resRangeA.canonical_subject, 'Part-A: General Studies & Mental Ability');
  assert.strictEqual(resRangeA.match_strategy, 'QUESTION_RANGE');
  console.log("✓ Strategy 3 (Question range Q10 -> Part-A) passed");

  // Strategy 4: Fuzzy matching with Hindu Philosophy
  const resFuzzy = mapQuestionToSubject({
    primary_subject: 'Philosophy and Temple Administration',
    primary_topic: 'Ramayana Kandas'
  }, eoScrExam);
  assert.strictEqual(resFuzzy.canonical_subject, 'Part-B: Hindu Philosophy & Temple System');
  console.log("✓ Strategy 4 (Fuzzy match) passed");

  console.log("\n=== 3. TESTING END-TO-END INGESTION WITH AUTO-MAPPING ===");
  // Test ingestion of a composite paper with questions having raw or alias subject strings
  const testIngestData = {
    exam_id: 'appsc_endowment_officer_screening_paper_1',
    paper_name: 'APPSC EO Screening Test 2022 Verified Test Paper',
    year: 2022,
    exam_date: '2022-07-24',
    source_domain: 'psc.ap.gov.in',
    source_url: 'https://psc.ap.gov.in/test_paper.pdf',
    total_extracted: 4,
    questions: [
      {
        question_number: 1,
        question_en: 'Which Article of the Constitution of India provides for the establishment of Finance Commission?',
        option_a_en: 'Article 280',
        option_b_en: 'Article 270',
        option_c_en: 'Article 260',
        option_d_en: 'Article 250',
        correct_answer: 'A' as const,
        primary_subject: 'General Studies', // raw alias
        primary_topic: 'Indian Polity',
        reason_summary: 'Constitutional provision'
      },
      {
        question_number: 2,
        question_en: 'In which year was Andhra Pradesh reorganized into 26 districts?',
        option_a_en: '2020',
        option_b_en: '2021',
        option_c_en: '2022',
        option_d_en: '2023',
        correct_answer: 'C' as const,
        primary_subject: '', // empty subject -> range heuristic Q2 -> Part-A
        primary_topic: 'AP Administration',
        reason_summary: 'AP Reorganization'
      },
      {
        question_number: 51,
        question_en: 'Who is the author of Ramayana according to Hindu tradition?',
        option_a_en: 'Sage Valmiki',
        option_b_en: 'Sage Vyasa',
        option_c_en: 'Sage Vasishta',
        option_d_en: 'Sage Vishwamitra',
        correct_answer: 'A' as const,
        primary_subject: 'Hindu Philosophy', // raw alias
        primary_topic: 'Ramayana',
        reason_summary: 'Sacred Literature'
      },
      {
        question_number: 52,
        question_en: 'Which Agama Shastra is traditionally followed at Tirumala Sri Venkateswara Swamy Temple?',
        option_a_en: 'Pancharatra Agama',
        option_b_en: 'Vaikhanasa Agama',
        option_c_en: 'Saiva Agama',
        option_d_en: 'Sakta Agama',
        correct_answer: 'B' as const,
        primary_subject: '', // empty subject -> range heuristic Q52 -> Part-B
        primary_topic: 'Agamas',
        reason_summary: 'Temple Tradition'
      }
    ],
    source: {
      source_class: 'OFFICIAL_PDF' as const,
      final_url: 'https://psc.ap.gov.in/test_paper.pdf',
      retrieved_at: new Date().toISOString(),
      document_hash: 'a'.repeat(64)
    }
  };

  const mappedQuestions = testIngestData.questions.map(q => {
    const mapped = mapQuestionToSubject({
      exam_id: testIngestData.exam_id,
      primary_subject: q.primary_subject,
      primary_topic: q.primary_topic,
      question_number: q.question_number,
      question_en: q.question_en
    }, eoScrExam);
    return {
      pyq_question_id: `q_test_${q.question_number}`,
      exam_id: testIngestData.exam_id,
      paper_id: 'test_paper_1',
      question_number: q.question_number,
      question_en: q.question_en,
      option_a_en: q.option_a_en,
      option_b_en: q.option_b_en,
      option_c_en: q.option_c_en,
      option_d_en: q.option_d_en,
      correct_answer: q.correct_answer,
      primary_subject: mapped.canonical_subject || q.primary_subject || 'General Studies',
      primary_topic: q.primary_topic,
      difficulty: 'MEDIUM',
      cognitive_level: 'APPLICATION',
      static_or_current: 'STATIC',
      answer_verification_status: 'FINAL_OFFICIAL',
      reason_summary: q.reason_summary,
      core_concept: q.primary_topic,
      has_image: false,
      has_diagram: false,
      has_map: false,
      has_table: false,
      is_multilingual: false,
      question_source_page: 1,
      answer_key_source_page: 1,
      extraction_confidence: 0.95,
      analysis_status: 'REVIEWED',
      data_provenance: 'RETRIEVED_OFFICIAL'
    } as any;
  });

  savePYQQuestions([
    ...mappedQuestions,
    ...getPYQQuestions().filter(q => q.paper_id !== 'test_paper_1')
  ]);

  assert(mappedQuestions.length === 4, "Should map 4 questions");

  // Verify that questions were assigned canonical subjects!
  const q1 = mappedQuestions.find(q => q.question_number === 1);
  const q2 = mappedQuestions.find(q => q.question_number === 2);
  const q51 = mappedQuestions.find(q => q.question_number === 51);
  const q52 = mappedQuestions.find(q => q.question_number === 52);

  assert.strictEqual(q1?.primary_subject, 'Part-A: General Studies & Mental Ability');
  assert.strictEqual(q2?.primary_subject, 'Part-A: General Studies & Mental Ability');
  assert.strictEqual(q51?.primary_subject, 'Part-B: Hindu Philosophy & Temple System');
  assert.strictEqual(q52?.primary_subject, 'Part-B: Hindu Philosophy & Temple System');
  console.log("✓ Ingested questions auto-mapped to canonical subjects successfully");

  console.log("\n=== 4. TESTING EXAM INTELLIGENCE PROFILE WITH ACCURATE BLUEPRINT WEIGHTS ===");
  const profile = buildExamIntelligenceProfile('appsc_endowment_officer_screening_paper_1');
  assert(profile.subject_distribution.length === 2, "Should have exactly 2 subjects in distribution");
  console.log("Profile subject distribution:", profile.subject_distribution);

  const partADist = profile.subject_distribution.find(s => s.subject === 'Part-A: General Studies & Mental Ability');
  const partBDist = profile.subject_distribution.find(s => s.subject === 'Part-B: Hindu Philosophy & Temple System');

  assert(partADist, "Part-A distribution should exist");
  assert(partBDist, "Part-B distribution should exist");
  assert.strictEqual(partADist.official_weight, 33.33, "Part-A official weight must be 33.33%");
  assert.strictEqual(partBDist.official_weight, 66.67, "Part-B official weight must be 66.67%");

  console.log(`✓ Part-A: Count = ${partADist.count}, Observed = ${partADist.percentage}%, Official Blueprint = ${partADist.official_weight}%`);
  console.log(`✓ Part-B: Count = ${partBDist.count}, Observed = ${partBDist.percentage}%, Official Blueprint = ${partBDist.official_weight}%`);

  console.log("\nALL VERIFICATIONS PASSED WITH 100% SUCCESS!");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

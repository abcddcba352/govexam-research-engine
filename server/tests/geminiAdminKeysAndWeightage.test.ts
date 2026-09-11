import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAdminGeminiKeys,
  addAdminGeminiKey,
  deleteAdminGeminiKey,
  getAllGeminiApiKeys,
  saveAdminGeminiKeys,
  executeWithGeminiFailover
} from '../geminiConfig.ts';
import { parseAndIngestQuestionPaper } from '../pyqService.ts';

test('Admin Gemini API Key Pool: add, list, delete, and mask keys', () => {
  const originalKeys = getAdminGeminiKeys();

  try {
    // 1. Add a valid mock Gemini API key
    const testKey1 = 'AIzaSyFakeKeyNumberOne1234567890abcdefg';
    const added1 = addAdminGeminiKey(testKey1, 'Integration Test Key 1');

    assert.equal(added1.label, 'Integration Test Key 1');
    assert.equal(added1.status, 'ACTIVE');
    assert.match(added1.masked_key, /^AIzaSy\.\.\.[a-z0-9]{4}$/);

    // 2. Add second key
    const testKey2 = 'AIzaSyFakeKeyNumberTwo0987654321xyz';
    const added2 = addAdminGeminiKey(testKey2, 'Integration Test Key 2');

    const keys = getAdminGeminiKeys();
    const found1 = keys.find(k => k.id === added1.id);
    const found2 = keys.find(k => k.id === added2.id);
    assert.ok(found1, 'Key 1 should exist in pool');
    assert.ok(found2, 'Key 2 should exist in pool');

    // 3. Merged keys list includes admin keys
    const all = getAllGeminiApiKeys();
    assert.ok(all.includes(testKey1), 'All keys list should include testKey1');
    assert.ok(all.includes(testKey2), 'All keys list should include testKey2');

    // 4. Delete key
    const deleted = deleteAdminGeminiKey(added1.id);
    assert.equal(deleted, true);

    const keysAfterDelete = getAdminGeminiKeys();
    assert.equal(keysAfterDelete.some(k => k.id === added1.id), false);
  } finally {
    // Clean up
    saveAdminGeminiKeys(originalKeys);
  }
});

test('Gemini Failover: Transparently rotates on 429 / rate limit errors', async () => {
  const originalKeys = getAdminGeminiKeys();

  try {
    const key1 = 'AIzaSyRateLimitedKey111111111111111';
    const key2 = 'AIzaSyWorkingBackupKey22222222222222';
    addAdminGeminiKey(key1, 'Key 1');
    addAdminGeminiKey(key2, 'Key 2');

    const allKeys = getAllGeminiApiKeys();
    const firstKey = allKeys[0];
    const secondKey = allKeys[1];

    let calls = 0;
    const attemptedKeys: string[] = [];

    const result = await executeWithGeminiFailover(async (_client, apiKey) => {
      calls++;
      attemptedKeys.push(apiKey);
      if (apiKey === firstKey) {
        throw new Error('429 RESOURCE_EXHAUSTED: Quota exceeded for project');
      }
      return { success: true, workingKey: apiKey };
    });

    assert.equal(result.success, true);
    assert.equal(result.workingKey, secondKey);
    assert.ok(attemptedKeys.includes(firstKey), 'First key should have been attempted and encountered 429');
    assert.ok(attemptedKeys.includes(secondKey), 'Second key should have been rotated to after 429');

    // Verify status tracking
    const keysNow = getAdminGeminiKeys();
    const match1 = keysNow.find(k => k.key === firstKey);
    assert.equal(match1?.status, 'RATE_LIMITED');
  } finally {
    saveAdminGeminiKeys(originalKeys);
  }
});

test('PYQ Ingestion: Custom Exam Details, Subject Names, and Syllabus Weightage Analysis', async () => {
  const customSubjects = [
    'Indian Polity & Constitution',
    'Indian Economy & Banking',
    'Geography & Environment'
  ];

  const sampleQuestions = [
    {
      question_number: 1,
      question_en: 'Which article of the Indian Constitution deals with the Right to Constitutional Remedies?',
      option_a_en: 'Article 32',
      option_b_en: 'Article 226',
      option_c_en: 'Article 19',
      option_d_en: 'Article 21',
      correct_answer: 'A',
      primary_subject: 'Indian Polity & Constitution',
      primary_topic: 'Fundamental Rights'
    },
    {
      question_number: 2,
      question_en: 'The Directive Principles of State Policy in the Constitution of India were borrowed from which country?',
      option_a_en: 'USA',
      option_b_en: 'Ireland',
      option_c_en: 'UK',
      option_d_en: 'Australia',
      correct_answer: 'B',
      primary_subject: 'Indian Polity & Constitution',
      primary_topic: 'Directive Principles'
    },
    {
      question_number: 3,
      question_en: 'Which institution serves as the Central Bank of India?',
      option_a_en: 'State Bank of India',
      option_b_en: 'Reserve Bank of India',
      option_c_en: 'NITI Aayog',
      option_d_en: 'NABARD',
      correct_answer: 'B',
      primary_subject: 'Indian Economy & Banking',
      primary_topic: 'Monetary System & Banking'
    },
    {
      question_number: 4,
      question_en: 'What is the standard repo rate mechanism primarily used for by the Reserve Bank of India?',
      option_a_en: 'Controlling Inflation and Liquidity',
      option_b_en: 'Fixing income tax brackets',
      option_c_en: 'Export subsidies',
      option_d_en: 'Custom duty exemption',
      correct_answer: 'A',
      primary_subject: 'Indian Economy & Banking',
      primary_topic: 'Monetary Policy'
    },
    {
      question_number: 5,
      question_en: 'Which pass connects the Kashmir Valley with the Ladakh region?',
      option_a_en: 'Zojila Pass',
      option_b_en: 'Nathu La',
      option_c_en: 'Shipki La',
      option_d_en: 'Lipulekh Pass',
      correct_answer: 'A',
      primary_subject: 'Geography & Environment',
      primary_topic: 'Himalayan Mountain Passes'
    }
  ];

  const result = await parseAndIngestQuestionPaper({
    exam_title: 'Custom State Administrative Examination 2026',
    exam_board: 'State Administrative Commission',
    exam_stage: 'Combined Preliminary Examination',
    paper_name: 'General Studies Paper 1',
    year: 2026,
    questions_override: sampleQuestions,
    custom_subjects: customSubjects,
    ai_match_subjects: false
  });

  assert.equal(result.success, true);
  assert.equal(result.count, 5);
  assert.ok(result.paper, 'Paper record should be created');
  assert.equal(result.paper.paper_name, 'General Studies Paper 1');

  // Verify weightage analysis
  const weightage = result.weightage_analysis;
  assert.ok(weightage, 'Weightage analysis should be calculated');
  assert.equal(weightage.total_questions, 5);

  // Subject distribution
  const polityItem = weightage.subjects.find(s => s.subject === 'Indian Polity & Constitution');
  assert.ok(polityItem, 'Polity subject should be present');
  assert.equal(polityItem.question_count, 2);
  assert.equal(polityItem.percentage, 40);

  const economyItem = weightage.subjects.find(s => s.subject === 'Indian Economy & Banking');
  assert.ok(economyItem, 'Economy subject should be present');
  assert.equal(economyItem.question_count, 2);
  assert.equal(economyItem.percentage, 40);

  const geographyItem = weightage.subjects.find(s => s.subject === 'Geography & Environment');
  assert.ok(geographyItem, 'Geography subject should be present');
  assert.equal(geographyItem.question_count, 1);
  assert.equal(geographyItem.percentage, 20);

  // Verify high-yield topics
  assert.ok(weightage.high_yield_topics.length > 0, 'High-yield topics should be populated');
  assert.ok(weightage.strategic_summary.length > 20, 'Strategic summary should be generated');
});

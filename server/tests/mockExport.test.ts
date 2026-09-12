import assert from 'node:assert/strict';
import { buildVaradhiCsv, buildVaradhiExcelXml, buildVaradhiImportRows, VARADHI_IMPORT_HEADERS } from '../../src/mockExport.ts';
import type { MockTestRecord } from '../../src/types.ts';

const mock = {
  mock_id: 'mock_test_1',
  exam_id: 'exam_test',
  exam_title: 'Test Exam',
  paper_id: 'paper_1',
  mock_number: 2,
  created_at: '2026-09-12T00:00:00.000Z',
  duration_minutes: 60,
  total_questions: 2,
  total_marks: 2,
  negative_marking_rate: 0,
  difficulty_mix: { easy: 1, medium: 1, hard: 0 },
  duplicates_prevented_count: 0,
  status: 'READY_FOR_AUDIT',
  sections: [{
    section_id: 's1', section_name: 'Current Affairs', total_questions: 2, marks_per_question: 1,
    questions: [{
      question_id: 'q1', mock_id: 'mock_test_1', question_number: 1,
      section_name: 'Current Affairs', question_text: 'English question?',
      options: ['A1', 'B1', 'C1', 'D1'], correct_option_index: 1,
      explanation: 'English explanation', topic: 'Recent event', difficulty: 'EASY', canonical_hash: 'h1',
      source_reference: '=unsafe formula', current_affairs_evidence: { event_date: '2026-09-01' } as any,
      bilingual: { secondary_language: 'Telugu', question_text: 'తెలుగు ప్రశ్న?', options: ['అ', 'ఆ', 'ఇ', 'ఈ'], explanation: 'తెలుగు వివరణ', parity_score: 100 },
      content_lifecycle: 'REVIEW', is_active: true,
    }, {
      question_id: 'q2', mock_id: 'mock_test_1', question_number: 2,
      section_name: 'History', question_text: 'Static question?',
      options: ['A2', 'B2', 'C2', 'D2'], correct_option_index: 0,
      explanation: 'Static explanation', topic: 'Ancient history', difficulty: 'MEDIUM', canonical_hash: 'h2',
      content_lifecycle: 'PERMANENT', is_active: true,
    }],
  }],
} as MockTestRecord;

const rows = buildVaradhiImportRows(mock);
assert.equal(Object.keys(rows[0]).join(','), VARADHI_IMPORT_HEADERS.join(','));
assert.equal(rows[0].question_te, 'తెలుగు ప్రశ్న?');
assert.equal(rows[0].correct_answer, 'B');
assert.equal(rows[0].content_lifecycle, 'REVIEW');
assert.equal(rows[0].review_on, '2026-12-11');
assert.equal(rows[0].expires_on, '2027-09-12');
assert.equal(rows[1].content_lifecycle, 'PERMANENT');
assert.equal(rows[1].review_on, '');
assert.equal(rows[1].expires_on, '');

const csv = buildVaradhiCsv(mock);
assert.equal(csv.split('\r\n')[0], VARADHI_IMPORT_HEADERS.join(','));
assert.match(csv, /"'=unsafe formula"/);
assert.match(csv, /తెలుగు ప్రశ్న/);

const excel = buildVaradhiExcelXml(mock);
assert.match(excel, /<Worksheet ss:Name="Mock Questions">/);
assert.match(excel, /తెలుగు ప్రశ్న/);

console.log('mock export contract tests passed');

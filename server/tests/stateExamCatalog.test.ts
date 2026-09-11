import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMockNumber,
  mockTestLabel,
  buildMockTestTitle,
  toCatalogSlug,
  studentFacingMockTestTitle,
  inferExamKind,
  hasMockTestSuffixOrMention,
  formatExamHeading,
  formatExamFallbackTitle,
  formatExamFallbackDescription,
  getStateCode,
  deriveStateExamCatalogMetadata
} from '../../src/utils/stateExamCatalog.ts';
import { createExamFromIntake, deleteExamRecord } from '../dbService.ts';

test('State Exam Logic: formatMockNumber and mockTestLabel', () => {
  assert.equal(formatMockNumber(1), '01');
  assert.equal(formatMockNumber(5), '05');
  assert.equal(formatMockNumber(12), '12');
  assert.equal(formatMockNumber(0), '01');
  assert.equal(formatMockNumber(-3), '01');

  assert.equal(mockTestLabel(1), 'Mock Test 01');
  assert.equal(mockTestLabel(7), 'Mock Test 07');
  assert.equal(mockTestLabel(25), 'Mock Test 25');
});

test('State Exam Logic: buildMockTestTitle and studentFacingMockTestTitle', () => {
  const fullTitle = buildMockTestTitle({
    stateCode: 'TG',
    examName: 'TGPSC Group-II Services',
    paperName: 'Paper-I',
    seriesNumber: 1
  });
  assert.equal(fullTitle, 'TG TGPSC Group-II Services · Paper-I · Mock Test 01');

  const withSubject = buildMockTestTitle({
    stateCode: 'AP',
    examName: 'APPSC Group-II Services',
    paperName: 'Screening Test',
    subjectName: 'General Studies',
    seriesNumber: 2
  });
  assert.equal(withSubject, 'AP APPSC Group-II Services · Screening Test · General Studies · Mock Test 02');

  const studentTitle = studentFacingMockTestTitle({
    examName: 'APPSC Group-II Services',
    paperLabel: 'Screening Test',
    seriesNumber: 3
  });
  assert.equal(studentTitle, 'APPSC Group-II Services · Screening Test · Mock Test 03');
});

test('State Exam Logic: toCatalogSlug', () => {
  assert.equal(toCatalogSlug('Andhra Pradesh APPSC Group-II Services'), 'andhra-pradesh-appsc-group-ii-services');
  assert.equal(toCatalogSlug('TGPSC AEE (Civil) 2026!'), 'tgpsc-aee-civil-2026');
  assert.equal(toCatalogSlug('   ---Leading and Trailing Spaces---   '), 'leading-and-trailing-spaces');
});

test('State Exam Logic: inferExamKind', () => {
  assert.equal(inferExamKind('Telangana Police Constable (Civil)'), 'police');
  assert.equal(inferExamKind('AP Police SI / Sub-Inspector'), 'police');
  assert.equal(inferExamKind('TS DSC School Assistant Teacher'), 'education');
  assert.equal(inferExamKind('TET Paper-I'), 'education');
  assert.equal(inferExamKind('TGPSC Assistant Executive Engineer (AEE Civil)'), 'engineering');
  assert.equal(inferExamKind('APPSC Executive Officer (Grade-III)'), 'administration');
  assert.equal(inferExamKind('TGPSC Group-I Services'), 'administration');
  assert.equal(inferExamKind('General Knowledge & Current Affairs'), 'general');
});

test('State Exam Logic: hasMockTestSuffixOrMention and formatExamHeading', () => {
  assert.equal(hasMockTestSuffixOrMention('APPSC Group-II Mock Tests'), true);
  assert.equal(hasMockTestSuffixOrMention('TGPSC Test Series'), true);
  assert.equal(hasMockTestSuffixOrMention('TGPSC Group-II Services'), false);

  assert.equal(formatExamHeading('APPSC Group-II Services'), 'APPSC Group-II Services Mock Tests');
  assert.equal(formatExamHeading('APPSC Group-II Mock Tests'), 'APPSC Group-II Mock Tests');
});

test('State Exam Logic: formatExamFallbackTitle and formatExamFallbackDescription', () => {
  assert.equal(
    formatExamFallbackTitle('APPSC Group-II Services', 'Andhra Pradesh'),
    'APPSC Group-II Services Mock Tests in Andhra Pradesh'
  );
  assert.equal(
    formatExamFallbackTitle('Telangana Police Constable', 'Telangana'),
    'Telangana Police Constable Mock Tests'
  );
  assert.equal(
    formatExamFallbackTitle('APPSC Group-II Mock Tests', 'Andhra Pradesh'),
    'APPSC Group-II Mock Tests in Andhra Pradesh'
  );

  assert.equal(
    formatExamFallbackDescription('APPSC Group-II Services', 'Andhra Pradesh'),
    'Practise APPSC Group-II Services mock tests for Andhra Pradesh. Explore papers, take timed tests and review every answer.'
  );
  assert.equal(
    formatExamFallbackDescription('Telangana Police Constable', 'Telangana'),
    'Practise Telangana Police Constable mock tests. Explore papers, take timed tests and review every answer.'
  );
});

test('State Exam Logic: getStateCode and deriveStateExamCatalogMetadata', () => {
  assert.equal(getStateCode('Telangana'), 'TG');
  assert.equal(getStateCode('Andhra Pradesh'), 'AP');
  assert.equal(getStateCode('Tamil Nadu'), 'TN');
  assert.equal(getStateCode('Central'), 'ALL-INDIA');

  const meta = deriveStateExamCatalogMetadata({
    title: 'Telangana Police Constable (Civil / AR / TSSP)',
    state_or_central: 'Telangana',
    paper: 'Preliminary Written Test'
  });
  assert.equal(meta.stateCode, 'TG');
  assert.equal(meta.examKind, 'police');
  assert.equal(meta.heading, 'Telangana Police Constable (Civil / AR / TSSP) Mock Tests');
  assert.equal(meta.catalogSlug, 'telangana-telangana-police-constable-civil-ar-tssp');
  assert.match(meta.sampleMockTitle, /^TG Telangana Police Constable/);
});

test('State Exam Logic: createExamFromIntake populates state exam catalog fields', () => {
  const created = createExamFromIntake({
    title: 'APPSC Forest Beat Officer 2026',
    commission: 'APPSC',
    state_or_central: 'Andhra Pradesh',
    post: 'Forest Beat Officer',
    stage: 'Written Exam',
    paper: 'General Studies & Mental Ability',
    recruitment_cycle: '2026 Notification',
    total_questions: 100,
    duration_minutes: 100,
    marks_per_question: 1,
    negative_marking_rate: 0.25,
    sections: ['General Studies'],
    syllabus_topics: ['General Studies'],
    mediums: ['English', 'Telugu']
  });

  assert.ok(created.exam_id);
  assert.equal(created.catalog_slug, 'andhra-pradesh-appsc-forest-beat-officer-2026');
  assert.equal(created.exam_kind, 'administration');
  assert.equal(created.heading, 'APPSC Forest Beat Officer 2026 Mock Tests');
  assert.equal(created.fallback_title, 'APPSC Forest Beat Officer 2026 Mock Tests in Andhra Pradesh');
  assert.ok(created.fallback_description?.includes('Andhra Pradesh'));

  // Clean up created test exam
  deleteExamRecord(created.exam_id);
});

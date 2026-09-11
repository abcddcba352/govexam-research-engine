import test from 'node:test';
import assert from 'node:assert/strict';
import { createExamFromIntake, updateExamRecord, getExamById } from '../dbService.ts';
import type { ExamIntakeInput, SubjectLanguageException } from '../../src/types.ts';

test('Exam Languages & Subject Exceptions: creates exam with state default languages', () => {
  const input: ExamIntakeInput = {
    title: 'TSPSC Group IV Service Exam',
    commission: 'TSPSC',
    state_or_central: 'Telangana',
    post: 'Junior Assistant',
    stage: 'Written Examination',
    paper: 'Paper-I',
    recruitment_cycle: '2026 Notification',
    total_questions: 150,
    duration_minutes: 150,
    marks_per_question: 1,
    negative_marking_rate: 0.25,
    sections: ['General Studies', 'Secretarial Abilities'],
    syllabus_topics: ['General Studies', 'Secretarial Abilities'],
    mediums: ['Telugu', 'English'],
    languages: ['Telugu', 'English'],
    exceptions: [
      { subject: 'General English', language: 'English Only' }
    ]
  };

  const created = createExamFromIntake(input);
  assert.ok(created.exam_id);
  assert.deepEqual(created.languages, ['Telugu', 'English']);
  assert.deepEqual(created.pattern.languages, ['Telugu', 'English']);
  assert.deepEqual(created.pattern.mediums, ['Telugu', 'English']);
  assert.ok(created.exceptions);
  assert.equal(created.exceptions.length, 1);
  assert.equal(created.exceptions[0].subject, 'General English');
  assert.equal(created.exceptions[0].language, 'English Only');
  assert.deepEqual(created.pattern.exceptions, created.exceptions);
});

test('Exam Languages & Subject Exceptions: updates exam with new languages and multiple exceptions', () => {
  const input: ExamIntakeInput = {
    title: 'APPSC Degree Lecturers DL Exam',
    commission: 'APPSC',
    state_or_central: 'Andhra Pradesh',
    post: 'Degree Lecturer',
    stage: 'Written Examination',
    paper: 'Paper-I General Studies',
    recruitment_cycle: '2026',
    total_questions: 150,
    duration_minutes: 150,
    marks_per_question: 1,
    negative_marking_rate: 0.33,
    sections: ['General Studies', 'General English', 'General Telugu'],
    syllabus_topics: ['General Studies', 'General English', 'General Telugu'],
    mediums: ['Telugu', 'English'],
    languages: ['Telugu', 'English'],
    exceptions: []
  };

  const created = createExamFromIntake(input);
  assert.ok(created.exam_id);

  const updatedExceptions: SubjectLanguageException[] = [
    { subject: 'General English', language: 'English Only' },
    { subject: 'General Telugu', language: 'Telugu Only' },
    { subject: 'Urdu', language: 'Urdu Only' }
  ];

  const updated = updateExamRecord(created.exam_id, {
    languages: ['Telugu', 'English', 'Urdu'],
    exceptions: updatedExceptions,
    pattern: {
      ...created.pattern,
      mediums: ['Telugu', 'English', 'Urdu'],
      languages: ['Telugu', 'English', 'Urdu'],
      exceptions: updatedExceptions
    }
  });

  assert.ok(updated);
  assert.deepEqual(updated.languages, ['Telugu', 'English', 'Urdu']);
  assert.equal(updated.exceptions?.length, 3);
  assert.equal(updated.exceptions?.[0].subject, 'General English');
  assert.equal(updated.exceptions?.[0].language, 'English Only');
  assert.equal(updated.exceptions?.[1].subject, 'General Telugu');
  assert.equal(updated.exceptions?.[1].language, 'Telugu Only');

  const reloaded = getExamById(created.exam_id);
  assert.ok(reloaded);
  assert.deepEqual(reloaded.languages, ['Telugu', 'English', 'Urdu']);
  assert.equal(reloaded.exceptions?.length, 3);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { extractSyllabusFromNotificationText } from '../syllabusExtractor.ts';

const SAMPLE_NOTIFICATION = `
TELANGANA STATE LEVEL POLICE RECRUITMENT BOARD
Rc No. 41 / Rect. / Admn-1 / 2022
RECRUITMENT FOR THE POSTS OF SCT POLICE CONSTABLE (CIVIL)

A. Preliminary Written Test (PWT):
200 Questions, 200 Marks, 3 Hours. Medium: English, Telugu, Urdu.

ANNEXURE - II
SYLLABUS FOR PRELIMINARY WRITTEN TEST
1. English
2. Arithmetic
3. General Science
4. History of India, Indian culture, Indian National Movement
5. Indian Geography, Polity and Economy
6. Current events of national and international importance
7. Test of Reasoning / Mental Ability
8. Contents pertaining to the State of Telangana
`;

await test('extractSyllabusFromNotificationText parses notification into complete scheme', () => {
  const extracted = extractSyllabusFromNotificationText(SAMPLE_NOTIFICATION, 'Telangana Police Constable');
  assert.equal(extracted.authority, 'Telangana State Level Police Recruitment Board (TSLPRB)');
  assert.equal(extracted.pattern.total_questions, 200);
  assert.equal(extracted.pattern.total_marks, 200);
  assert.equal(extracted.pattern.duration_minutes, 180);
  assert.equal(extracted.syllabus_topics.length, 8);
  assert.equal(extracted.stages.length, 1); // PWT captured
  assert.equal(extracted.stages[0].papers[0].sections.length, 8);
  assert.equal(extracted.is_official_gazette, true);
});

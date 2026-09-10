import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractSyllabusFromNotificationText,
  cleanTopicString,
  isOfficialGazetteText,
  extractAuthorityFromText,
  extractNotificationNumber
} from '../syllabusExtractor.ts';

const SAMPLE_TSLPRB_PC_NOTIFICATION = `
TELANGANA STATE LEVEL POLICE RECRUITMENT BOARD
DGP OFFICE COMPLEX, LAKDI-KA-PUL, HYDERABAD
Rc No. 41 / Rect. / Admn-1 / 2022                                Date: 25-04-2022

NOTIFICATION
RECRUITMENT FOR THE POSTS OF STIPENDIARY CADET TRAINEE (SCT) POLICE CONSTABLE (CIVIL) AND / OR EQUIVALENT

SCHEME OF EXAMINATION:
A. Preliminary Written Test (PWT):
Candidates shall be required to appear for the Preliminary Written Test in one paper (three hours duration) for 200 marks (200 questions). Objective type multiple choice questions.
Medium of Entrance Examination: English, Telugu and Urdu languages.

B. Physical Measurement Test (PMT) & Physical Efficiency Test (PET): Qualifying in nature.

C. Final Written Examination (FWE):
Candidates who qualify in the Physical Efficiency Test shall be required to appear for Final Written Examination in one paper of 3 hours duration for 200 marks (200 questions).

ANNEXURE - II
SYLLABUS FOR PRELIMINARY WRITTEN TEST
FOR THE POST OF SCT PC (CIVIL) AND / OR EQUIVALENT
(INTERMEDIATE STANDARD) (OBJECTIVE TYPE) (200 QUESTIONS)

1. English.
2. Arithmetic.
3. General Science.
4. History of India, Indian culture, Indian National Movement.
5. Indian Geography, Polity and Economy.
6. Current events of national and international importance.
7. Test of Reasoning / Mental Ability.
8. Contents pertaining to the State of Telangana.
`;

await test('extractAuthorityFromText detects TSLPRB', () => {
  const auth = extractAuthorityFromText(SAMPLE_TSLPRB_PC_NOTIFICATION);
  assert.ok(auth);
  assert.ok(auth.includes('Telangana State Level Police Recruitment Board'));
});

await test('extractNotificationNumber extracts Rc No 41', () => {
  const num = extractNotificationNumber(SAMPLE_TSLPRB_PC_NOTIFICATION);
  assert.ok(num);
  assert.ok(num.includes('41'));
});

await test('extractSyllabusFromNotificationText extracts all 8 PC syllabus topics and 3 stages', () => {
  const result = extractSyllabusFromNotificationText(SAMPLE_TSLPRB_PC_NOTIFICATION, 'Telangana Police Constable (SCT PC Civil)');
  
  assert.equal(result.is_official_gazette, true);
  assert.equal(result.pattern.total_questions, 200);
  assert.equal(result.pattern.total_marks, 200);
  assert.equal(result.pattern.duration_minutes, 180);
  assert.deepEqual(result.pattern.mediums, ['English', 'Telugu', 'Urdu']);
  
  // 8 Official Syllabus Topics
  assert.equal(result.syllabus_topics.length, 8);
  assert.ok(result.syllabus_topics.some(t => t.includes('English')));
  assert.ok(result.syllabus_topics.some(t => t.includes('Arithmetic')));
  assert.ok(result.syllabus_topics.some(t => t.includes('General Science')));
  assert.ok(result.syllabus_topics.some(t => t.includes('History of India')));
  assert.ok(result.syllabus_topics.some(t => t.includes('Indian Geography')));
  assert.ok(result.syllabus_topics.some(t => t.includes('Current events')));
  assert.ok(result.syllabus_topics.some(t => t.includes('Test of Reasoning')));
  assert.ok(result.syllabus_topics.some(t => t.includes('State of Telangana')));

  // Multi-stage breakdown
  assert.equal(result.stages.length, 3);
  assert.ok(result.stages[0].stage_name.includes('Preliminary Written Test'));
  assert.ok(result.stages[1].stage_name.includes('Physical'));
  assert.ok(result.stages[2].stage_name.includes('Final Written Examination'));
  assert.equal(result.stages[0].papers[0].total_questions, 200);
  assert.equal(result.stages[0].papers[0].sections.length, 8);
});

const SAMPLE_TGPSC_NOTIFICATION = `
TELANGANA PUBLIC SERVICE COMMISSION :: HYDERABAD
NOTIFICATION NO. 04/2024, DATED: 19/02/2024
GROUP-I SERVICES (GENERAL RECRUITMENT)

SCHEME AND SYLLABUS FOR THE POST OF GROUP-I SERVICES
Written Examination (Objective Type):
Preliminary Test: General Studies and Mental Ability - 150 Questions, 150 Minutes, 150 Marks.
Medium of Examination: English, Telugu & Urdu. Negative marking: 0.25 mark for each wrong answer.

ANNEXURE - III
SYLLABUS FOR PRELIMINARY TEST
1. Current Affairs - Regional, National and International.
2. International Relations and Events.
3. General Science; India's Achievements in Science and Technology.
4. Environmental Issues; Disaster Management - Prevention and Mitigation Strategies.
5. Economic and Social Development of India.
6. World Geography, Indian Geography and Geography of Telangana State.
7. History and Cultural Heritage of India.
8. Indian Constitution and Polity.
9. Governance and Public Policy in India.
10. Policies of Telangana State.
11. Society, Culture, Heritage, Arts and Literature of Telangana.
12. Social Exclusion: Rights issues such as Gender, Caste, Tribe, Disability etc.
13. Logical Reasoning: Analytical Ability and Data Interpretation.
`;

await test('extractSyllabusFromNotificationText extracts TGPSC Group 1 topics and scheme', () => {
  const result = extractSyllabusFromNotificationText(SAMPLE_TGPSC_NOTIFICATION, 'TGPSC Group-I Services');
  
  assert.equal(result.is_official_gazette, true);
  assert.equal(result.pattern.total_questions, 150);
  assert.equal(result.pattern.total_marks, 150);
  assert.equal(result.pattern.duration_minutes, 150);
  assert.equal(result.pattern.negative_marking_rate, 0.25);
  
  assert.equal(result.syllabus_topics.length, 13);
  assert.ok(result.syllabus_topics.some(t => t.includes('Current Affairs')));
  assert.ok(result.syllabus_topics.some(t => t.includes('International Relations')));
  assert.ok(result.syllabus_topics.some(t => t.includes('Logical Reasoning')));
});

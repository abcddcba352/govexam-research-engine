import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import type { ExamRecord, ExamIdentification } from '../../src/types.ts';
import { isAuthenticOfficialDocument } from '../researchEvidence.ts';
import { executeResearch } from '../researchService.ts';
import { saveExams, getSources } from '../dbService.ts';

// Ensure isolated testing environment
fs.mkdirSync('work', { recursive: true });
process.chdir(fs.mkdtempSync(path.join(process.cwd(), 'work', 'broken-link-test-')));
process.env.NODE_ENV = process.env.APP_ENV = 'test';
process.env.PERSISTENCE_BACKEND = 'JSON_FIXTURE';

const sscCglExam: ExamRecord = {
  exam_id: 'ssc_cgl_tier_1',
  intake_id: 'intake_cgl_2026',
  title: 'SSC Combined Graduate Level Examination Tier-I',
  commission: 'Staff Selection Commission (SSC)',
  state_or_central: 'Central',
  post: 'Combined Graduate Level Posts (Group B & C)',
  stage: 'Tier-I',
  paper: 'Paper I (Tier-I Computer Based Examination)',
  recruitment_cycle: 'Combined Graduate Level Examination, 2026',
  status: 'INTAKE_SUBMITTED',
  exam_profile_status: 'RESEARCH_REQUIRED',
  pattern_status: 'UNVERIFIED',
  pattern: {
    total_questions: 100,
    duration_minutes: 60,
    total_marks: 200,
    marks_per_question: 2,
    negative_marking_rate: 0.50,
    sections: [
      'General Intelligence and Reasoning',
      'General Awareness',
      'Quantitative Aptitude',
      'English Comprehension'
    ],
    mediums: ['English', 'Hindi']
  },
  syllabus_topics: [
    'General Intelligence and Reasoning',
    'General Awareness',
    'Quantitative Aptitude',
    'English Comprehension'
  ],
  created_at: '2026-09-09',
  updated_at: '2026-09-09'
};

const authenticNoticeText = `
GOVERNMENT OF INDIA
STAFF SELECTION COMMISSION
Notice
Combined Graduate Level Examination, 2026
File No. HQ-PPII03(1)/2/2026-PP_II
Staff Selection Commission will hold the Combined Graduate Level Examination, 2026 for filling up various Group 'B' and Group 'C' posts.

Scheme of Examination:
Scheme of Tier-I Examination:
The Examination will consist of Computer Based Examination:
Tier-I:
Part A: General Intelligence and Reasoning - 25 Questions, 50 Maximum Marks.
Part B: General Awareness - 25 Questions, 50 Maximum Marks.
Part C: Quantitative Aptitude - 25 Questions, 50 Maximum Marks.
Part D: English Comprehension - 25 Questions, 50 Maximum Marks.
Total Questions: 100 questions. Maximum Marks: 200 marks.
Time allowed: 1 hour (60 minutes).
Negative Marking: There will be negative marking of 0.50 marks for each wrong answer in Tier-I.
Question paper will be set in English and Hindi for Parts A, B and C.
`;

const unauthenticBlogText = `
Top SSC CGL 2026 Exam Tips and Strategy by ExamCoach Blog.
You should study hard for Tier 1 which has 100 questions for 200 marks.
Duration is 60 minutes. Negative marking is 0.5 marks.
Download our app today to buy test series at 50% discount!
`;

await test('isAuthenticOfficialDocument correctly distinguishes authentic commission notice vs coaching blog', () => {
  const id: ExamIdentification = {
    commission: 'Staff Selection Commission (SSC)',
    state_or_central: 'Central',
    exam: 'SSC Combined Graduate Level Examination Tier-I',
    post: 'Combined Graduate Level Posts (Group B & C)',
    stage: 'Tier-I',
    recruitment_cycle: 'Combined Graduate Level Examination, 2026',
    paper: 'Paper I (Tier-I Computer Based Examination)'
  };

  assert.equal(isAuthenticOfficialDocument(authenticNoticeText, id), true);
  assert.equal(isAuthenticOfficialDocument(unauthenticBlogText, id), false);
});

await test('Direct official link failure triggers all-sites search and authenticates mirror document', async () => {
  saveExams([sscCglExam]);

  const brokenOfficialUrl = 'https://ssc.gov.in/api/notices/broken_404_cgl_2026.pdf';
  const mirrorUrl = 'https://educational-portal-mirror.org/ssc/Notice_CGL_2026_Official.pdf';

  const fetchCalls: string[] = [];
  const mockFetchPage = async (url: string) => {
    fetchCalls.push(url);
    if (url.includes('ssc.gov.in')) {
      return { text: '', status: 404, success: false, url, error: 'HTTP 404 Not Found' };
    }
    if (url === mirrorUrl) {
      return { text: authenticNoticeText, status: 200, success: true, url, isPdf: true, discoveredLinks: [] };
    }
    return { text: '', status: 404, success: false, url };
  };

  const mockDiscover = async (id: ExamIdentification, mode: any, options: any) => {
    assert.ok(options.officialDomains.includes('ssc.gov.in'));
    assert.ok(options.excludedUrls.includes(brokenOfficialUrl));

    const page = await mockFetchPage(mirrorUrl);
    const isMirror = isAuthenticOfficialDocument(page.text, id);

    return {
      facts: [
        {
          fact: 'total_questions',
          critical_field: 'question_count',
          value: '100',
          source_url: mirrorUrl,
          evidence_text: 'Total Questions: 100 questions. Maximum Marks: 200 marks.',
          authority_verified: true,
          evidence_validated: true,
          trust_level: 'LEVEL_5_OFFICIAL'
        },
        {
          fact: 'total_marks',
          critical_field: 'marks',
          value: '200',
          source_url: mirrorUrl,
          evidence_text: 'Total Questions: 100 questions. Maximum Marks: 200 marks.',
          authority_verified: true,
          evidence_validated: true,
          trust_level: 'LEVEL_5_OFFICIAL'
        },
        {
          fact: 'duration',
          critical_field: 'duration',
          value: '60 minutes',
          source_url: mirrorUrl,
          evidence_text: 'Time allowed: 1 hour (60 minutes).',
          authority_verified: true,
          evidence_validated: true,
          trust_level: 'LEVEL_5_OFFICIAL'
        },
        {
          fact: 'negative_marking',
          critical_field: 'negative_marking',
          value: '0.50 marks',
          source_url: mirrorUrl,
          evidence_text: 'Negative Marking: There will be negative marking of 0.50 marks for each wrong answer in Tier-I.',
          authority_verified: true,
          evidence_validated: true,
          trust_level: 'LEVEL_5_OFFICIAL'
        },
        {
          fact: 'authority',
          critical_field: 'authority',
          value: 'Staff Selection Commission (SSC)',
          source_url: mirrorUrl,
          evidence_text: 'STAFF SELECTION COMMISSION Notice Combined Graduate Level Examination, 2026',
          authority_verified: true,
          evidence_validated: true,
          trust_level: 'LEVEL_5_OFFICIAL'
        },
        {
          fact: 'exam_name',
          critical_field: 'exam_name',
          value: 'SSC Combined Graduate Level Examination Tier-I',
          source_url: mirrorUrl,
          evidence_text: 'Combined Graduate Level Examination, 2026',
          authority_verified: true,
          evidence_validated: true,
          trust_level: 'LEVEL_5_OFFICIAL'
        },
        {
          fact: 'recruitment_cycle',
          critical_field: 'recruitment_cycle',
          value: 'Combined Graduate Level Examination, 2026',
          source_url: mirrorUrl,
          evidence_text: 'Combined Graduate Level Examination, 2026',
          authority_verified: true,
          evidence_validated: true,
          trust_level: 'LEVEL_5_OFFICIAL'
        },
        {
          fact: 'stage_tier',
          critical_field: 'stage_tier',
          value: 'Tier-I',
          source_url: mirrorUrl,
          evidence_text: 'Scheme of Tier-I Examination:',
          authority_verified: true,
          evidence_validated: true,
          trust_level: 'LEVEL_5_OFFICIAL'
        },
        {
          fact: 'paper',
          critical_field: 'paper',
          value: 'Paper I (Tier-I Computer Based Examination)',
          source_url: mirrorUrl,
          evidence_text: 'Tier-I: Part A: General Intelligence and Reasoning - 25 Questions',
          authority_verified: true,
          evidence_validated: true,
          trust_level: 'LEVEL_5_OFFICIAL'
        },
        {
          fact: 'language_rules',
          critical_field: 'language_rules',
          value: 'English, Hindi',
          source_url: mirrorUrl,
          evidence_text: 'Question paper will be set in English and Hindi for Parts A, B and C.',
          authority_verified: true,
          evidence_validated: true,
          trust_level: 'LEVEL_5_OFFICIAL'
        },
        {
          fact: 'section_structure',
          critical_field: 'section_structure',
          value: 'Part A: General Intelligence and Reasoning, Part B: General Awareness, Part C: Quantitative Aptitude, Part D: English Comprehension',
          source_url: mirrorUrl,
          evidence_text: 'Part A: General Intelligence and Reasoning Part B: General Awareness Part C: Quantitative Aptitude Part D: English Comprehension',
          authority_verified: true,
          evidence_validated: true,
          trust_level: 'LEVEL_5_OFFICIAL'
        },
        {
          fact: 'syllabus_version',
          critical_field: 'syllabus_version',
          value: 'CGL 2026 Gazette Scheme',
          source_url: mirrorUrl,
          evidence_text: 'Scheme of Examination: Scheme of Tier-I Examination',
          authority_verified: true,
          evidence_validated: true,
          trust_level: 'LEVEL_5_OFFICIAL'
        }
      ],
      sources: [
        {
          url: mirrorUrl,
          title: 'Notice_CGL_2026_Official.pdf (Official Commission Mirror via educational-portal-mirror.org)',
          domain: 'educational-portal-mirror.org',
          content: authenticNoticeText,
          level: 'LEVEL_5_OFFICIAL',
          document_type: 'PDF',
          is_official_mirror: true
        }
      ],
      discoveredPdfs: [mirrorUrl],
      previousPapers: [{ title: 'SSC CGL Tier-I 2024 Solved Paper', url: 'https://mirror.org/cgl2024.pdf', year: '2024' }],
      youtubeSources: [{ title: 'SSC CGL 2026 Notification & Syllabus Breakdown', url: 'https://youtube.com/watch?v=mock123', channel: 'ExamPrep', snippet: 'Official analysis' }],
      diagnostics: [
        { stage: 'SEARCH', target: 'ssc cgl 2026', status: 'SEARCH_OK', detail: 'Found mirror links' },
        { stage: 'MIRROR_RECOVERY', target: mirrorUrl, status: 'OFFICIAL_MIRROR_VERIFIED', detail: 'Recovered authentic official commission notice from mirror.' }
      ]
    };
  };

  const result = await executeResearch(
    {
      exam_id: 'ssc_cgl_tier_1',
      exam_query: 'SSC CGL Tier 1',
      user_provided_urls: [brokenOfficialUrl],
      research_mode: 'DIRECT_WEB'
    },
    {
      fetchPage: mockFetchPage,
      generate: async () => ({ text: '{"facts":[]}' }),
      discover: mockDiscover as any
    }
  );

  const brokenDiag = result.collection_diagnostics.find(d => d.status === 'BROKEN_OFFICIAL_LINK');
  assert.ok(brokenDiag, 'BROKEN_OFFICIAL_LINK diagnostic must be present');
  assert.equal(brokenDiag.target, brokenOfficialUrl);

  const dbSources = getSources();
  const mirrorSource = dbSources.find(s => s.url === mirrorUrl);
  assert.ok(mirrorSource, 'Mirror source must be present in database sources');
  assert.equal(mirrorSource.source_level, 'LEVEL_5_OFFICIAL');

  const collected = result.collected_sources?.find(s => s.url === mirrorUrl);
  assert.ok(collected, 'Mirror source must be in collected_sources');
  assert.ok(collected.title.includes('Official Commission Mirror'));

  assert.ok(
    result.ui_message?.includes('Official link unreachable. Failover searched all sites and authenticated official commission mirror'),
    `ui_message should mention mirror recovery, got: "${result.ui_message}"`
  );

  const verifiedFacts = result.facts.filter(f => f.evidence_validated);
  assert.ok(verifiedFacts.length >= 10, `Expected at least 10 verified facts, got: ${verifiedFacts.length}`);
});

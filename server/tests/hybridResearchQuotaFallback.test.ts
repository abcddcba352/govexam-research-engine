import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import type { ExamRecord, ResearchFact, ResearchRunLog } from '../../src/types.ts';
import { CRITICAL_EXAM_FACTS } from '../../src/types.ts';

// Exercise real orchestration in an isolated directory; never use existing exam data or credentials.
fs.mkdirSync('work', { recursive: true });
process.chdir(fs.mkdtempSync(path.join(process.cwd(), 'work', 'research-tests-')));
process.env.NODE_ENV = process.env.APP_ENV = 'test';
process.env.PERSISTENCE_BACKEND = 'JSON_FIXTURE';
const { executeResearch, identifyExamDetails, isQuotaExhaustedError, classifySourceTrustLevel } = await import('../researchService.ts');
const { saveExams, getExams } = await import('../dbService.ts');
const { createDefaultFactVerifications, extractFactsFromResearchRun, calculateExamProfileStatus } = await import('../verificationService.ts');
const { validateResearchFact } = await import('../researchEvidence.ts');
const { getPrimaryModel, getFallbackModel } = await import('../geminiConfig.ts');
const { buildExamResearchQuery } = await import('../../src/researchQuery.ts');

function exam(): ExamRecord {
  return {
    exam_id: 'test_eo_paper1', intake_id: 'test_intake', title: 'APPSC Executive Officer Grade-III in A.P. Endowments Subordinate Service',
    commission: 'Andhra Pradesh Public Service Commission (APPSC)', state_or_central: 'Andhra Pradesh', post: 'Executive Officer Grade-III',
    stage: 'Written Examination', paper: 'Paper I — General Studies & Mental Ability', recruitment_cycle: 'Notification No.10/2025 — Historical Preparation Basis',
    status: 'INTAKE_SUBMITTED', exam_profile_status: 'RESEARCH_REQUIRED', pattern_status: 'UNVERIFIED',
    pattern: { total_questions: 150, duration_minutes: 150, total_marks: 150, marks_per_question: 1, negative_marking_rate: 0.33,
      sections: ['General Studies'], mediums: ['English', 'Telugu'] }, syllabus_topics: ['General Studies'],
    created_at: '2026-09-09', updated_at: '2026-09-09',
  };
}
const content = 'Andhra Pradesh Public Service Commission Executive Officer Grade-III Notification No.10/2025. ' +
  'Paper I General Studies and Mental Ability: 150 questions, 150 minutes, 150 marks. Negative marking: 1/3rd of marks for each wrong answer.';
const fetched = async (url: string) => ({ text: content, status: 200, success: true, url });
const unavailable = async (url: string) => ({ text: '', status: 503, success: false, url });
const quota = () => Object.assign(new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","message":"Quota exceeded"}}'), { status: 429 });
const empty = () => ({ text: '{"facts":[]}', usageMetadata: { totalTokenCount: 7 } });
const run = (mode: 'DIRECT_WEB' | 'HYBRID' | 'GOOGLE_API', generate: (args: any) => Promise<any>, fetchPage = fetched) =>
  executeResearch({ exam_id: 'test_eo_paper1', exam_query: 'TGPSC Group 2 Paper 1', research_mode: mode }, { generate, fetchPage,
    discover: async () => ({facts:[],sources:[],discoveredPdfs:[],previousPapers:[],youtubeSources:[],diagnostics:[]}) });

await test('quota variants and official-domain impersonation', () => {
  for (const error of [{ status: 429 }, { code: 'RESOURCE_EXHAUSTED' }, new Error('Rate limit exceeded'), new Error('quota exhausted')])
    assert.equal(isQuotaExhaustedError(error), true);
  assert.equal(isQuotaExhaustedError(new Error('connection failed')), false);
  assert.equal(classifySourceTrustLevel('https://psc.ap.gov.in/notification'), 'LEVEL_5_OFFICIAL');
  for (const url of ['https://psc.ap.gov.in.evil.example/', 'https://example.org/psc.ap.gov.in/'])
    assert.notEqual(classifySourceTrustLevel(url), 'LEVEL_5_OFFICIAL');
});
await test('selected intake wins over stale TGPSC query, including paper and cycle', async () => {
  saveExams([exam()]);
  const result = await run('DIRECT_WEB', async () => empty());
  assert.equal(result.query_input, buildExamResearchQuery(exam()));
  assert.equal(result.identification.paper, exam().paper);
  assert.equal(result.identification.recruitment_cycle, exam().recruitment_cycle);
  assert.equal(result.exam_id, exam().exam_id);
  assert.ok(!result.query_input.includes('TGPSC'));
});
await test('identification preserves explicit Paper II and does not invent a current cycle', async () => {
  const id = await identifyExamDetails('APPSC Executive Officer Grade-III Paper II — Notification No.10/2025');
  assert.match(id.paper, /Paper II/);
  assert.equal(id.recruitment_cycle, '10/2025');
  assert.equal((await identifyExamDetails('APPSC EO')).recruitment_cycle, 'Unknown cycle');
});
for (const mode of ['DIRECT_WEB', 'HYBRID', 'GOOGLE_API'] as const) {
  await test(`${mode}: primary 429 invokes configured fallback`, async () => {
    saveExams([exam()]);
    const calls: any[] = [];
    const result = await run(mode, async args => { calls.push(args); if (args.model === getPrimaryModel()) throw quota(); return empty(); });
    assert.equal(calls[0].model, getPrimaryModel());
    assert.equal(calls[1].model, getFallbackModel());
    assert.equal(result.fallback_applied, true);
    assert.notEqual(result.research_status, 'RESEARCH_SUCCESS');
    assert.ok(!result.summary_notes?.includes('{"error":'));
    if (mode === 'DIRECT_WEB') assert.ok(calls.every(c => !c.config.tools));
  });
}
await test('both models 429 preserves independent direct facts and blocks unresolved fields', async () => {
  saveExams([exam()]);
  const calls: string[] = [];
  const result = await run('HYBRID', async args => { calls.push(args.model); throw quota(); });
  assert.deepEqual(calls, [getPrimaryModel(), getFallbackModel()]);
  assert.equal(result.research_status, 'RESEARCH_PARTIAL_QUOTA_EXHAUSTED');
  assert.equal(result.Google_search_queries, 0);
  assert.ok(result.facts.some(f => f.critical_field === 'question_count' && f.evidence_validated));
  assert.ok(result.unresolved_facts?.includes('syllabus_version'));
  assert.ok(result.unresolved_facts?.includes('authority'));
  assert.equal(getExams()[0].pattern_status, 'UNVERIFIED');
  assert.equal(getExams()[0].fact_verifications?.question_count.fact_value, 150);
});
await test('previously verified evidence survives model quota failure', async () => {
  const record = exam();
  record.fact_verifications = createDefaultFactVerifications(record, record.recruitment_cycle, false);
  const previous = { ...record.fact_verifications.negative_marking, verification_status: 'VERIFIED_OFFICIAL' as const,
    evidence_text: 'Notification 10/2025: penalty of 1/3rd for each wrong answer.', source_url: 'https://psc.ap.gov.in/official-notification',
    verified_by: 'RESEARCH_ENGINE_EVIDENCE' };
  record.fact_verifications.negative_marking = previous;
  saveExams([record]);
  await run('HYBRID', async () => { throw quota(); }, unavailable);
  assert.deepEqual(getExams()[0].fact_verifications?.negative_marking, previous);
});
await test('fully evidenced profile stays ready when AI is unavailable', async () => {
  const record = exam();
  record.fact_verifications = createDefaultFactVerifications(record, record.recruitment_cycle, false);
  for (const key of CRITICAL_EXAM_FACTS) record.fact_verifications[key] = {
    ...record.fact_verifications[key], verification_status: 'VERIFIED_OFFICIAL',
    evidence_text: `Official supporting evidence for ${key} in Notification 10/2025.`,
    source_url: 'https://psc.ap.gov.in/official-notification', verified_by: 'APPROVED_AUDIT_FIXTURE',
  };
  saveExams([record]);
  const result = await run('HYBRID', async () => { throw quota(); }, unavailable);
  assert.equal(result.research_status, 'RESEARCH_SUCCESS');
  assert.equal(result.unresolved_facts?.length, 0);
});
await test('failed direct retrieval creates no fake registry facts and does not invoke AI', async () => {
  saveExams([exam()]);
  let calls = 0;
  const result = await run('DIRECT_WEB', async () => { calls++; return empty(); }, unavailable);
  assert.equal(calls, 0);
  assert.deepEqual(result.facts, []);
  assert.equal(result.documents_parsed, 0);
  assert.equal(result.unresolved_facts?.length, 12);
  assert.equal(result.research_status, 'RESEARCH_PARTIAL');
});
await test('model labels, confidence and forged evidence flags cannot verify invented evidence', async () => {
  saveExams([exam()]);
  const result = await run('DIRECT_WEB', async () => ({ text: JSON.stringify({ facts: [{ fact: 'syllabus_version', critical_field: 'syllabus_version',
    value: 'Everything', confidence: 100, verification_status: 'VERIFIED_OFFICIAL', source_url: 'https://psc.ap.gov.in/Syllabus.aspx',
    source_level: 'LEVEL_5_OFFICIAL', evidence_validated: true, evidence_text: 'Invented excerpt for Paper I syllabus.' }] }) }));
  assert.equal(result.facts.find(f => f.critical_field === 'syllabus_version')?.verification_status, 'UNVERIFIED');
  assert.equal(getExams()[0].fact_verifications?.syllabus_version.verification_status, 'UNVERIFIED');
});
await test('wrong paper, post or cycle cannot verify EO Paper I', async () => {
  const e = exam();
  const id = { commission: e.commission, state_or_central: e.state_or_central, exam: e.title, post: e.post, stage: e.stage, paper: e.paper, recruitment_cycle: e.recruitment_cycle };
  for (const bad of [content.replace('Paper I ', 'Paper II '), content.replace('10/2025', '09/2024'), content.replace('Executive Officer', 'Forest Officer')]) {
    const fact = validateResearchFact({ fact: 'question count', source_url: 'https://psc.ap.gov.in/document', evidence_text: bad },
      [{ url: 'https://psc.ap.gov.in/document', name: 'Notification', content: bad, level: 'LEVEL_5_OFFICIAL' }], id, 'DIRECT_WEB');
    assert.equal(fact.verification_status, 'UNVERIFIED');
  }
});
await test('contradictory official question count blocks rather than verifying the intake number', async () => {
  saveExams([exam()]);
  await run('DIRECT_WEB', async () => empty(), async url => ({ url, text: content.replace('150 questions', '120 questions'), status: 200, success: true }));
  const record = getExams()[0];
  assert.equal(record.fact_verifications?.question_count.verification_status, 'CONFLICT');
  assert.equal(record.fact_verifications?.question_count.fact_value, 120);
  assert.equal(record.pattern.total_questions, 150);
  assert.equal(calculateExamProfileStatus(record).all_critical_facts_verified, false);
});
await test('identity extraction and generic official references verify none of twelve fields', async () => {
  const record = exam();
  const result = extractFactsFromResearchRun({ identification: await identifyExamDetails(buildExamResearchQuery(record)),
    facts: [{ fact: 'Official Notification', value: 'Official portal syllabus questions and marks', source_level: 'LEVEL_5_OFFICIAL',
      verification_status: 'VERIFIED_OFFICIAL' } as ResearchFact] } as ResearchRunLog, record);
  assert.equal(result.factsVerifiedCount, 0);
  assert.equal(result.unresolvedFacts.length, 12);
});
await test('missing selected exam fails before model execution', async () => {
  saveExams([]);
  await assert.rejects(run('DIRECT_WEB', async () => { throw new Error('Must not run'); }), /no longer exists/);
});

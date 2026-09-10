import assert from 'node:assert/strict';
import test from 'node:test';
import { findOfficialScheme, fetchExamStructure } from '../examStructureService.ts';

await test('TGPSC Group 1 structure returns 2 selection stages and 7 Mains papers', () => {
  const scheme = findOfficialScheme('TGPSC Group 1');
  assert.ok(scheme, 'TGPSC Group 1 scheme should be found');
  assert.equal(scheme.total_stages, 2);
  assert.ok(scheme.stages[0].stage_name.includes('Preliminary'));
  assert.equal(scheme.stages[0].papers.length, 1);
  assert.equal(scheme.stages[0].papers[0].total_questions, 150);
  assert.equal(scheme.stages[0].papers[0].total_marks, 150);

  // Mains stage
  const mains = scheme.stages[1];
  assert.ok(mains.stage_name.includes('Mains'));
  assert.equal(mains.papers.length, 7); // General English + Papers I to VI
  assert.equal(mains.papers[0].is_qualifying, true);
  assert.equal(mains.total_marks, 900);
});

await test('TSLPRB Police SI structure returns 3 stages with 4 Final Written papers', () => {
  const scheme = findOfficialScheme('TSLPRB Police SI');
  assert.ok(scheme, 'TSLPRB Police SI scheme should be found');
  assert.equal(scheme.total_stages, 3);
  assert.ok(scheme.stages[0].stage_name.includes('Preliminary Written Test'));
  assert.ok(scheme.stages[1].stage_name.includes('Physical Efficiency Test'));
  assert.ok(scheme.stages[2].stage_name.includes('Final Written Examination'));
  assert.equal(scheme.stages[2].papers.length, 4);
});

await test('SSC CGL structure returns 2 tiers with Tier 2 sectional breakdown', () => {
  const scheme = findOfficialScheme('SSC CGL');
  assert.ok(scheme, 'SSC CGL scheme should be found');
  assert.equal(scheme.total_stages, 2);
  assert.ok(scheme.stages[0].stage_name.includes('Tier-I'));
  assert.equal(scheme.stages[0].papers[0].total_questions, 100);
  assert.equal(scheme.stages[0].papers[0].total_marks, 200);

  const tier2 = scheme.stages[1];
  assert.ok(tier2.stage_name.includes('Tier-II'));
  assert.ok(tier2.papers.length >= 1);
});

await test('fetchExamStructure returns cached official scheme synchronously or fast', async () => {
  const result = await fetchExamStructure('TGPSC Group 2');
  assert.ok(result);
  assert.equal(result.source_status, 'VERIFIED_OFFICIAL_CATALOG');
  assert.equal(result.stages[0].papers.length, 4);
  assert.equal(result.stages[0].total_marks, 600);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paperQuestionLanguage,paperLanguageIssues} from '../../src/paperLanguage.ts';
import {isTelanganaTet,telanganaTetScheme} from '../tetScheme.ts';
test('TG TET alternatives have separate subjects and language choices',()=>{
  for(const name of ['tg tet','TG-TET 2026','tstet','Telangana teacher eligibility test'])assert.ok(isTelanganaTet(name));
  assert.ok(!isTelanganaTet('AP TET'));
  const scheme=telanganaTetScheme('TG TET 2026');
  assert.equal(scheme.source_status,'REVIEW_REQUIRED');
  const [p1,maths,social]=scheme.stages[0].papers;
  assert.ok(p1.sections!.includes('Environmental Studies'));
  assert.ok(maths.sections!.includes('Mathematics and Science'));
  assert.ok(!social.sections!.includes('Mathematics and Science'));
  assert.equal(social.language_ii,'English');
  assert.ok(social.language_i_options!.includes('Hindi'));
});
test('medium and language subjects remain independent',()=>{
  const paper='Paper II: Social Studies | Language I: Hindi | Medium: Telugu';
  assert.equal(paperQuestionLanguage(['Telugu'],paper,'Social Studies','History'),'Telugu');
  assert.equal(paperQuestionLanguage(['Telugu'],paper,'Language I','Grammar'),'Hindi');
  assert.equal(paperQuestionLanguage(['Telugu'],paper,'Language II (English)','Grammar'),'English');
  assert.ok(paperLanguageIssues('Telugu','English-only question').length);
  assert.deepEqual(paperLanguageIssues('Telugu','తెలుగు ప్రశ్న'),[]);
  assert.deepEqual(paperLanguageIssues('Hindi','हिंदी प्रश्न'),[]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { evidencePool,hashText } from '../evidencePool.ts';
import { validateFact,questionIssues,selectBank,templateQuestion } from '../freeQuestionBank.ts';
import { FreeCloudEngine,reserveAI,type EngineStore } from '../freeCloudEngine.ts';
import { publisherCategory,allowedPublisher } from '../currentAffairsService.ts';
import type { BankQuestion,EvidenceFact } from '../../src/freeEngine.ts';
import type { ExamRecord,SourceRecord } from '../../src/types.ts';
import { SUBJECTS,subjectsForExam } from '../../src/researchCoverage.ts';

class MemoryStore implements EngineStore {
  rows=new Map<string,{value:any;kind:string;examId:string}>();
  get<T>(key:string):T|undefined {const r=this.rows.get(key);return r?structuredClone(r.value):undefined;}
  put(key:string,value:unknown,kind='state',examId=''){this.rows.set(key,{value:structuredClone(value),kind,examId});}
  list<T>(kind:string,examId?:string,limit=200):T[]{return [...this.rows.values()].filter(r=>r.kind===kind&&(examId===undefined||r.examId===examId)).slice(0,limit).map(r=>structuredClone(r.value));}
  transaction<T>(work:()=>T):T{const before=structuredClone(this.rows);try{return work();}catch(e){this.rows=before;throw e;}}
}
const exam={exam_id:'test_only_exam',title:'Test syllabus fixture',commission:'Test',state_or_central:'Telangana',syllabus_topics:['Science','Percentages'],pattern:{sections:['Science','Mathematics'],total_questions:25,marks_per_question:1,duration_minutes:25,negative_marking_rate:0},fact_verifications:{},exam_profile_status:'UNVERIFIED',preparation_mode:'ACTIVE_NOTIFICATION'} as unknown as ExamRecord;
const text='A telescope collects light to observe distant objects. This science reference explains the role of a telescope and how observations are recorded for scientific research.';
function source(overrides:Partial<SourceRecord>={}):SourceRecord {
  return {source_id:'source_one',title:'Science reference',url:'https://isro.gov.in/science.html',domain:'isro.gov.in',retrieved_at:'2026-09-10T00:00:00Z',source_level:'LEVEL_4_GOVERNMENT',document_type:'SECONDARY',verification_status:'UNVERIFIED',is_current:false,
    research_evidence:{publisher_id:'test',subjects:['science'],kind:'REFERENCE',url:'https://isro.gov.in/science.html',title:'Science reference',text,content_hash:hashText(text),retrieved_at:'2026-09-10T00:00:00Z',verification:'REVIEW_REQUIRED'},...overrides};
}
const fact=(pool:any):EvidenceFact=>({id:'fact_test',exam_id:exam.exam_id,topic:'Science',claim:'A telescope collects light.',answer:'telescope',source_ids:[pool[0].source_id],source_hashes:[pool[0].content_hash],excerpts:[text],kind:'REFERENCE',reviewer:'Fixture reviewer',reviewed_at:'2026-09-10T01:00:00Z'});

test('legacy and scheduled evidence share a pool without promoting verification',()=>{
  const legacy=source({source_id:'legacy',research_evidence:undefined,collected_article:{url:'https://isro.gov.in/news.html',title:'Science news',text:text+' News.',content_hash:hashText(text+' News.'),publication_date:'2026-09-09',retrieved_at:'2026-09-10T00:00:00Z',matched_topics:['Science'],priority_score:90,priority_reasons:[],status:'REVIEW_REQUIRED'}});
  const pool=evidencePool(exam,[source(),legacy],'2026-09-10');assert.equal(pool.length,2);assert.ok(pool.every(e=>e.verification==='REVIEW_REQUIRED'));
});
test('wrong exams, wrong states and corrupted snapshots cannot enter the pool',()=>{
  const base=source();
  assert.equal(evidencePool(exam,[source({exam_id:'other'}),source({research_evidence:{...base.research_evidence!,jurisdiction:'Andhra Pradesh'}}),source({research_evidence:{...base.research_evidence!,content_hash:'corrupt'}})],'2026-09-10').length,0);
});
test('a changed article invalidates facts tied to its older snapshot',()=>{
  const old=source();const initial=evidencePool(exam,[old],'2026-09-10');const reviewed=fact(initial);
  const changed=text+' Corrected measurement details.';
  const newer=source({source_id:'source_new',research_evidence:{...old.research_evidence!,text:changed,content_hash:hashText(changed),retrieved_at:'2026-09-10T02:00:00Z'}});
  const pool=evidencePool(exam,[old,newer],'2026-09-10');assert.equal(pool.length,1);assert.ok(validateFact(reviewed,pool,exam,'2026-09-10').some(e=>e.includes('snapshot')));
});
test('fact checks require retrieved excerpts and an explicitly supported answer',()=>{
  const pool=evidencePool(exam,[source()],'2026-09-10');assert.deepEqual(validateFact(fact(pool),pool,exam,'2026-09-10'),[]);
  assert.ok(validateFact({...fact(pool),answer:'microscope'},pool,exam,'2026-09-10').length);
  assert.ok(validateFact({...fact(pool),excerpts:['Invented text that was never present in the original source document.']},pool,exam,'2026-09-10').length);
});
test('regional reporting cannot be mistaken for government evidence',()=>{
  assert.equal(allowedPublisher('https://telanganatoday.com/example'),true);
  assert.equal(allowedPublisher('https://telanganatoday.com.evil.test/example'),false);
  assert.equal(publisherCategory('https://telanganatoday.com/example'),'SECONDARY');
  const pool=evidencePool(exam,[source()],'2026-09-10').map(e=>({...e,source_family:'telanganatoday.com'}));
  assert.ok(validateFact(fact(pool),pool,exam,'2026-09-10').some(e=>e.includes('independent')));
});
test('transport stories are not classified as sports',()=>{
  assert.equal(SUBJECTS.find(s=>s.id==='sports')!.terms.test('Cabinet approves transport and railway infrastructure'),false);
});
test('qualified current-affairs sections discover sports, schemes, awards and reports',()=>{
  const scoped={...exam,syllabus_topics:[],pattern:{...exam.pattern,sections:['Current Affairs of National and International Importance']}};
  const subjects=subjectsForExam(scoped);
  for(const subject of ['sports','schemes','awards','reports'] as const)assert.ok(subjects.includes(subject));
  assert.ok(!subjects.includes('math'));assert.ok(!subjects.includes('specialist'));
});
test('missing and future event dates block current facts',()=>{
  const pool=evidencePool(exam,[source()],'2026-09-10').map(e=>({...e,kind:'CURRENT' as const,publication_date:'2026-09-09'}));
  assert.ok(validateFact({...fact(pool),kind:'CURRENT'},pool,exam,'2026-09-10').length);
  assert.ok(validateFact({...fact(pool),kind:'CURRENT',event_date:'2026-09-11'},pool,exam,'2026-09-10').length);
});
test('AI reservations are persistent, bounded, and not refunded on failed requests',async()=>{
  const store=new MemoryStore();const cost=reserveAI(store,'A short prompt',100,6000);
  const results=await Promise.allSettled(Array.from({length:10},async()=>reserveAI(store,'A short prompt',100,cost*3)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,2);
  const restarted=new MemoryStore();restarted.rows=structuredClone(store.rows);
  assert.throws(()=>reserveAI(restarted,'A short prompt',100,cost*3),/allowance/);
  assert.equal(restarted.list<any>('budget')[0].calls,3);
  assert.throws(()=>reserveAI(store,'x'.repeat(25000),100),/too large/);
});
test('AI health check reserves the full completion allowance and accepts the hosted chat response',async()=>{
  const store=new MemoryStore();let input:any;
  const engine=new FreeCloudEngine(store,{AI:{run:async(_model:string,args:any)=>{input=args;return {choices:[{message:{content:'OK'},finish_reason:'stop'}]};}}},{} as any);
  const result=await engine.checkAI();
  assert.equal(result.health.status,'AVAILABLE');assert.equal(input.max_completion_tokens,256);
  assert.equal(store.list<any>('budget')[0].calls,1);assert.equal(store.list('question').length,0);
  const truncated=new FreeCloudEngine(store,{AI:{run:async()=>({choices:[{message:{content:''},finish_reason:'length'}]})}},{} as any);
  await assert.rejects(()=>truncated.checkAI(),/output limit/);
  assert.equal(store.list<any>('budget')[0].calls,2);
});
test('mathematical variants have distinct options, one calculated answer and stable hashes',()=>{
  for(const topic of ['Percentages','Simple interest','Linear equations'])for(let seed=0;seed<25;seed++) {
    const result=templateQuestion(topic,seed)!;assert.deepEqual(questionIssues(result.question),[]);
    assert.equal(result.question.canonical_hash,templateQuestion(topic,seed)!.question.canonical_hash);
    const q=result.question;const answer=Number(q.options[q.correct_option_index]);assert.ok(Number.isFinite(answer));
    if(topic==='Linear equations') {const m=q.question_text.match(/(\d+)x \+ (\d+) = (\d+)/)!;assert.equal(Number(m[1])*answer+Number(m[2]),Number(m[3]));}
    if(topic==='Percentages') {const m=q.question_text.match(/has (\d+) books.*? (\d+)%/)!;assert.equal(answer*100,Number(m[1])*Number(m[2]));}
  }
  assert.equal(templateQuestion('Telangana History',5),undefined);
});
const bankQuestion=(qid:string,topic='Science'):BankQuestion=>({id:qid,exam_id:exam.exam_id,topic,subject:'Science',difficulty:'MEDIUM',question:{...templateQuestion('Linear equations',1)!.question,topic,section_name:'Science'},fact_family:qid,status:'READY',issues:[],created_at:'2026-09-10',model:'test'});
test('assembly selection cannot fill gaps with unreviewed, wrong-topic or previously used questions',()=>{
  const slots=[{slot_id:'1',topic:'Science',subject:'Science',difficulty:'MODERATE' as const,answerable_fact_family:''},{slot_id:'2',topic:'Science',subject:'Science',difficulty:'MODERATE' as const,answerable_fact_family:''}];
  const bank=[bankQuestion('one'),{...bankQuestion('pending'),status:'REVIEW_REQUIRED' as const},bankQuestion('wrong','History')];
  assert.equal(selectBank(slots,bank,new Set()).missing.length,1);
  assert.equal(selectBank(slots,bank,new Set(['one'])).missing.length,2);
  assert.equal(selectBank([{...slots[0],core_concept_target:'Specific concept'}],bank,new Set()).missing.length,1);
});
test('unverified exam blocks queueing and assembly before AI or mock writes',async()=>{
  let writes=0,aiCalls=0;
  const repo:any={exams:{getExamById:async()=>exam},sources:{getResearchSources:async()=>[]},mocks:{saveMock:async()=>{writes++;}}};
  const engine=new FreeCloudEngine(new MemoryStore(),{AI:{run:async()=>{aiCalls++;}}},repo);
  await assert.rejects(()=>engine.queue({exam_id:exam.exam_id,topic:'Science',subject:'Science',count:25,cutoff:'2026-09-10'}),/verification is incomplete/);
  await assert.rejects(()=>engine.assemble({job_id:'missing'}),/not found/);
  assert.equal(writes,0);assert.equal(aiCalls,0);
});
test('offline pipeline checkpoints candidates, requires review and retries an uncertain paper write without changes',async()=>{
  const store=new MemoryStore();const saved=new Map<string,any>();let failOnce=true;let calls=0;
  const repo:any={exams:{getExamById:async()=>exam},sources:{getResearchSources:async()=>[]},intelligence:{getIntelligenceProfile:async()=>null},ledger:{getLedgerEntries:async()=>[]},
    mocks:{getMocks:async()=>[...saved.values()],getMockById:async(id:string)=>saved.get(id)||null,saveMock:async(m:any)=>{saved.set(m.mock_id,m);if(failOnce){failOnce=false;throw Error('Write acknowledgement lost');}}}};
  const ready:any=()=>({can_generate:true,missing_requirements:[]});
  const engine=new FreeCloudEngine(store,{AI:{run:async()=>{calls++;}}},repo,ready);
  const {job}=await engine.queue({exam_id:exam.exam_id,topic:'Percentages',topics:['Percentages'],subject:'Mathematics',mode:'TOPIC_WISE',difficulty:'EASY',count:2,cutoff:'2026-09-10'});
  await engine.tick();await engine.tick();await engine.tick();
  const pending=store.list<BankQuestion>('question');assert.equal(pending.length,2);assert.ok(pending.every(q=>q.status==='REVIEW_REQUIRED'));
  await assert.rejects(()=>engine.assemble({job_id:job.id}),/slots need checked/);assert.equal(saved.size,0);
  for(const q of pending)await engine.reviewQuestion({id:q.id,action:'accept',answer_index:q.question.correct_option_index,notes:'Checked using independent arithmetic.',reviewer:'Test reviewer'});
  await engine.tick();
  await assert.rejects(()=>engine.assemble({job_id:job.id}),/acknowledgement/);
  const snapshot=structuredClone([...saved.values()][0]);
  const restarted=new FreeCloudEngine(store,{AI:{run:async()=>{calls++;}}},repo,ready);
  const result=await restarted.assemble({job_id:job.id});assert.deepEqual(result.mock,snapshot);assert.equal(saved.size,1);assert.equal(calls,0);
  assert.equal(result.mock.total_questions,2);assert.equal(result.mock.negative_marking_rate,0);
});
test('a visual candidate requires explicit figure review before bank approval',async()=>{
  const store=new MemoryStore();
  const visualExam={...exam,syllabus_topics:['Right triangle']};
  const repo:any={exams:{getExamById:async()=>visualExam},sources:{getResearchSources:async()=>[]},intelligence:{getIntelligenceProfile:async()=>null}};
  const engine=new FreeCloudEngine(store,{},repo,(()=>({can_generate:true,missing_requirements:[]})) as any);
  await engine.queue({exam_id:exam.exam_id,topic:'Right triangle',subject:'Mathematics',mode:'TOPIC_WISE',difficulty:'EASY',count:1,cutoff:'2026-09-10'});
  await engine.tick();const q=store.list<BankQuestion>('question')[0];assert.ok(q.question.visual_specification);
  const review={id:q.id,action:'accept',answer_index:q.question.correct_option_index,notes:'Checked the numeric answer independently.',reviewer:'Fixture reviewer'};
  await assert.rejects(()=>engine.reviewQuestion(review),/Check the figure/);
  assert.equal(store.get<BankQuestion>(q.id)?.status,'REVIEW_REQUIRED');
  await engine.reviewQuestion({...review,visual_checked:true});assert.equal(store.get<BankQuestion>(q.id)?.status,'READY');
});

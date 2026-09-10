import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
fs.mkdirSync('work', { recursive: true });
process.chdir(fs.mkdtempSync(path.join(process.cwd(), 'work', 'paper2-tests-')));
process.env.APP_ENV = process.env.NODE_ENV = 'test';
process.env.PERSISTENCE_BACKEND = 'DATABASE';
const { mapExam } = await import('../persistence/examMapping.ts');
const { withExamWorkflow } = await import('../persistence/examWorkflow.ts');
const { setRepositoryRegistryOverride } = await import('../persistence/index.ts');
const { getExams, saveExams } = await import('../dbService.ts');
const { createApp } = await import('../serverApp.ts');
const row = { exam_id:'paper2', title:'APPSC Executive Officer Grade III', authority:'APPSC', paper:'Paper II Hindu Philosophy & Temple System', active_exam_version_id:'v2' };
const pattern = { exam_id:'paper2', exam_pattern_version_id:'v2', recruitment_cycle:'Notification 10/2025', notification_number:'10/2025', question_count:150, marks:150, duration_minutes:150, negative_marking:0.33, language_rules:{languages:['English','Telugu']},section_structure:{sections:['Hindu Philosophy & Temple System'],syllabus_topics:['Vedas'],preparation_mode:'PRE_NOTIFICATION_PREPARATION'} };
let stored: any[] = []; let failRead = false; let failWrite = false; let mockWrites = 0; let examWrites = 0;
setRepositoryRegistryOverride({
 exams: { getExams:async()=>{ if(failRead)throw Error('read unavailable');return structuredClone(stored); }, saveExam:async(e:any)=>{if(failWrite)throw Error('write unavailable');examWrites++; stored=stored.filter(r=>r.exam_id!==e.exam_id).concat(structuredClone(e));} },
 sources: {getSources:async()=>[],saveSource:async()=>{}},
 mocks:{saveMock:async()=>{mockWrites++;}},
} as any);
await test('stored Paper II uses its actual cycle, penalty, subjects, and never invented verified defaults',()=>{
 const exam=mapExam(row,[pattern],[]);
 assert.equal(exam.pattern.negative_marking_rate,0.33);
 assert.equal(exam.recruitment_cycle,'Notification 10/2025');
 assert.deepEqual(exam.syllabus_topics,['Vedas']);
 assert.equal(exam.pattern_status,'UNVERIFIED');
 assert.equal(exam.preparation_mode,'PRE_NOTIFICATION_PREPARATION');
 const empty=mapExam({...row,active_exam_version_id:null},[],[]);
 assert.equal(empty.pattern.total_questions,0);assert.deepEqual(empty.pattern.mediums,[]);
 assert.equal(empty.recruitment_cycle,'Unknown cycle');
});
await test('facts from another cycle cannot verify Paper II',()=>{
 const exam=mapExam(row,[pattern],[{exam_id:'paper2',fact_name:'paper',applicable_cycle:'Notification 24/2021',verification_status:'VERIFIED_OFFICIAL',evidence_text:'Other cycle official paper'}]);
 assert.equal(exam.fact_verifications?.paper.verification_status,'UNVERIFIED');
});
await test('concurrent requests cannot see each other\'s unsaved exam data',async()=>{
 stored=[mapExam(row,[pattern],[])];
 let release:()=>void;const hold=new Promise<void>(resolve=>release=resolve);
 let ready:()=>void;const entered=new Promise<void>(resolve=>ready=resolve);
 const first=withExamWorkflow(async()=>{getExams()[0].title='Request A';ready();await hold;assert.equal(getExams()[0].title,'Request A');});
 await entered;
 await withExamWorkflow(()=>{assert.equal(getExams()[0].title,row.title);});
 release!(); await first;assert.equal(stored[0].title,'Request A');
});
const server=createApp().listen(0,'127.0.0.1'); await once(server,'listening');
const base='http://127.0.0.1:'+(server.address() as any).port;
const post=(url:string,body:any)=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
try {
 await test('intake survives a fresh request and retry reuses the existing record',async()=>{
 stored=[];
 const intake={title:row.title,commission:'APPSC',post:'Executive Officer Grade III',paper:row.paper,stage:'Stage 2 Written Examination',state_or_central:'Andhra Pradesh',recruitment_cycle:'Notification 10/2025',preparation_mode:'PRE_NOTIFICATION_PREPARATION',total_questions:150,duration_minutes:150,marks_per_question:1,negative_marking_rate:0.33,sections:['Hindu Philosophy & Temple System'],syllabus_topics:['Vedas'],mediums:['English','Telugu']};
 const response=await post('/api/intake/create',intake);assert.equal(response.status,201);
 const result=await response.json();
 const fresh=await (await fetch(base+'/api/exams/'+result.exam.exam_id)).json();
 assert.equal(fresh.paper,row.paper);assert.equal(fresh.pattern.negative_marking_rate,0.33);
 const retry=await (await post('/api/intake/create',intake)).json();assert.equal(retry.exam.exam_id,fresh.exam_id);assert.equal(stored.length,1);
 });
 await test('intake succeeds with only title and commission by falling back gracefully',async()=>{
    const response=await post('/api/intake/create',{title:'tgpsc aee civil',commission:'tgpsc'});
    assert.equal(response.status,201);
    const result=await response.json();
    assert.equal(result.exam.title,'tgpsc aee civil');
    assert.equal(result.exam.commission,'tgpsc');
    assert.equal(result.exam.post,'tgpsc aee civil');
    assert.equal(result.exam.paper,'Paper-I');
    assert.equal(result.exam.recruitment_cycle,'Current Notification');
  });
 await test('incomplete Paper II generation returns 409 before any mock is created',async()=>{
 const response=await post('/api/mocks/generate',{exam_id:stored[0].exam_id,preparation_mode:'PRE_NOTIFICATION_PREPARATION'});
 assert.equal(response.status,409);const result=await response.json();assert.equal(result.readiness.can_generate,false);assert.equal(mockWrites,0);
 assert.deepEqual(result.readiness.preparation_basis.source_references,[]);
 });
 await test('missing selected intake fails with 404 before model calls',async()=>{
 const response=await post('/api/research/run',{exam_id:'missing',exam_query:'APPSC Paper II',research_mode:'HYBRID'});assert.equal(response.status,404);
 });
 await test('database failure returns 503 instead of falling back to seeded exams',async()=>{
 failRead=true;try{const response=await fetch(base+'/api/exams');assert.equal(response.status,503);}finally{failRead=false;}
 });
 await test('failed persistence cannot return a successful intake response',async()=>{
 failWrite=true;try{
 const response=await post('/api/intake/create',{title:'New exam',commission:'APPSC',post:'EO',paper:'Paper II',recruitment_cycle:'Notification 10/2025'});assert.equal(response.status,503);
 }finally{failWrite=false;}
 });
} finally {server.close();setRepositoryRegistryOverride(null);}

await test('seed verification labels cannot establish official exam facts', () => {
 const exam = mapExam(row,[pattern],[{ exam_id:'paper2',fact_name:'paper',applicable_cycle:'Notification 10/2025',verification_status:'VERIFIED_OFFICIAL',verified_by:'OFFICIAL_COMMISSION_GAZETTE',evidence_text:'Designated paper: Paper II' }]);
 assert.equal(exam.fact_verifications?.paper.verification_status,'UNVERIFIED');
});
await test('Paper II allocation stays within its specialized syllabus and does not inject current affairs', async () => {
 const { buildQuestionAllocation } = await import('../blueprintService.ts');
 const exam = mapExam(row,[pattern],[]);
 const result=buildQuestionAllocation(exam,'FULL_LENGTH',10);
 assert.deepEqual(result.subjects.map(s=>s.subject),['Hindu Philosophy & Temple System']);
 assert.equal(result.static_current.current_count,0);
 assert.equal(result.topics.reduce((sum,t)=>sum+t.count,0),10);
});

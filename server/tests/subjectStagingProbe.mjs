import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='https://govexam-staging.govexam-staging.workers.dev';
const cutoff=new Date().toISOString().slice(0,10);const reports=[];
const json=async(path,options)=>{const r=await fetch(base+path,{...options,signal:AbortSignal.timeout(60000)});const text=await r.text();let data;try{data=JSON.parse(text);}catch{throw Error(`Non-JSON response ${r.status}: ${text.slice(0,150)}`);}if(!r.ok)throw Error(`${r.status}: ${data.error}`);return data;};
const before=await json('/api/exams/ssc_cgl_tier_1/readiness');
for(const publisher_id of ['icc','fide','pmindia-schemes','pmkisan']) {
 try {
 const result=await json('/api/research/collect-subject',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({exam_id:'ssc_cgl_tier_1',publisher_id,cutoff_date:cutoff})});
 assert.equal(result.model_calls,0);
 if(result.evidence){assert.equal(result.evidence.verification,'REVIEW_REQUIRED');assert.ok(result.evidence.text.length>100);}
 const summary={publisher:publisher_id,status:result.status,saved:result.saved,title:result.evidence?.title,date:result.evidence?.publication_date};
  reports.push(summary);console.log(JSON.stringify(summary));
 }catch(error){const summary={publisher:publisher_id,status:'UNAVAILABLE',error:error.message};reports.push(summary);console.log(JSON.stringify(summary));}
}
const repeat=await json('/api/research/collect-subject',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({exam_id:'ssc_cgl_tier_1',publisher_id:'pmindia-schemes',cutoff_date:cutoff})});
assert.equal(repeat.saved,0);
const coverage=await json('/api/research/coverage/ssc_cgl_tier_1?cutoff_date='+cutoff);
assert.ok(coverage.subjects.some(s=>s.id==='sports'&&s.evidence_count>0));
assert.ok(coverage.subjects.some(s=>s.id==='schemes'&&s.evidence_count>0));
assert.ok(coverage.subjects.some(s=>s.id==='math'&&s.evidence_count===0));
assert.equal(coverage.verification_complete,false);
const after=await json('/api/exams/ssc_cgl_tier_1/readiness');assert.equal(after.can_generate,before.can_generate);
const schedule=await json('/api/research/schedule');assert.equal(schedule.configured,true);
const result={evidence_count:coverage.evidence_count,subjects:coverage.subjects,topics_without_evidence:coverage.topics_without_evidence,repeat_saved:repeat.saved,readiness_unchanged:true,schedule};
reports.push(result);console.log(JSON.stringify(result));
fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/subject-staging-verification.json',JSON.stringify(reports,null,2));

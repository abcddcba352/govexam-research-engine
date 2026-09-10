import fs from 'node:fs';
const base='https://govexam-staging.govexam-staging.workers.dev';
const response=await fetch(base+'/api/exams'); if(!response.ok) throw Error('Exam registry unavailable.');
const exams=await response.json(); const exam=exams.find(e=>e.exam_id==='ssc_cgl_tier_1');
if(!exam)throw Error('SSC CGL record is missing.');
const summaries=[];
for(let run=1;run<=2;run++) {
  const r=await fetch(base+'/api/current-affairs/discover',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({exam_id:exam.exam_id,cutoff_date:new Date().toISOString().slice(0,10)}),signal:AbortSignal.timeout(90000)});
  const data=await r.json();
  const summary={run,http_status:r.status,status:data.status,candidates:data.candidates_found,saved:data.saved_articles,reused:data.reused_articles,model_calls:data.model_calls,articles:data.articles?.map(a=>({title:a.title,published:a.publication_date,topics:a.matched_topics})),diagnostics:data.diagnostics,error:data.error};
  summaries.push(summary); console.log(JSON.stringify(summary));
  if(!r.ok)throw Error('Automatic research failed.');
}
const saved=await fetch(base+'/api/current-affairs/'+exam.exam_id).then(r=>r.json());
const persisted={persisted_articles:saved.articles?.length};summaries.push(persisted);console.log(JSON.stringify(persisted));
fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/autonomous-staging-verification.json',JSON.stringify(summaries,null,2));

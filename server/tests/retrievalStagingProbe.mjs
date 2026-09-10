import fs from 'node:fs';
const origin='https://govexam-staging.govexam-staging.workers.dev';
const cases=process.argv.includes('--pdf-runtime') ? [
  {exam_query:'PDF retrieval diagnostic',research_mode:'DIRECT_WEB',user_provided_urls:['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf']},
] : [
  {exam_query:'SSC CGL Tier I 2026',research_mode:'DIRECT_WEB',user_provided_urls:['https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2026.pdf']},
  {exam_query:'https://www.youtube.com/watch?v=22mBD1zIMFI',research_mode:'DIRECT_WEB'},
];
const results=[];
for(const payload of cases) {
  const start=Date.now();
  try {
    const response=await fetch(origin+'/api/research/run',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(180000)});
    const body=await response.json();
    const result={query:payload.exam_query,status:response.status,seconds:(Date.now()-start)/1000,research_status:body.research_status,sources:body.collected_sources,diagnostics:body.collection_diagnostics,error:body.error};
    results.push(result); console.log(JSON.stringify(result));
  } catch(error) { const result={query:payload.exam_query,error:error.message}; results.push(result); console.log(JSON.stringify(result)); }
}
fs.mkdirSync('work',{recursive:true}); fs.writeFileSync('work/retrieval-staging-results.json',JSON.stringify(results,null,2));

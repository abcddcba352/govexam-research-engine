import fs from 'node:fs';
import {getSubjectPublisher} from '../subjectPublishers.ts';
import {discoverSubjectLinks,collectSubjectEvidence} from '../subjectResearch.ts';
const report=[];
for(const id of process.argv.slice(2).length?process.argv.slice(2):['icc','fide','pmindia-schemes','pmkisan']) {
 try {
  const publisher=getSubjectPublisher(id)!;const links=await discoverSubjectLinks(publisher);
  const evidence=await collectSubjectEvidence(publisher,links[0].url);
  const result={publisher:id,links:links.length,title:evidence.title,url:evidence.url,publication_date:evidence.publication_date,kind:evidence.kind,subjects:evidence.subjects,text_length:evidence.text.length,text_preview:evidence.text.slice(0,180),status:evidence.verification};
  report.push(result);console.log(JSON.stringify(result));
 }catch(e:any){const result={publisher:id,error:e.message};report.push(result);console.log(JSON.stringify(result));process.exitCode=1;}
}
fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/subject-research-live.json',JSON.stringify(report,null,2));

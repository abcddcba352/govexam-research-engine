import 'dotenv/config';
import { setTimeout as wait } from 'node:timers/promises';
import { withExamWorkflow } from './persistence/examWorkflow.ts';
import { getExams, getExamById, getSources } from './dbService.ts';
import { discoverCurrentAffairs } from './autonomousResearch.ts';
import { saveAutonomousArticles } from './autonomousPersistence.ts';
import { validDate, isValidCutoffDate } from '../src/currentAffairs.ts';

process.env.PERSISTENCE_BACKEND ||= 'DATABASE';
const once=process.argv.includes('--once');
const filter=process.argv.find(a=>a.startsWith('--exam='))?.slice(7);
const cutoffArg=process.argv.find(a=>a.startsWith('--cutoff='))?.slice(9);
const hours=Number(process.env.AUTO_RESEARCH_INTERVAL_HOURS||6);
if(!Number.isFinite(hours)||hours<1||hours>168) throw Error('AUTO_RESEARCH_INTERVAL_HOURS must be between 1 and 168.');
const stop=new AbortController();
process.on('SIGINT',()=>stop.abort()); process.on('SIGTERM',()=>stop.abort());
async function cycle() {
  const cutoff=cutoffArg||new Date().toISOString().slice(0,10);
  if(!isValidCutoffDate(cutoff)) throw Error('Invalid cutoff date.');

  const ids=await withExamWorkflow(()=>getExams().filter(e=>!filter||e.exam_id===filter).map(e=>e.exam_id));
  if(!ids.length) throw Error('No matching registered examinations.');
  let failures=0;
  for(const examId of ids) {
    if(stop.signal.aborted) break;
    try {
      const summary=await withExamWorkflow(async()=>{
        const exam=getExamById(examId); if(!exam) throw Error('Examination no longer exists.');
        const existing=getSources(examId).filter(s=>s.exam_id===examId).flatMap(s=>s.collected_article?[s.collected_article]:[]);
        const result=await discoverCurrentAffairs(exam,cutoff,{existing});
        const saved=saveAutonomousArticles(examId,result);
        return {exam_id:examId,status:result.status,saved,relevant:result.articles.length,failures:result.failures,model_calls:0};
      });
      console.log(JSON.stringify(summary));
    } catch(error:any) { failures++; console.error(JSON.stringify({exam_id:examId,status:'FAILED',error:error.message})); }
  }
  if(once&&failures) process.exitCode=1;
}
do {
  try { await cycle(); } catch(error:any) { console.error(error.message); if(once) process.exitCode=1; }
  if(once||stop.signal.aborted) break;
  console.log(`Next collection in ${hours} hours. Stop with Ctrl+C. This worker collects evidence; it does not generate papers.`);
  try { await wait(hours*60*60*1000,undefined,{signal:stop.signal}); } catch { break; }
} while(!stop.signal.aborted);

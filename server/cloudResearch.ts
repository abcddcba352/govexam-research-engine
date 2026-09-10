import type { ExamRecord, SourceRecord } from '../src/types.ts';
import { subjectsForExam, evidenceEligible, type ResearchEvidence } from '../src/researchCoverage.ts';
import { SUBJECT_PUBLISHERS, getSubjectPublisher, publisherApplies, type SubjectPublisher } from './subjectPublishers.ts';
import { discoverSubjectLinks, collectSubjectEvidence, evidenceSource } from './subjectResearch.ts';
import { getRepositoryRegistry } from './persistence/index.ts';

export interface ResearchStateStore {get(key:string,type:'json'):Promise<any>;put(key:string,value:string):Promise<void>}
export interface PublisherProgress {checked_at?:string;status:string;detail:string;saved?:number;next_due?:number}
export interface CloudResearchState {
  version:1; last_scheduled_time?:number;last_run_at?:string;last_success_at?:string;
  pending:Array<{publisher_id:string;url:string;attempts:number}>;
  publishers:Record<string,PublisherProgress>;runs:number;last_action?:string;last_error?:string;
}
const STATE_KEY='subject-research-v1';
export const emptyResearchState=():CloudResearchState=>({version:1,pending:[],publishers:{},runs:0});
export async function readCloudResearchState(store?:ResearchStateStore) {
  return store ? (await store.get(STATE_KEY,'json') as CloudResearchState|null)||emptyResearchState() : null;
}
export function choosePublisher(state:CloudResearchState,exams:ExamRecord[],sources:SourceRecord[],now:number):SubjectPublisher|undefined {
  const scope=new Set(exams.flatMap(subjectsForExam));
  const evidence=sources.flatMap(s=>s.research_evidence?[s.research_evidence]:[]).filter(e=>evidenceEligible(e,new Date(now).toISOString().slice(0,10)));
  const candidates=SUBJECT_PUBLISHERS.filter(p=>p.mode!=='UNAVAILABLE'&&exams.some(e=>publisherApplies(p,e))&&(state.publishers[p.id]?.next_due||0)<=now);
  const gapScore=(p:SubjectPublisher)=>p.subjects.filter(s=>scope.has(s)).reduce((sum,s)=>sum+1/(1+evidence.filter(e=>e.subjects.includes(s)).length),0)/p.subjects.length;
  return candidates.sort((a,b)=>gapScore(b)-gapScore(a)||(state.publishers[a.id]?.checked_at||'').localeCompare(state.publishers[b.id]?.checked_at||''))[0];
}
export async function runCloudResearch(store:ResearchStateStore,scheduledTime:number,options:{
  fetcher?:typeof fetch; repository?:ReturnType<typeof getRepositoryRegistry>;
}={}) {
  const state=(await readCloudResearchState(store))!;
  if((state.last_scheduled_time||0)>=scheduledTime) return state;
  const now=Date.now(),stamp=new Date(now).toISOString();const repository=options.repository||getRepositoryRegistry();
  // Each invocation completes one discovery or one article task. Only advance
  // the checkpoint after database persistence succeeds; stable IDs make retries safe.
  const job=state.pending[0];
  try {
    if(job) {
      const publisher=getSubjectPublisher(job.publisher_id);if(!publisher) throw Error('Unknown publisher in pending task.');
      const evidence=await collectSubjectEvidence(publisher,job.url,options.fetcher);
      if(!evidenceEligible(evidence,stamp.slice(0,10))) throw Error('Article date falls outside the preparation window.');
      const source=evidenceSource(evidence);
      const exists=await repository.sources.getSourceById(source.source_id);
      if(!exists) await repository.sources.saveSource(source);
      state.pending.shift();
      const previous=state.publishers[publisher.id];
      state.publishers[publisher.id]={...previous,checked_at:stamp,status:'EVIDENCE_SAVED',detail:exists?'Unchanged evidence reused.':'Source evidence saved; review required.',saved:(previous?.saved||0)+(exists?0:1)};
      state.last_action=`${publisher.name}: ${exists?'reused':'saved'} article`;
    } else {
      const [exams,sources]=await Promise.all([repository.exams.getExams(),repository.sources.getSources()]);
      const publisher=choosePublisher(state,exams,sources,now);
      if(publisher) {
        state.last_action=`Checking ${publisher.name}`;
        // Persisting failure progress prevents repeatedly polling unavailable publishers.
        state.publishers[publisher.id]={...state.publishers[publisher.id],checked_at:stamp,status:'CHECKING',detail:'Discovering links.',next_due:now+publisher.refresh_hours*3600000};
        try {
          const links=await discoverSubjectLinks(publisher,options.fetcher);
          const seen=sources.flatMap(s=>s.research_evidence?[s.research_evidence]:[]);
          const eligible=links.filter(l=>!l.publication_date||evidenceEligible({kind:publisher.kind,publication_date:l.publication_date} as ResearchEvidence,stamp.slice(0,10)))
            .filter(l=>!seen.some(e=>(e.url===l.url||e.requested_url===l.url)&&now-Date.parse(e.retrieved_at)<publisher.refresh_hours*3600000));
          state.pending=eligible.slice(0,2).map(l=>({publisher_id:publisher.id,url:l.url,attempts:0}));
          state.publishers[publisher.id]={...state.publishers[publisher.id],status:state.pending.length?'QUEUED':'NO_NEW_EVIDENCE',detail:`${links.length} links; ${state.pending.length} articles queued. Retrieved links are not verified facts.`};
          state.last_action=`${publisher.name}: discovered ${links.length} links`;
        }catch(error:any){state.publishers[publisher.id]={...state.publishers[publisher.id],status:'UNAVAILABLE',detail:error.message};throw error;}
      } else state.last_action='No eligible publisher is due; waiting for the next scheduled check.';
    }
    state.last_success_at=stamp;delete state.last_error;
  } catch(error:any) {
    state.last_error=error.message;
    if(job) {
      job.attempts++;
      state.publishers[job.publisher_id]={...state.publishers[job.publisher_id],checked_at:stamp,status:'ARTICLE_FAILED',detail:error.message};
      if(job.attempts>=2) state.pending.shift();
    }
  }
  state.last_run_at=stamp;state.last_scheduled_time=scheduledTime;state.runs++;
  await store.put(STATE_KEY,JSON.stringify(state));
  console.log(JSON.stringify({event:'SUBJECT_RESEARCH_TICK',at:stamp,action:state.last_action,error:state.last_error,pending:state.pending.length,model_calls:0}));
  return state;
}

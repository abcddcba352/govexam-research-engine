import type { ExamRecord, SourceRecord } from './types.ts';
import { normalize, rankArticle, validDate } from './currentAffairs.ts';

export const SUBJECTS = [
  {id:'sports',name:'Sports',terms:/\bsport|\bcricket|\bchess|\bolympic|\bathlet|\btournament/i},
  {id:'schemes',name:'Government schemes',terms:/scheme|welfare|social development|public policy/i},
  {id:'science',name:'Science & technology',terms:/science|scientific|technology|physics|chemistry|biology|space/i},
  {id:'economy',name:'Economy',terms:/econom|banking|budget|finance|financial|investment|electricity|power demand/i},
  {id:'environment',name:'Environment & disasters',terms:/environment|ecolog|climate|disaster|biodiversity/i},
  {id:'history',name:'History & culture',terms:/history|histor|culture|cultural|heritage|dynasty|dance|inscription/i},
  {id:'geography',name:'Geography',terms:/geography|geograph|river|national park|census/i},
  {id:'polity',name:'Constitution & polity',terms:/polity|constitution|governance|legislation|panchayat/i},
  {id:'state',name:'State-specific studies',terms:/andhra|telangana|bifurcation|regional|\bap\b/i},
  {id:'international',name:'International affairs',terms:/international relations|international events|international importance/i},
  {id:'math',name:'Mathematics & data interpretation',terms:/arithmetic|algebra|quantitative|mathemat|geometry|trigonometry|statistics|data interpretation|data analysis/i},
  {id:'reasoning',name:'Reasoning',terms:/reasoning|syllogism|blood relation|analytical ability|mental ability/i},
  {id:'english',name:'English',terms:/english|grammar|comprehension/i},
  {id:'telugu',name:'Telugu',terms:/telugu|తెలుగు/i},
  {id:'awards',name:'Awards & appointments',terms:/award|honour|appointment|appointed|chairperson/i},
  {id:'reports',name:'Reports & indices',terms:/report|indices|ranking|index|survey/i},
  {id:'specialist',name:'Specialist subjects',terms:/veda|hindu|philosophy|temple|endowment|civil engineering|mechanical|electrical/i},
] as const;
export type SubjectId = typeof SUBJECTS[number]['id'];
const isBroadAwareness=(label:string)=>/^(general awareness|general knowledge|current affairs)\b/i.test(label.trim());
export interface ResearchEvidence {
  jurisdiction?:'Andhra Pradesh'|'Telangana';
  publisher_id:string; subjects:SubjectId[]; kind:'CURRENT'|'REFERENCE';
  url:string; requested_url?:string; title:string; text:string; content_hash:string;
  publication_date?:string; retrieved_at:string; verification:'REVIEW_REQUIRED';
}
export function jurisdictionMatches(exam:ExamRecord,jurisdiction?:string):boolean {
  if(!jurisdiction) return true;
  const state=normalize(exam.state_or_central||'');
  if(state==='state') {
    const identity=normalize(exam.commission+' '+exam.title);
    if(/telangana|tgpsc|tspsc|tslprb|tgprb/.test(identity))return jurisdiction==='Telangana';
    if(/andhra|appsc/.test(identity))return jurisdiction==='Andhra Pradesh';
    return false;
  }
  return !state||state==='central'||state===normalize(jurisdiction);
}
export function subjectsForExam(exam:ExamRecord):SubjectId[] {
  const labels=[...exam.pattern.sections,...exam.syllabus_topics];
  const general=labels.some(isBroadAwareness);
  return SUBJECTS.filter(s=>labels.some(t=>s.terms.test(t)) || (general && !['math','reasoning','english','telugu','specialist','state'].includes(s.id))).map(s=>s.id);
}
export function evidenceEligible(e:ResearchEvidence,cutoff:string):boolean {
  if(e.publication_date && (!validDate(e.publication_date)||e.publication_date>cutoff)) return false;
  if(e.kind==='CURRENT' && e.publication_date && (Date.parse(cutoff)-Date.parse(e.publication_date))/86400000>366) return false;
  // Unknown dates remain visible as evidence gaps, never as verified facts.
  return true;
}
export function buildCoverage(exam:ExamRecord,sources:SourceRecord[],cutoff:string) {
  const scope=subjectsForExam(exam);
  const evidence=[...new Map(sources.filter(s=>!s.exam_id||s.exam_id===exam.exam_id).flatMap(s=>s.research_evidence?[s.research_evidence]:[])
    .filter(e=>jurisdictionMatches(exam,e.jurisdiction)&&evidenceEligible(e,cutoff)&&e.subjects.some(s=>scope.includes(s))).map(e=>[e.content_hash,e])).values()];
  const subjects=SUBJECTS.filter(s=>scope.includes(s.id)).map(s=>{
    const found=evidence.filter(e=>e.subjects.includes(s.id));
    return {id:s.id,name:s.name,evidence_count:found.length,missing_dates:found.filter(e=>!e.publication_date).length,
      status:found.length?'REVIEW_REQUIRED':'MISSING_EVIDENCE',last_retrieved_at:found.map(e=>e.retrieved_at).sort().at(-1)};
  });
  const topics=[...new Set([...exam.pattern.sections,...exam.syllabus_topics])].map(topic=>{
    const broad=isBroadAwareness(topic);
    const matches=evidence.filter(e=>broad || rankArticle(e.title+' '+e.text,[topic],e.kind==='REFERENCE'?undefined:e.publication_date,cutoff).matched_topics.length>0);
    return {topic,evidence_count:matches.length,match_level:broad?'BROAD_SECTION':'TOPIC_HINT',status:matches.length?'REVIEW_REQUIRED':'MISSING_EVIDENCE'};
  });
  return {exam_id:exam.exam_id,cutoff_date:cutoff,subjects,topics,evidence,evidence_count:evidence.length,
    topics_without_evidence:topics.filter(t=>!t.evidence_count).length,verification_complete:false,
    question_verification_status:'NOT_ASSESSED',message:'Retrieved evidence and topic matches require review. They do not establish verified answers or mock readiness.'};
}

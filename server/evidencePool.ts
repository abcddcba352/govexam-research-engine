import { createHash } from 'node:crypto';
import type { ExamRecord, SourceRecord } from '../src/types.ts';
import { currentAffairsTopics, normalize, rankArticle, validDate, type CollectedArticle } from '../src/currentAffairs.ts';
import { jurisdictionMatches, subjectsForExam, type ResearchEvidence } from '../src/researchCoverage.ts';

export const hashText=(text:string)=>createHash('sha256').update(text).digest('hex');
export interface EvidenceItem extends ResearchEvidence {source_id:string; source_family:string; matched_topics:string[]; priority_score:number; priority_reasons:string[]}
export function editorialPriority(e:EvidenceItem,exam:ExamRecord,cutoff:string,categoryCount=1) {
  const broad=e.matched_topics.every(t=>/^(general awareness|general knowledge|current affairs)$/i.test(t));
  const syllabus=e.matched_topics.length?(broad?15:45):0;
  const scope=e.jurisdiction?15:/central/i.test(exam.state_or_central)?15:8;
  const age=e.publication_date?(Date.parse(cutoff)-Date.parse(e.publication_date))/86400000:undefined;
  const freshness=e.kind==='REFERENCE'?20:age===undefined?0:age<=30?20:age<=90?15:age<=180?10:5;
  const significant=/\b(eligibility|guidelines|launched|amendment|medal|champion|award|appointed|budget|discovery|record|report|cabinet|scheme)\b/i.test(e.title)?15:5;
  const balance=Math.max(0,5-Math.floor(categoryCount/5));
  return {priority_score:Math.min(100,syllabus+scope+freshness+significant+balance),priority_reasons:[
    ...e.priority_reasons,`Editorial priority: syllabus ${syllabus}, geographic scope ${scope}, ${e.kind==='REFERENCE'?'reference relevance':'freshness'} ${freshness}, significance ${significant}, category balance ${balance}.`,
    'Previous-paper frequency is not assumed in this source score. This score is not a probability of appearing in an exam.'
  ]};
}
export function sourceFamily(url:string) {try{return new URL(url).hostname.toLowerCase().replace(/^www\./,'');}catch{return '';}}

/** Retrieval is never verification. Both legacy formats retain their original hash and date. */
export function evidencePool(exam:ExamRecord,sources:SourceRecord[],cutoff:string):EvidenceItem[] {
  if(!validDate(cutoff)) return [];
  const pool:EvidenceItem[]=[];
  for(const s of sources) {
    if(s.exam_id && s.exam_id!==exam.exam_id) continue;
    const raw=s.research_evidence || s.collected_article || s.research_document;
    if(!raw?.text || raw.text.length<80) continue;
    const kind=s.research_evidence?.kind || (s.collected_article?'CURRENT':'REFERENCE');
    const publication=s.research_evidence?.publication_date || s.collected_article?.publication_date || s.publication_date;
    if(publication && (!validDate(publication)||publication>cutoff)) continue;
    if(kind==='CURRENT' && publication && Date.parse(cutoff)-Date.parse(publication)>366*86400000) continue;
    if(!jurisdictionMatches(exam,s.research_evidence?.jurisdiction)) continue;
    const title=s.research_evidence?.title || s.collected_article?.title || s.title;
    const url=s.research_evidence?.url || s.collected_article?.url || s.url;
    const ranking=rankArticle(title+' '+raw.text,currentAffairsTopics(exam),kind==='CURRENT'?publication:undefined,cutoff);
    const subjects=s.research_evidence?.subjects || subjectsForExam(exam);
    if(!ranking.matched_topics.length && !subjects.some(x=>subjectsForExam(exam).includes(x))) continue;
    const content_hash=hashText(raw.text);
    // Do not silently reuse a corrupted snapshot with its old verification hash.
    if(raw.content_hash && raw.content_hash!==content_hash) continue;
    pool.push({source_id:s.source_id,publisher_id:s.research_evidence?.publisher_id||sourceFamily(url),source_family:sourceFamily(url),
      subjects,kind,url,title,text:raw.text,publication_date:publication,retrieved_at:raw.retrieved_at||s.retrieved_at,
      content_hash,jurisdiction:s.research_evidence?.jurisdiction,verification:'REVIEW_REQUIRED',...ranking});
  }
  const latest=new Map<string,EvidenceItem>();
  for(const e of pool.sort((a,b)=>b.retrieved_at.localeCompare(a.retrieved_at)))if(!latest.has(e.url))latest.set(e.url,e);
  const unique=[...new Map([...latest.values()].map(e=>[e.source_family+':'+e.content_hash,e])).values()];
  return unique.map(e=>({...e,...editorialPriority(e,exam,cutoff,unique.filter(x=>x.subjects[0]===e.subjects[0]).length)})).sort((a,b)=>b.priority_score-a.priority_score);
}
export function currentArticlePool(exam:ExamRecord,sources:SourceRecord[],cutoff:string):CollectedArticle[] {
  return evidencePool(exam,sources,cutoff).filter(e=>e.kind==='CURRENT'&&validDate(e.publication_date)&&e.matched_topics.length)
    .map(e=>({...e,status:'REVIEW_REQUIRED' as const}));
}
export function supportsExcerpt(text:string,excerpt:string) {
  return typeof excerpt==='string' && normalize(excerpt).length>=40 && normalize(text).includes(normalize(excerpt));
}

import { getSources, saveSource } from './dbService.ts';
import { createHash } from 'node:crypto';
import type { AutoResearchResult } from './autonomousResearch.ts';

export function saveAutonomousArticles(examId:string,result:AutoResearchResult):number {
  const existing=getSources(examId).filter(s=>s.exam_id===examId);
  let saved=0;
  for(const article of result.articles) {
    if(existing.some(s=>s.collected_article?.content_hash===article.content_hash)) continue;
    const sourceId='auto_'+createHash('sha256').update(examId+'\n'+article.content_hash).digest('hex').slice(0,32);
    const source=saveSource({source_id:sourceId,exam_id:examId,title:article.title,url:article.url,domain:new URL(article.url).hostname,
      source_level:'LEVEL_4_GOVERNMENT',document_type:'SECONDARY',verification_status:'UNVERIFIED',
      publication_date:article.publication_date,is_current:false,collected_article:article});
    // Repeat/concurrent runs upsert the same record; corrections produce a new
    // content version instead of overwriting evidence supporting older papers.
    existing.push(source); saved++;
  }
  return saved;
}

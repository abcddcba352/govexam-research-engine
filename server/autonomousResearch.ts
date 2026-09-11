import type { ExamRecord } from '../src/types.ts';
import { rankArticle, currentAffairsTopics, validDate, isValidCutoffDate, parsePublicationDate, type CollectedArticle } from '../src/currentAffairs.ts';

import { allowedPublisher, collectCurrentAffairs } from './currentAffairsService.ts';
import { readPublic, attributes, decodeHtml, textFromHtml } from './retrievalHttp.ts';

export const DEFAULT_RESEARCH_PUBLISHERS = [
  { name: 'PIB press releases', url: 'https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1&reg=1' },
  { name: 'ISRO press releases', url: 'https://www.isro.gov.in/Press.html' },
  { name: 'RBI press releases', url: 'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=' },
];
export interface DiscoveryLink { url:string; title:string; publication_date?:string; publisher:string }
export interface AutoResearchResult {
  articles:CollectedArticle[]; failures:Array<{url:string;reason:string}>;
  diagnostics:Array<{publisher:string;status:string;detail:string}>;
  candidates_found:number; articles_attempted:number; reused_articles:number;
  completed_at:string; model_calls:0; status:'COLLECTED'|'PARTIAL'|'NO_MATCHING_ARTICLES';
}
const xmlText = (value:string) => textFromHtml(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1'));
const publisherCache=new Map<string,{links:DiscoveryLink[];at:number}>();

/** A feed supplies discovery links and dates, never a verified answer. */
export function parsePublisherLinks(body:string, base:string):DiscoveryLink[] {
  const links:DiscoveryLink[]=[];
  const add=(raw:string,title:string,date?:string) => {
    try {
      const url=new URL(decodeHtml(raw.trim()),base); url.hash='';
      // Only follow pages owned by this publisher; never external feed links.
      if(!allowedPublisher(url.href) || url.hostname.replace(/^www\./,'')!==new URL(base).hostname.replace(/^www\./,'')) return;
      if(url.hostname.replace(/^www\./,'')==='pib.gov.in' && /^\/PressRelease/i.test(url.pathname)) {
        // Keep the requested language/region rather than accepting a geo-default redirect.
        const publisher=new URL(base);
        url.searchParams.set('reg',publisher.searchParams.get('reg')||'1');
        url.searchParams.set('lang',publisher.searchParams.get('Lang')||publisher.searchParams.get('lang')||'1');
      }
      if(/\.pdf(?:$|[?#])/i.test(url.href) || title.length<15 || links.some(x=>x.url===url.href)) return;
      links.push({url:url.href,title,publisher:base,publication_date:parsePublicationDate(date)});
    } catch { /* Malformed or external destination. */ }
  };
  const items=[...body.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
  for(const item of items.slice(0,100)) {
    const text=item[2]; const title=xmlText(text.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
    const raw=text.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1];
    const atom=[...text.matchAll(/<link\b([^>]*)\/?\s*>/gi)].map(m=>attributes(m[1])).find(a=>a.href && (!a.rel || a.rel==='alternate'));
    add(raw?xmlText(raw):atom?.href||'',title,text.match(/<(?:pubDate|published)\b[^>]*>([^<]+)</i)?.[1]);
  }
  if(!items.length) {
    // Table rows preserve the publisher's date alongside its article title.
    const rows=[...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
    for(const row of rows.length?rows:[body]) {
      const date=textFromHtml(row).match(/\b(?:\d{1,2}\s+[A-Za-z]{3,9}[,\s]+20\d{2}|[A-Za-z]{3,9}\s*,?\s*\d{1,2}\s*,\s*20\d{2}|20\d{2}-\d{2}-\d{2})\b/)?.[0];
      for(const match of row.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
        const a=attributes(match[1]); const title=textFromHtml(match[2]).replace(/\s+/g,' ');
        if(!a.href || /^(?:home|contact|privacy|terms|archive|read more|press releases|skip to)/i.test(title)) continue;
        if(!/\.html?(?:$|[?#])|prid=\d+|PRID=\d+|\/news\/|\/press-releases\//i.test(a.href)) continue;
        add(a.href,title,date);
      }
    }
  }
  return links.slice(0,100);
}

export async function discoverCurrentAffairs(exam:ExamRecord, cutoff:string, options:{
  fetcher?:typeof fetch; publishers?:typeof DEFAULT_RESEARCH_PUBLISHERS; existing?:CollectedArticle[];
}={}):Promise<AutoResearchResult> {
  if(!isValidCutoffDate(cutoff)) throw Error('Invalid research cutoff.');

  const fetcher=options.fetcher||fetch;
  const topics=currentAffairsTopics(exam);
  const result:AutoResearchResult={articles:[],failures:[],diagnostics:[],candidates_found:0,articles_attempted:0,reused_articles:0,completed_at:'',model_calls:0,status:'NO_MATCHING_ARTICLES'};
  const sources=(options.publishers||DEFAULT_RESEARCH_PUBLISHERS).slice(0,5);
  const batches=await Promise.all(sources.map(async source=>{
    try {
      if(!allowedPublisher(source.url)) throw Error('Publisher is not allowed.');
      const cached=!options.fetcher ? publisherCache.get(source.url) : undefined;
      if(cached && Date.now()-cached.at<15*60*1000) {
        result.diagnostics.push({publisher:source.name,status:'REUSED',detail:`${cached.links.length} links from the last 15 minutes.`});
        return cached.links;
      }
      const page=await readPublic(source.url,{fetcher,timeoutMs:8000,maxBytes:1_500_000,allowUrl:allowedPublisher});
      if(!allowedPublisher(page.url)) throw Error('Publisher redirected outside the source allowlist.');
      const links=parsePublisherLinks(page.text(),page.url);
      if(!options.fetcher && links.length) {
        if(publisherCache.size>=20) publisherCache.delete(publisherCache.keys().next().value!);
        publisherCache.set(source.url,{links,at:Date.now()});
      }
      if(!links.length) result.failures.push({url:source.url,reason:'Publisher returned no readable article links; coverage is incomplete.'});
      result.diagnostics.push({publisher:source.name,status:links.length?'DISCOVERED':'NO_LINKS',detail:`${links.length} article links; feed contents are discovery hints.`});
      return links;
    } catch(e:any) {
      result.diagnostics.push({publisher:source.name,status:'UNAVAILABLE',detail:e.message});
      result.failures.push({url:source.url,reason:e.message}); return [];
    }
  }));
  const candidates=[...new Map(batches.flat().map(x=>[x.url,x])).values()];
  result.candidates_found=candidates.length;
  const ranked=candidates.map(link=>({link,rank:rankArticle(link.title,topics,link.publication_date,cutoff)}))
    .filter(x=>x.rank.status!=='OUTSIDE_WINDOW')
    .sort((a,b)=>b.rank.priority_score-a.rank.priority_score || (b.link.publication_date||'').localeCompare(a.link.publication_date||''));
  // Up to two exploration links per publisher can resolve vague headlines;
  // the full article must still match the syllabus before being retained.
  const selected:DiscoveryLink[]=[]; const publisherCount=new Map<string,number>(); const families=new Set<string>();
  for(const {link,rank} of ranked) {
    const family=link.title.toLowerCase().replace(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g,'').replace(/\d+/g,'').replace(/[^a-z]+/g,' ').trim();
    if(family && families.has(family)) continue;
    const count=publisherCount.get(link.publisher)||0;
    if(count>=5 || (!rank.matched_topics.length && count>=2)) continue;
    selected.push(link); publisherCount.set(link.publisher,count+1);
    if(family) families.add(family);
    if(selected.length>=10) break;
  }
  const toFetch:string[]=[];
  for(const link of selected) {
    const cached=(options.existing||[]).find(a=>(a.url===link.url || a.requested_url===link.url) && Date.now()-Date.parse(a.retrieved_at)>=0 && Date.now()-Date.parse(a.retrieved_at)<6*60*60*1000);
    if(cached) {
      result.articles.push({...cached,...rankArticle(cached.title+' '+cached.text,topics,cached.publication_date,cutoff)});
      result.reused_articles++;
    } else toFetch.push(link.url);
  }
  const collected=await collectCurrentAffairs(exam,toFetch,cutoff,fetcher);
  result.articles_attempted=toFetch.length; result.failures.push(...collected.failures);
  result.articles.push(...collected.articles);
  result.articles=[...new Map(result.articles.filter(a=>a.matched_topics.length && a.status!=='OUTSIDE_WINDOW').map(a=>[a.content_hash,a])).values()]
    .sort((a,b)=>b.priority_score-a.priority_score);
  const rejected=collected.articles.length-collected.articles.filter(a=>a.matched_topics.length && a.status!=='OUTSIDE_WINDOW').length;
  result.diagnostics.push({publisher:'Paper relevance',status:'FILTERED',detail:`${rejected} articles excluded after reading; ${result.reused_articles} recent articles reused. Dates and answers still require verification.`});
  result.completed_at=new Date().toISOString();
  result.status=result.articles.length ? result.failures.length?'PARTIAL':'COLLECTED' : 'NO_MATCHING_ARTICLES';
  return result;
}

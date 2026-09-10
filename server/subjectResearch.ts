import { createHash } from 'node:crypto';
import { SUBJECTS, type ResearchEvidence } from '../src/researchCoverage.ts';
import { parsePublicationDate } from '../src/currentAffairs.ts';
import type { SourceRecord } from '../src/types.ts';
import { allowedPublisher, contentBlock, retrieveArticle } from './currentAffairsService.ts';
import { readPublic, textFromHtml, attributes } from './retrievalHttp.ts';
import { parsePublisherLinks, type DiscoveryLink } from './autonomousResearch.ts';
import type { SubjectPublisher } from './subjectPublishers.ts';

export function subjectLinks(html:string,url:string,publisher:SubjectPublisher):DiscoveryLink[] {
  if(publisher.mode==='REFERENCE') return [{url,title:publisher.name,publisher:url}];
  if(publisher.mode!=='ICC_NEWS') return parsePublisherLinks(html,url).filter(l=>!publisher.title_filter||publisher.title_filter.test(l.title));
  const found:DiscoveryLink[]=[];
  for(const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    try {
      const href=attributes(m[1]).href;if(!href) continue;
      const link=new URL(href,url);
      if(link.hostname!==new URL(url).hostname || !/\/news\/[a-z0-9-]+\/?$/.test(link.pathname)) continue;
      const title=textFromHtml(m[2]).replace(/\s+/g,' ').trim();
      if(title.length>20 && !found.some(x=>x.url===link.href)) found.push({url:link.href,title,publisher:url});
    }catch{/* Reject malformed destinations. */}
  }
  return found.slice(0,50);
}
export async function discoverSubjectLinks(publisher:SubjectPublisher,fetcher:typeof fetch=fetch) {
  if(publisher.mode==='UNAVAILABLE') throw Error(publisher.note);
  if(publisher.mode==='REFERENCE') return subjectLinks('',publisher.url,publisher);
  const page=await readPublic(publisher.url,{fetcher,maxBytes:1_000_000,timeoutMs:8000,allowUrl:allowedPublisher});
  const links=subjectLinks(page.text(),page.url,publisher);
  if(!links.length) throw Error('NO_READABLE_LINKS: publisher coverage is incomplete.');
  // Favor results/records and substantive scheme changes over previews or praise.
  const priority=(title:string)=>(/\b(record|champion|winner|won|medal|ranking|award|guideline|eligibility|cabinet|scheme)\b/i.test(title)?3:0)+(/\bindia\b/i.test(title)?1:0)-(/preview|praise|excited|speech/i.test(title)?2:0);
  return links.sort((a,b)=>priority(b.title)-priority(a.title));
}
export function extractSpecialEvidence(html:string,url:string,publisher:SubjectPublisher):{title:string;text:string;publication_date?:string}|undefined {
  if(['india-geography','telangana-profile','ap-district-profile'].includes(publisher.id)) {
    const selector=publisher.id==='india-geography'?/<div\b[^>]*class=["']dark:text-white["'][^>]*>\s*(?=<p)/i
      :publisher.id==='telangana-profile'?/<div\b[^>]*id=["']MSOZoneCell_WebPartWPQ2["'][^>]*>/i
      :/<div\b[^>]*id=["']post-\d+["'][^>]*class=["'][^"']*hentry[^"']*["'][^>]*>/i;
    const body=contentBlock(html,selector,'div');if(!body)throw Error('Reference content block was not found.');
    return {title:publisher.name,text:textFromHtml(body)};
  }
  if(publisher.id==='fide'||publisher.id==='pmindia-schemes') {
    const body=publisher.id==='fide'
      ?contentBlock(html,/<div\b[^>]*class=["'][^"']*elementor-widget-theme-post-content[^"']*["'][^>]*>/i,'div')
      :contentBlock(html,/<div\b[^>]*class=["'][^"']*content-block[^"']*["'][^>]*>/i,'div');
    if(!body) throw Error('Publisher article body was not found.');
    const rawDate=publisher.id==='fide'
      ?html.match(/elementor-post-info__item--type-date["'][^>]*>[\s\S]{0,500}?<time[^>]*>([^<]+)<\/time>/i)?.[1]
      :html.match(/<span\b[^>]*class=["']date["'][^>]*>([^<]+)<\/span>/i)?.[1];
    return {title:textFromHtml(body.match(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/i)?.[1]||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||publisher.name),text:textFromHtml(body),publication_date:parsePublicationDate(rawDate)};
  }
  if(publisher.id==='icc') {
    for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const raw=JSON.parse(m[1]);const entries=Array.isArray(raw)?raw:[raw,...(raw['@graph']||[])];
        const article=entries.find((x:any)=>x['@type']==='NewsArticle' && typeof x.articleBody==='string');
        if(article) {
          if(article.url && new URL(article.url,url).href!==url) continue;
          return {title:article.headline,text:textFromHtml(article.articleBody),publication_date:parsePublicationDate(article.datePublished)};
        }
      }catch{/* Invalid schema is not evidence. */}
    }
    throw Error('ICC article body/date schema missing; interface text is not evidence.');
  }
  if(publisher.id==='pmkisan') {
    const about=contentBlock(html,/<(?:div|section)\b[^>]*id=["']About["'][^>]*>/i,'div');
    const exclusions=contentBlock(html,/<div\b[^>]*id=["']SchemeExclusion["'][^>]*>/i,'div');
    if(!about) throw Error('PM-KISAN scheme description was not found.');
    return {title:'PM-KISAN: scheme description and exclusions',text:textFromHtml(about+' '+(exclusions||''))};
  }
  return undefined;
}
export async function collectSubjectEvidence(publisher:SubjectPublisher,url:string,fetcher:typeof fetch=fetch):Promise<ResearchEvidence> {
  let article;
  if(['icc','pmkisan','fide','pmindia-schemes','india-geography','telangana-profile','ap-district-profile'].includes(publisher.id)) {
    const page=await readPublic(url,{fetcher,maxBytes:1_000_000,timeoutMs:8000,allowUrl:allowedPublisher});
    if(new URL(page.url).hostname.replace(/^www\./,'')!==new URL(publisher.url).hostname.replace(/^www\./,'')) throw Error('Publisher redirected to a different authority.');
    const extracted=extractSpecialEvidence(page.text(),page.url,publisher)!;
    article={...extracted,url:page.url,requested_url:url,retrieved_at:new Date().toISOString(),content_hash:''};
  } else article=await retrieveArticle(url,fetcher);
  if(!article.text || article.text.length<100 || !article.title) throw Error('Readable subject evidence is missing.');
  const text=article.text.slice(0,30000);
  const subjects=publisher.id==='pib'?publisher.subjects.filter(id=>SUBJECTS.find(s=>s.id===id)!.terms.test(article.title+' '+text)):publisher.subjects;
  if(!subjects.length) throw Error('Article did not match this publisher’s configured subjects.');
  return {...article,text,content_hash:createHash('sha256').update(text).digest('hex'),publisher_id:publisher.id,subjects,kind:publisher.kind,jurisdiction:publisher.jurisdiction,verification:'REVIEW_REQUIRED'};
}
export function evidenceSource(evidence:ResearchEvidence):SourceRecord {
  return {source_id:'research_'+evidence.content_hash, title:evidence.title,url:evidence.url,domain:new URL(evidence.url).hostname,
    source_level:['icc','fide'].includes(evidence.publisher_id)?'LEVEL_2_SECONDARY':'LEVEL_4_GOVERNMENT',
    document_type:'SECONDARY',verification_status:'UNVERIFIED',is_current:false,retrieved_at:evidence.retrieved_at,
    publication_date:evidence.publication_date,research_evidence:evidence};
}

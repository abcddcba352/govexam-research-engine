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
  if(publisher.mode==='HTML_NEWS') {
    const links:DiscoveryLink[]=[];
    for(const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      try {
        const href=attributes(m[1]).href;if(!href)continue;const link=new URL(href,url);link.hash='';
        if(link.hostname!==new URL(url).hostname||!publisher.path_prefix||!link.pathname.startsWith(publisher.path_prefix)||!/\/20\d{2}\//.test(link.pathname))continue;
        const title=textFromHtml(m[2]).replace(/\s+/g,' ').trim();
        if(title.length<20||links.some(l=>l.url===link.href))continue;
        links.push({url:link.href,title,publisher:url});
        if(links.length===30)break;
      }catch{/* Malformed links are not collection jobs. */}
    }
    return links;
  }
  if(publisher.id==='mea') {
    const found:DiscoveryLink[]=[]; const host=new URL(url).hostname.replace(/^www\./,'');
    for(const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      try {
        const href=attributes(m[1]).href;if(!href) continue;const link=new URL(href,url);
        if(link.hostname.replace(/^www\./,'')!==host || !/^\/press-releases\?dtl\/\d+/i.test(link.pathname+link.search)) continue;
        const title=textFromHtml(m[2]).replace(/\s+/g,' ').trim();
        if(title.length<20 || (publisher.title_filter&&!publisher.title_filter.test(title)) || found.some(x=>x.url===link.href)) continue;
        const context=html.slice(Math.max(0,m.index-900),m.index);
        const publication_date=parsePublicationDate(context.match(/<span\b[^>]*class=["'][^"']*date[^"']*["'][^>]*>([^<]+)<\/span>/i)?.[1]);
        found.push({url:link.href,title,publisher:url,publication_date});
      } catch {/* Reject malformed destinations. */}
    }
    return found.slice(0,50);
  }
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
  const page=await readPublic(publisher.url,{fetcher,maxBytes:publisher.tier==='SECONDARY'?2_500_000:1_000_000,timeoutMs:8000,allowUrl:allowedPublisher});
  let discoveryText=page.text();
  let discoveryUrl=page.url;
  if(publisher.id==='mea') {
    const listing=new URL('/FrontEnd/FetchPublicationListingData',page.url);
    listing.searchParams.set('publicationId','51'); listing.searchParams.set('page','1'); listing.searchParams.set('PageSize','20'); listing.searchParams.set('PLngId','1');
    const response=await readPublic(listing.href,{fetcher,maxBytes:1_000_000,timeoutMs:8000,allowUrl:allowedPublisher});
    discoveryText=response.text(); discoveryUrl=page.url;
  }
  const links=subjectLinks(discoveryText,discoveryUrl,publisher);
  if(!links.length) throw Error('NO_READABLE_LINKS: publisher coverage is incomplete.');
  // Favor results/records and substantive scheme changes over previews or praise.
  const priority=(title:string)=>(/\b(record|champion|winner|won|medal|ranking|award|guideline|eligibility|cabinet|scheme)\b/i.test(title)?3:0)+(/\bindia\b/i.test(title)?1:0)-(/preview|praise|excited|speech/i.test(title)?2:0);
  return links.sort((a,b)=>priority(b.title)-priority(a.title));
}
export function extractSpecialEvidence(html:string,url:string,publisher:SubjectPublisher):{title:string;text:string;publication_date?:string}|undefined {
  if(publisher.tier) {
    for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const raw=JSON.parse(m[1]);const nodes=Array.isArray(raw)?raw:[raw,...(raw['@graph']||[])];
        const article=nodes.find((n:any)=>/Article/.test(String(n['@type']))&&typeof n.articleBody==='string');
        if(article?.url&&new URL(article.url,url).hostname!==new URL(url).hostname)continue;
        if(article?.articleBody.length>100)return {title:article.headline||publisher.name,text:textFromHtml(article.articleBody),publication_date:parsePublicationDate(article.datePublished)};
      }catch{/* Fall back only to explicit article/chapter containers. */}
    }
    const body=contentBlock(html,/<article\b[^>]*>/i,'article')||
      contentBlock(html,/<div\b[^>]*data-type=["']page["'][^>]*>/i,'div')||
      contentBlock(html,/<div\b[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>/i,'div');
    if(!body)throw Error('Readable article/chapter content unavailable; the page shell is not evidence.');
    const text=textFromHtml(body.replace(/<(nav|header|footer|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' '));
    const meta=[...html.matchAll(/<meta\b([^>]*)>/gi)].map(m=>attributes(m[1]));
    const date=meta.find(m=>m.property==='article:published_time'||m.itemprop==='datePublished')?.content;
    return {title:textFromHtml(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||publisher.name),text,publication_date:parsePublicationDate(date)};
  }
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
  if(publisher.id==='mea') {
    const body=contentBlock(html,/<div\b[^>]*class=["'][^"']*pressReleaseContent[^"']*["'][^>]*>/i,'div');
    if(!body) throw Error('MEA press-release detail was not found.');
    const title=textFromHtml(body.match(/<h2\b[^>]*class=["'][^"']*titleText[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i)?.[1]||publisher.name);
    const rawDate=body.match(/<span\b[^>]*class=["'][^"']*date[^"']*["'][^>]*>([^<]+)<\/span>/i)?.[1];
    const text=textFromHtml(body.replace(/<(nav|header|footer|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' '));
    return {title,text,publication_date:parsePublicationDate(rawDate)};
  }
  if(['moefcc','ndma','culture-ministry'].includes(publisher.id)) {
    // These are reference pages, so deliberately strip navigation and select
    // the publisher's content container before accepting any text. A broad
    // body fallback is intentionally avoided: menus and cookie banners must
    // never become evidence.
    const selectors:Record<string,RegExp[]>={
      moefcc:[/<div\b[^>]*class=["'][^"']*page-content[^"']*["'][^>]*>/i,/<div\b[^>]*class=["'][^"']*contentArea[^"']*["'][^>]*>/i],
      ndma:[/<div\b[^>]*id=["']main-content["'][^>]*>/i,/<div\b[^>]*class=["'][^"']*about-content[^"']*["'][^>]*>/i],
      'culture-ministry':[/<div\b[^>]*id=["']content["'][^>]*>/i,/<div\b[^>]*class=["'][^"']*view-content[^"']*["'][^>]*>/i],
    };
    const block=selectors[publisher.id].map(selector=>contentBlock(html,selector,'div')||contentBlock(html,selector,'main')).find(Boolean);
    if(!block) throw Error('Reference content block was not found.');
    const text=textFromHtml(block.replace(/<(nav|header|footer|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' '));
    if(text.length<160) throw Error('Reference page returned no substantive content.');
    return {title:publisher.name,text:text.slice(0,30000)};
  }
  return undefined;
}
export async function collectSubjectEvidence(publisher:SubjectPublisher,url:string,fetcher:typeof fetch=fetch):Promise<ResearchEvidence> {
  let article;
  if(publisher.tier||['icc','pmkisan','fide','pmindia-schemes','india-geography','telangana-profile','ap-district-profile','moefcc','ndma','culture-ministry','mea'].includes(publisher.id)) {
    const sourceTimeout=publisher.id==='ndma'?20000:8000;
    let page=await readPublic(url,{fetcher,maxBytes:publisher.tier==='SECONDARY'?2_500_000:1_000_000,timeoutMs:sourceTimeout,allowUrl:allowedPublisher});
    if(publisher.id==='mea') {
      const id=`${new URL(page.url).pathname}${new URL(page.url).search}`.match(/\?dtl\/(\d+)/i)?.[1];
      if(!id) throw Error('MEA press-release detail id was not found.');
      const detail=new URL('/FrontEnd/FetchPublicationDetailData',page.url);detail.searchParams.set('pkid',id);detail.searchParams.set('languageId','1');
      page=await readPublic(detail.href,{fetcher,maxBytes:1_000_000,timeoutMs:sourceTimeout,allowUrl:allowedPublisher});
    }
    if(new URL(page.url).hostname.replace(/^www\./,'')!==new URL(publisher.url).hostname.replace(/^www\./,'')) throw Error('Publisher redirected to a different authority.');
    const extracted=extractSpecialEvidence(page.text(),page.url,publisher)!;
    article={...extracted,url:page.url,requested_url:url,retrieved_at:new Date().toISOString(),content_hash:''};
  } else article=await retrieveArticle(url,fetcher);
  if(!article.text || article.text.length<100 || !article.title) throw Error('Readable subject evidence is missing.');
  const text=article.text.slice(0,30000);
  const jurisdiction=publisher.id==='telangana-today'&&!/\b(telangana|hyderabad|warangal|nizamabad|karimnagar|khammam|adilabad)\b/i.test(article.title+' '+text)?undefined:publisher.jurisdiction;
  const subjects=publisher.id==='pib'||publisher.tier==='SECONDARY'?publisher.subjects.filter(id=>id==='state'?Boolean(jurisdiction):SUBJECTS.find(s=>s.id===id)!.terms.test(article.title+' '+text)):publisher.subjects;
  if(!subjects.length) throw Error('Article did not match this publisher’s configured subjects.');
  return {...article,text,content_hash:createHash('sha256').update(text).digest('hex'),publisher_id:publisher.id,subjects,kind:publisher.kind,jurisdiction,verification:'REVIEW_REQUIRED'};
}
export function evidenceSource(evidence:ResearchEvidence):SourceRecord {
  return {source_id:'research_'+evidence.content_hash, title:evidence.title,url:evidence.url,domain:new URL(evidence.url).hostname,
    source_level:['icc','fide','telangana-today','tnie-telangana','tnie-ap','openstax-biology','openstax-percent'].includes(evidence.publisher_id)?'LEVEL_2_SECONDARY':'LEVEL_4_GOVERNMENT',
    document_type:'SECONDARY',verification_status:'UNVERIFIED',is_current:false,retrieved_at:evidence.retrieved_at,
    publication_date:evidence.publication_date,research_evidence:evidence};
}

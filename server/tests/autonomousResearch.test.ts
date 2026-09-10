import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePublisherLinks,discoverCurrentAffairs } from '../autonomousResearch.ts';
import { rankArticle,currentAffairsTopics } from '../../src/currentAffairs.ts';
const exam:any={syllabus_topics:['Science and Technology'],exam_id:'science',paper:'General Studies'};
const publishers=[{name:'Test primary feed',url:'https://pib.gov.in/feed'}];
const feed=(items:string)=>`<rss><channel>${items}</channel></rss>`;
const item=(url:string,date='2026-09-01')=>`<item><title><![CDATA[ISRO launches satellite research mission]]></title><link>${url}</link><pubDate>${date}</pubDate></item>`;
const article=`<h2>ISRO satellite mission research</h2><meta property="article:published_time" content="2026-09-01T10:00:00Z"><p>On 2026-09-01 ISRO announced a satellite mission for space science and technology research. The announcement describes the purpose and scientific instruments of the mission.</p>`;
const fake=(fn:(url:string)=>Response|Promise<Response>)=>((url:any)=>fn(String(url))) as typeof fetch;
test('RSS and Atom discovery reject external links and PDFs',()=>{
  const links=parsePublisherLinks(feed(item('https://pib.gov.in/a?x=1&amp;y=2')+item('https://pib.gov.in.evil.example/a')+item('https://pib.gov.in/a.pdf')),'https://pib.gov.in/feed');
  assert.equal(links.length,1); assert.equal(links[0].url,'https://pib.gov.in/a?x=1&y=2');
  const atom=parsePublisherLinks('<feed><entry><title>ISRO launches satellite mission</title><link rel="alternate" href="https://pib.gov.in/article"/><published>2026-09-01</published></entry></feed>','https://pib.gov.in/feed');
  assert.equal(atom[0].publication_date,'2026-09-01');
});
test('publication table links preserve dates and ignore navigation',()=>{
  const links=parsePublisherLinks('<table><tr><td><a href="/mission.html">ISRO announces a new satellite mission</a></td><td>September 1, 2026</td></tr></table>','https://www.isro.gov.in/Press.html');
  assert.equal(links[0].publication_date,'2026-09-01');
});
test('automatic collection needs no uploads, search provider, or model',async()=>{
  const calls:string[]=[];
  const result=await discoverCurrentAffairs(exam,'2026-09-09',{publishers,fetcher:fake(url=>{
    calls.push(url); return new Response(url.endsWith('/feed')?feed(item('https://pib.gov.in/article')):article,{headers:{'content-type':'text/html'}});
  })});
  assert.equal(calls.length,2);assert.equal(result.model_calls,0);assert.equal(result.articles.length,1);
  assert.equal(result.articles[0].status,'REVIEW_REQUIRED');assert.equal(result.articles[0].publication_date,'2026-09-01');
});
test('a blocked publisher does not discard another publisher\'s results',async()=>{
  const result=await discoverCurrentAffairs(exam,'2026-09-09',{publishers:[...publishers,{name:'Blocked',url:'https://isro.gov.in/Press.html'}],fetcher:fake(url=>{
    if(url.includes('isro.gov'))return new Response('',{status:403});
    return new Response(url.endsWith('/feed')?feed(item('https://pib.gov.in/a')):article,{headers:{'content-type':'text/html'}});
  })});
  assert.equal(result.status,'PARTIAL');assert.equal(result.articles.length,1);assert.ok(result.failures.some(f=>f.reason==='HTTP_403'));
});
test('future and stale feed entries are excluded before downloading',async()=>{
  let calls=0;
  const result=await discoverCurrentAffairs(exam,'2026-09-09',{publishers,fetcher:fake(()=>{calls++;return new Response(feed(item('https://pib.gov.in/future','2026-09-15')+item('https://pib.gov.in/stale','2023-01-01')));})});
  assert.equal(calls,1);assert.equal(result.articles_attempted,0);
});
test('feed date does not invent a missing article publication date',async()=>{
  const result=await discoverCurrentAffairs(exam,'2026-09-09',{publishers,fetcher:fake(url=>new Response(url.endsWith('/feed')?feed(item('https://pib.gov.in/a')):article.replace(/<meta[^>]+>/,''),{headers:{'content-type':'text/html'}}))});
  assert.equal(result.articles[0].publication_date,undefined);
  assert.ok(result.articles[0].priority_reasons.some(r=>r.includes('missing')));
});
test('recent articles are reused and reranked for the current cutoff',async()=>{
  const options={publishers,fetcher:fake(url=>new Response(url.endsWith('/feed')?feed(item('https://pib.gov.in/a')):article,{headers:{'content-type':'text/html'}}))};
  const first=await discoverCurrentAffairs(exam,'2026-09-09',options);
  const second=await discoverCurrentAffairs(exam,'2026-09-09',{...options,existing:first.articles});
  assert.equal(second.reused_articles,1);assert.equal(second.articles_attempted,0);
});
test('feed redirects cannot fetch an unapproved publisher',async()=>{
  let calls=0;
  const result=await discoverCurrentAffairs(exam,'2026-09-09',{publishers,fetcher:fake(()=>{calls++;return new Response(null,{status:302,headers:{location:'https://example.org/feed'}});})});
  assert.equal(calls,1);assert.equal(result.failures[0].reason,'SOURCE_PUBLISHER_REJECTED');
});
test('article redirects preserve the discovery URL for later cache reuse',async()=>{
 const options={publishers,fetcher:fake(url=>url.endsWith('/a') ? new Response(null,{status:302,headers:{location:'https://www.pib.gov.in/article'}}) : new Response(url.endsWith('/feed')?feed(item('https://pib.gov.in/a')):article,{headers:{'content-type':'text/html'}}))};
 const first=await discoverCurrentAffairs(exam,'2026-09-09',options);
 assert.equal(first.articles[0].requested_url,'https://pib.gov.in/a');
 const second=await discoverCurrentAffairs(exam,'2026-09-09',{...options,existing:first.articles});
 assert.equal(second.reused_articles,1);assert.equal(second.articles_attempted,0);
});
test('science vocabulary helps general studies without changing specialized papers',()=>{
  assert.ok(rankArticle('ISRO launches a satellite',['Science and Technology'],'2026-09-01','2026-09-09').matched_topics.length);
  assert.equal(rankArticle('ISRO launches a satellite',['Vedas and Hindu Philosophy'],'2026-09-01','2026-09-09').priority_score,0);
});
test('registered general-awareness sections support discovery without inventing specific topic matches',()=>{
 const topics=currentAffairsTopics({syllabus_topics:['Indian Polity: Constitutional Amendments & President Executive Powers'],pattern:{sections:['General Awareness (25 Qs / 50 Marks)']}});
 const result=rankArticle('ISRO launches a new satellite',topics,'2026-09-01','2026-09-09');
 assert.deepEqual(result.matched_topics,['General Awareness']);assert.equal(result.priority_score,45);
 assert.ok(result.priority_reasons.some(r=>r.includes('Broad section')));
 const specialist=currentAffairsTopics({syllabus_topics:['Vedas'],pattern:{sections:['Hindu Philosophy and Temple System']}});
 assert.equal(rankArticle('ISRO launches a new satellite',specialist,'2026-09-01','2026-09-09').priority_score,0);
});

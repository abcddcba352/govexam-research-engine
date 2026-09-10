import assert from 'node:assert/strict';
import test from 'node:test';
import { rankArticle, checkCurrentAffairsDates, validDate, parsePublicationDate } from '../../src/currentAffairs.ts';
import { allowedPublisher, collectCurrentAffairs, retrieveArticle, validateArticleEvidence } from '../currentAffairsService.ts';
const content = 'On 2026-09-01 the Andhra Pradesh government announced a temple administration programme. The responsible authority is the Endowments Department. The temple administration programme improves public reporting.';
const html = `<html><head><title>Temple administration programme</title><meta property="article:published_time" content="2026-09-02T10:00:00Z"></head><body>${content}</body></html>`;
const fakeFetch = (async()=>new Response(html,{headers:{'content-type':'text/html'}})) as typeof fetch;
const exam:any = {syllabus_topics:['Temple administration'],paper:'Paper II Hindu Philosophy & Temple System'};
await test('publication calendar dates are timezone independent and reject invalid days',()=>{
 assert.equal(parsePublicationDate('September 1, 2026'),'2026-09-01');
 assert.equal(parsePublicationDate('2026-09-01T10:00:00+05:30'),'2026-09-01');
 assert.equal(parsePublicationDate('Tue, 1 Sep 2026 08:00:00 +0530'),'2026-09-01');
 assert.equal(parsePublicationDate('February 30, 2026'),undefined);
});
await test('RBI article heading and release date exclude the archive year and event date',async()=>{
 const rbi=`<title>Press Releases</title><h2>2026</h2><td align="right" class="tableheader"><b>Date : Sep 09, 2026</b></td><td align="center" class="tableheader"><b>RBI announces a new banking update</b></td><p>${content}</p>`;
 const a=await retrieveArticle('https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=1',(async()=>new Response(rbi,{headers:{'content-type':'text/html'}})) as typeof fetch);
 assert.equal(a.title,'RBI announces a new banking update');assert.equal(a.publication_date,'2026-09-09');
});
await test('date validation rejects missing and rolled-over calendar dates',()=>{
 assert.equal(validDate('2026-02-30'),false); assert.equal(validDate('2024-02-29'),true);assert.equal(validDate('next week'),false);
 assert.ok(checkCurrentAffairsDates(undefined,'2026-09-09').length);
});
await test('same-year future events and later publications are blocked',()=>{
 const e={event_date:'2026-09-15',publication_date:'2026-09-16',source_url:'https://ap.gov.in/news',evidence_snippet:content};
 assert.equal(checkCurrentAffairsDates(e,'2026-09-09').length,2);
 assert.ok(checkCurrentAffairsDates({...e,publication_date:'2026-09-01'},'2026-09-20').some(x=>x.includes('planned')));
});
await test('official-domain impersonation, local addresses, and credentials are rejected',()=>{
 for(const url of ['http://ap.gov.in/news','https://ap.gov.in.evil.example','https://127.0.0.1','https://user:password@ap.gov.in/','https://ap.gov.in:8080/']) assert.equal(allowedPublisher(url),false);
 assert.equal(allowedPublisher('https://pib.gov.in/PressReleasePage.aspx?PRID=1'),true);
});
await test('redirects are checked before fetching the destination',async()=>{
 let calls=0;const redirect=(async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://127.0.0.1'}});}) as typeof fetch;
 await assert.rejects(retrieveArticle('https://ap.gov.in/article',redirect));assert.equal(calls,1);
});
await test('collector deduplicates repeated URLs and mirrored content without model calls',async()=>{
 let calls=0;const fetcher=(async()=>{calls++;return fakeFetch('https://ap.gov.in');}) as typeof fetch;
 const result=await collectCurrentAffairs(exam,['https://ap.gov.in/a','https://ap.gov.in/a','https://ap.gov.in/b'],'2026-09-09',fetcher);
 assert.equal(calls,2);assert.equal(result.articles.length,1);assert.equal(result.articles[0].publication_date,'2026-09-02');
 assert.equal(result.articles[0].status,'REVIEW_REQUIRED');
});
await test('research priority needs paper relevance and never rewards out-of-window articles',()=>{
 assert.equal(rankArticle(content,['Quantum mechanics'],'2026-09-02','2026-09-09').priority_score,0);
 assert.equal(rankArticle(content,exam.syllabus_topics,'2026-09-12','2026-09-09').priority_score,0);
 assert.ok(rankArticle(content,exam.syllabus_topics,'2026-09-02','2026-09-09').priority_score>0);
});
await test('broad vocabulary cannot falsely match a specific constitutional subtopic',()=>{
 const text='The minister inaugurated a new road corridor. Governance and infrastructure were discussed in Parliament.';
 assert.equal(rankArticle(text,['Indian Polity: Constitutional Amendments & President Executive Powers'],'2026-09-09','2026-09-09').priority_score,0);
 assert.ok(rankArticle('Parliament adopted constitutional amendments affecting president executive powers',['Indian Polity: Constitutional Amendments & President Executive Powers'],'2026-09-09','2026-09-09').priority_score>0);
});
await test('recurring operational auctions rank below an equally recent policy article',()=>{
 const topics=['Economy','Current Affairs'];
 const routine=rankArticle('RBI to conduct Overnight Variable Rate Reverse Repo (VRRR) auction',topics,'2026-09-09','2026-09-09');
 const policy=rankArticle('RBI announces monetary policy changes',topics,'2026-09-09','2026-09-09');
 assert.ok(routine.priority_score<policy.priority_score);
});
await test('answer evidence must match retrieved text and explicit event date',async()=>{
 const {articles}=await collectCurrentAffairs(exam,['https://ap.gov.in/a'],'2026-09-09',fakeFetch);
 const evidence={event_date:'2026-09-01',publication_date:'2026-09-02',source_url:'https://ap.gov.in/a',evidence_snippet:content};
 assert.equal(validateArticleEvidence(evidence,articles,'2026-09-09','Endowments Department').valid,true);
 assert.equal(validateArticleEvidence(evidence,articles,'2026-09-09','Finance Department').valid,false);
 assert.equal(validateArticleEvidence({...evidence,event_date:'2026-09-02'},articles,'2026-09-09','Endowments Department').valid,false);
 assert.equal(validateArticleEvidence({...evidence,evidence_snippet:'A made-up official claim with a nonexistent supporting sentence.'},articles,'2026-09-09','Department').valid,false);
});
await test('PDF sources remain unresolved rather than becoming fabricated text',async()=>{
 const result=await collectCurrentAffairs(exam,['https://ap.gov.in/a'],'2026-09-09',(async()=>new Response('%PDF',{headers:{'content-type':'application/pdf'}})) as typeof fetch);
 assert.equal(result.articles.length,0);assert.match(result.failures[0].reason,/PDF/);
});

await test('PIB publication date is read from Posted On, without inventing an event date', async () => {
 const article = await retrieveArticle('https://pib.gov.in/a', (async () => new Response('<h2>Temple conservation programme</h2><p>Posted On: 03 AUG 2026 3:43PM by PIB Delhi</p><p>' + content + '</p>', { headers: { 'content-type': 'text/html' } })) as typeof fetch);
 assert.equal(article.publication_date, '2026-08-03');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCoverage,subjectsForExam } from '../../src/researchCoverage.ts';
import { getSubjectPublisher } from '../subjectPublishers.ts';
import { subjectLinks,discoverSubjectLinks,collectSubjectEvidence,evidenceSource,extractSpecialEvidence } from '../subjectResearch.ts';
import { runCloudResearch,emptyResearchState,choosePublisher } from '../cloudResearch.ts';
import { allowedPublisher } from '../currentAffairsService.ts';
const exam:any={exam_id:'ssc',syllabus_topics:['Constitutional amendments'],pattern:{sections:['General Awareness (25 Qs / 50 Marks)','Quantitative Aptitude (25 Qs / 50 Marks)','English Comprehension']}};
const specialist:any={exam_id:'temple',syllabus_topics:['Vedas and Hindu Philosophy'],pattern:{sections:['Temple System']}};
const icc=getSubjectPublisher('icc')!;
const newsUrl='https://www.icc-cricket.com/news/example-record';
const articleText='India won the cricket tournament final. The official match report identifies the teams, category, venue and final result. This is evidence to inspect before drafting a question.';
const articleHtml=`<nav>Irrelevant constitutional amendments</nav><script type="application/ld+json">${JSON.stringify({'@type':'NewsArticle',url:newsUrl,headline:'India wins the cricket tournament final',articleBody:articleText,datePublished:'2026-09-01T10:00:00+05:30'})}</script>`;
const index=`<a href="${newsUrl}">India wins the cricket tournament final</a><a href="/news/category/cricket">Cricket category navigation</a><a href="https://www.icc-cricket.com.evil.example/news/example">Fake official sports news</a>`;
const fakeFetch=(async(url:any)=>new Response(String(url)===icc.url?index:articleHtml,{headers:{'content-type':'text/html'}})) as typeof fetch;
test('sports authority allowlist rejects impersonation and unrelated subdomains',()=>{
 assert.equal(allowedPublisher(newsUrl),true);
 assert.equal(allowedPublisher('https://icc-cricket.com.evil.example/news'),false);
 assert.equal(allowedPublisher('https://random.icc-cricket.com/news'),false);
});
test('ICC discovery excludes navigation and foreign destinations',()=>{
 assert.deepEqual(subjectLinks(index,icc.url,icc).map(l=>l.url),[newsUrl]);
});
test('sports extraction uses article schema and preserves publication calendar date',async()=>{
 const e=await collectSubjectEvidence(icc,newsUrl,fakeFetch);
 assert.equal(e.text,articleText);assert.equal(e.publication_date,'2026-09-01');assert.equal(e.verification,'REVIEW_REQUIRED');
 assert.deepEqual(e.subjects,['sports']);assert.equal(evidenceSource(e).verification_status,'UNVERIFIED');
 await assert.rejects(collectSubjectEvidence(icc,newsUrl,(async()=>new Response('<main>Only a navigation page with no article schema.</main>')) as typeof fetch),/schema missing/);
});
test('PM-KISAN extraction retains scheme and exclusions without portal navigation',async()=>{
 const text='This scheme provides support to eligible farmer families. Benefits and eligibility conditions require validation against current department guidelines.';
 const html=`<nav>Login and view beneficiary personal details</nav><div id="About"><h2>PM-KISAN Scheme</h2><div>${text}</div></div><div id="SchemeExclusion">Excluded categories must be reviewed.</div>`;
 const e=await collectSubjectEvidence(getSubjectPublisher('pmkisan')!,'https://www.pmkisan.gov.in/',(async()=>new Response(html)) as typeof fetch);
 assert.ok(e.text.includes('Excluded'));assert.ok(!e.text.includes('Login'));assert.equal(e.publication_date,undefined);assert.equal(e.kind,'REFERENCE');
});
test('official reference adapters keep navigation out of environment, polity and history evidence',async()=>{
 const pages:any={
  moefcc:`<header>Menu</header><div class="page-content"><h1>Environment policy</h1><p>Protected areas and biodiversity conservation are administered under the national environmental framework. The ministry publishes policy material on forests, wildlife, climate action, pollution control and sustainable development for public reference.</p></div><footer>Contact</footer>`,
  ndma:`<nav>Home Login</nav><div id="main-content"><div class="about-content"><h1>Disaster management</h1><p>Preparedness, mitigation and coordinated response reduce disaster risk and vulnerability. National guidance covers risk assessment, early warning, resilient infrastructure, emergency response and recovery planning across hazards.</p></div></div>`,
  'culture-ministry':`<div id="content"><nav>Navigation</nav><h1>Indian cultural heritage</h1><p>Official cultural institutions preserve tangible and intangible heritage through documented programmes. The ministry maintains reference material about museums, performing arts, literature, monuments, festivals and cultural institutions for public education.</p></div>`,
 };
 for(const id of Object.keys(pages)) {
  const publisher=getSubjectPublisher(id)!;
  const e=await collectSubjectEvidence(publisher,publisher.url,(async()=>new Response(pages[id],{headers:{'content-type':'text/html'}})) as typeof fetch);
  assert.ok(e.text.length>100);assert.ok(!/Menu|Login|Navigation|Contact/.test(e.text));assert.equal(e.kind,'REFERENCE');assert.equal(e.publication_date,undefined);
 }
});
test('MEA discovery accepts only first-party press-release detail links',()=>{
 const publisher=getSubjectPublisher('mea')!;
 const html=`<a href="/press-releases?dtl/34086/">India and partner countries sign a bilateral agreement</a><a href="/press-releases">Archive</a><a href="https://evil.example/press-releases?dtl/1">Foreign</a>`;
 assert.deepEqual(subjectLinks(html,publisher.url,publisher).map(l=>l.url),['https://www.mea.gov.in/press-releases?dtl/34086/']);
});
test('MEA collection follows the bounded detail endpoint and keeps the publication date',async()=>{
 const publisher=getSubjectPublisher('mea')!;
 const listing=`<a href="/press-releases?dtl/41754/visit">Bilateral visit and international talks</a>`;
 const detail=`<div class="pressReleaseContent"><span class="date">09 September, 2026</span><h2 class="titleText">Bilateral visit and international talks</h2><div class="description"><p>Officials held international talks and recorded the announced visit schedule for public reference.</p></div></div>`;
 const fetcher=(async(url:any)=>new Response(String(url).includes('FetchPublicationListingData')?listing:detail,{headers:{'content-type':'text/html'}})) as typeof fetch;
 const links=await discoverSubjectLinks(publisher,fetcher);const e=await collectSubjectEvidence(publisher,links[0].url,fetcher);
 assert.equal(e.publication_date,'2026-09-09');assert.ok(e.text.includes('international talks'));assert.equal(e.kind,'CURRENT');
});
test('scheme and FIDE article dates cannot come from related article cards',()=>{
 const pm='<h1>PMINDIA</h1><div class="content-block"><h2>New scheme guidelines</h2><span class="date">08 Sep, 2026</span><p>Scheme text</p></div><span class="list-date">10 Sep, 2026</span>';
 const result=extractSpecialEvidence(pm,'https://www.pmindia.gov.in/article',getSubjectPublisher('pmindia-schemes')!)!;
 assert.equal(result.title,'New scheme guidelines');assert.equal(result.publication_date,'2026-09-08');
 const fide='<span class="elementor-post-info__item--type-date"><time>Wednesday, 09 Sep 2026</time></span><div class="elementor-widget-theme-post-content">Chess result</div><time>September 10, 2026</time>';
 assert.equal(extractSpecialEvidence(fide,'https://www.fide.com/article',getSubjectPublisher('fide')!)!.publication_date,'2026-09-09');
});
test('all registered topics remain visible while broad sports evidence cannot fill specialist gaps',async()=>{
 const e=await collectSubjectEvidence(icc,newsUrl,fakeFetch);const source=evidenceSource(e);
 const coverage=buildCoverage(exam,[source,source],'2026-09-10');
 assert.equal(coverage.evidence_count,1);assert.ok(coverage.subjects.some(s=>s.id==='math'&&s.evidence_count===0));
 assert.equal(coverage.topics.find(t=>t.topic==='Constitutional amendments')?.evidence_count,0);
 assert.equal(coverage.verification_complete,false);assert.equal(coverage.question_verification_status,'NOT_ASSESSED');
 assert.equal(buildCoverage(specialist,[source],'2026-09-10').evidence_count,0);
 assert.ok(!subjectsForExam(specialist).includes('sports'));
 assert.equal(buildCoverage(exam,[{...source,exam_id:'another-exam'}],'2026-09-10').evidence_count,0);
});
test('future articles are excluded and older reference evidence is not presented as current news',async()=>{
 const e=await collectSubjectEvidence(icc,newsUrl,fakeFetch);
 assert.equal(buildCoverage(exam,[evidenceSource({...e,publication_date:'2026-10-01'})],'2026-09-10').evidence_count,0);
 assert.equal(buildCoverage(exam,[evidenceSource({...e,publication_date:'2020-01-01',kind:'CURRENT'})],'2026-09-10').evidence_count,0);
 assert.equal(buildCoverage(exam,[evidenceSource({...e,publication_date:'2020-01-01',kind:'REFERENCE'})],'2026-09-10').evidence_count,1);
});
test('state-specific evidence cannot fill another state’s syllabus',async()=>{
 const e=await collectSubjectEvidence(icc,newsUrl,fakeFetch);
 const reference=evidenceSource({...e,kind:'REFERENCE',subjects:['state','geography'],jurisdiction:'Telangana'});
 assert.equal(buildCoverage({...exam,state_or_central:'Andhra Pradesh'},[reference],'2026-09-10').evidence_count,0);
 assert.equal(buildCoverage({...exam,state_or_central:'Telangana'},[reference],'2026-09-10').evidence_count,1);
});
test('gap scheduling prefers missing subjects and skips unavailable adapters',async()=>{
 const e=await collectSubjectEvidence(icc,newsUrl,fakeFetch);
 const selected=choosePublisher(emptyResearchState(),[exam],[evidenceSource(e)],Date.now());
 assert.equal(selected?.id,'pmindia-schemes');
 assert.equal(choosePublisher(emptyResearchState(),[specialist],[],Date.now()),undefined);
});
test('cloud checkpoints survive restart; failed database writes retry before the task is removed',async()=>{
 let serialized='';let writes=0;let fail=true;const rows=new Map<string,any>();
 const store={get:async()=>serialized?JSON.parse(serialized):null,put:async(_key:string,value:string)=>{serialized=value;}};
 const repository:any={exams:{getExams:async()=>[exam]},sources:{getSources:async()=>[...rows.values()],getSourceById:async(id:string)=>rows.get(id)||null,saveSource:async(s:any)=>{if(fail)throw Error('Database unavailable');writes++;rows.set(s.source_id,s);}}};
 const options={repository,fetcher:fakeFetch};const tick=Date.now();
 const first=await runCloudResearch(store,tick,options);assert.equal(first.pending.length,1);assert.equal(rows.size,0);
 const duplicate=await runCloudResearch(store,tick,options);assert.equal(duplicate.runs,1);
 const failed=await runCloudResearch(store,tick+1,options);assert.equal(failed.pending[0].attempts,1);assert.equal(rows.size,0);
 fail=false;const completed=await runCloudResearch(store,tick+2,options);assert.equal(completed.pending.length,0);assert.equal(writes,1);assert.equal(rows.size,1);
 assert.equal([...rows.values()][0].verification_status,'UNVERIFIED');
});

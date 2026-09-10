import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSearchResults, parseBingRssResults, webSearchFree } from '../searchDiscovery.ts';
import { readPublic } from '../retrievalHttp.ts';
import { stealthFetch } from '../stealthFetcher.ts';
import { extractPdfText } from '../pdfParser.ts';
import { youtubeId, retrieveYoutube } from '../youtubeDiscovery.ts';
import { executeUniversalDiscovery, discoveryTrust } from '../universalResearchDiscovery.ts';

const fake = (fn: (url:string) => Response | Promise<Response>) => ((input:any) => fn(String(input))) as typeof fetch;
test('DuckDuckGo HTML and Lite tolerate attribute order, entities and multiline titles', () => {
  const target = 'https://ssc.gov.in/download?name=a%2Fb&x=1';
  const html = `<a href="/l/?uddg=${encodeURIComponent(target)}" rel="nofollow" class="extra result__a">SSC\n<b>CGL</b></a><div class="result__snippet">Official &amp; current</div>`;
  assert.deepEqual(parseSearchResults(html,'https://html.duckduckgo.com'), [{url:target,title:'SSC CGL',snippet:'Official & current'}]);
  assert.equal(parseSearchResults("<a href='https://psc.ap.gov.in/notice' class='result-link'>APPSC</a><td class='result-snippet'>Syllabus</td>",'https://lite.duckduckgo.com')[0].snippet,'Syllabus');
});
test('search challenges are visible and Lite fallback can succeed', async () => {
  const result = await webSearchFree('ssc cgl',4,fake(url => new Response(url.includes('html.duck') ? '<form class="challenge-form">' : '<a class="result-link" href="https://ssc.gov.in/notice">SSC</a>')));
  assert.equal(result.results.length,1);
  assert.equal(result.diagnostics[0].status,'PROVIDER_BLOCKED');
});
test('Bing RSS is a bounded fallback when both DuckDuckGo layouts challenge', () => {
  const items=parseBingRssResults('<item><title>SSC CGL</title><link>https://ssc.gov.in/notice</link><description>Official notification</description></item>');
  assert.deepEqual(items[0],{title:'SSC CGL',url:'https://ssc.gov.in/notice',snippet:'Official notification'});
});
test('redirects to private hosts and oversized documents are rejected', async () => {
  let calls=0;
  await assert.rejects(readPublic('https://ssc.gov.in/doc',{fetcher:fake(() => {calls++; return new Response(null,{status:302,headers:{location:'http://127.0.0.1/'}});})}), /PUBLIC|URL|HOST|PRIVATE/i);
  assert.equal(calls,1);
  await assert.rejects(readPublic('https://ssc.gov.in/doc',{maxBytes:3,fetcher:fake(() => new Response('long body'))}), /SOURCE_TOO_LARGE/);
});
function pdf(): Uint8Array {
  const stream = 'BT /F1 12 Tf 50 750 Td (Official examination syllabus: 100 questions and 200 marks. Duration 60 minutes.) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let text='%PDF-1.4\n'; const offsets=[0];
  objects.forEach((o,i) => {offsets.push(text.length); text+=`${i+1} 0 obj\n${o}\nendobj\n`;});
  const xref=text.length;
  text+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(text);
}
test('installed PDF parser extracts a real PDF and downloader detects extensionless PDF', async () => {
  const parsed=await extractPdfText(pdf());
  assert.equal(parsed.success,true,parsed.error);
  assert.match(parsed.text,/100 questions/);
  const fetched=await stealthFetch('https://ssc.gov.in/api/download',{fetcher:fake(() => new Response(pdf(),{headers:{'content-type':'application/octet-stream'}}))});
  assert.equal(fetched.isPdf,true);
  assert.match(fetched.text,/200 marks/);
});
test('YouTube metadata is retrieved directly; missing description is explicit', async () => {
  const previous=process.env.YOUTUBE_API_KEY; delete process.env.YOUTUBE_API_KEY;
  try {
    for (const url of ['https://youtu.be/abcdefghijk','https://youtube.com/watch?v=abcdefghijk','https://youtube.com/shorts/abcdefghijk']) assert.equal(youtubeId(url),'abcdefghijk');
    assert.equal(youtubeId('https://youtube.com.evil.example/watch?v=abcdefghijk'),undefined);
    const result=await retrieveYoutube('https://youtu.be/abcdefghijk',fake(() => new Response(JSON.stringify({title:'SSC CGL syllabus',author_name:'Teacher'}))));
    assert.equal(result.video?.channel,'Teacher');
    assert.equal(result.video?.description_available,false);
    assert.ok(result.diagnostics.some(d=>d.status==='DESCRIPTION_NOT_CONFIGURED'));
  } finally { if(previous === undefined) delete process.env.YOUTUBE_API_KEY; else process.env.YOUTUBE_API_KEY=previous; }
});
test('YouTube description failure retains metadata and does not expose API key', async () => {
  const previous=process.env.YOUTUBE_API_KEY; process.env.YOUTUBE_API_KEY='test-secret';
  try {
    const result=await retrieveYoutube('https://youtu.be/abcdefghijk',fake(url => {
      if(url.includes('googleapis')) throw new Error(url);
      return new Response(JSON.stringify({title:'SSC',author_name:'Teacher'}));
    }));
    assert.ok(result.video);
    assert.ok(!JSON.stringify(result).includes('test-secret'));
  } finally { if(previous === undefined) delete process.env.YOUTUBE_API_KEY; else process.env.YOUTUBE_API_KEY=previous; }
});
test('discovery follows document links from a JavaScript shell and isolates failed downloads', async () => {
  const fetched:string[]=[];
  const result=await executeUniversalDiscovery({commission:'SSC',exam:'SSC CGL',post:'Not specified',paper:'Tier I',stage:'Tier I',recruitment_cycle:'Unknown cycle',state_or_central:'Central'},'DIRECT_WEB',{
    urls:['https://ssc.gov.in/landing','https://example.org/broken'],
    search:async () => ({results:[],combinedSnippets:'',diagnostics:[]}),
    retrieve:async url => {
      fetched.push(url);
      if(url.includes('broken')) throw new Error('timeout');
      return {url,success:!url.includes('landing'),text:url.includes('landing')?'':'Official document '.repeat(10),status:200,contentType:'text/html',isPdf:false,discoveredLinks:url.includes('landing')?['https://ssc.gov.in/api/download']:[],cookies:[],executionDetails:{durationMs:0,simulatedHumanDelayMs:0,mouseTrajectoryPoints:0,userAgentUsed:''}};
    },
  });
  assert.ok(fetched.includes('https://ssc.gov.in/api/download'));
  assert.equal(result.sources.length,1);
  assert.equal(result.facts.length,0);
  assert.ok(result.diagnostics.some(d=>d.status==='FAILED'));
  assert.equal(discoveryTrust('https://ssc.gov.in.evil.example'),'LEVEL_2_SECONDARY');
});

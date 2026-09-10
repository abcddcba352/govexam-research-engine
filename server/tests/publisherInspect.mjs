import fs from 'node:fs';
const urls=process.argv.length>2?process.argv.slice(2):['https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1','https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=63561','https://www.isro.gov.in/3rd_National_Space_Day_2026.html'];
for(const [i,url] of urls.entries()) {
  try {
    const r=await fetch(url,{signal:AbortSignal.timeout(15000)});const html=await r.text();
    fs.mkdirSync('work',{recursive:true});fs.writeFileSync(`work/publisher-${i}.html`,html);
    console.log(JSON.stringify({url:r.url,status:r.status,preview:html.slice(0,550),headings:[...html.matchAll(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/gi)].map(m=>m[0]).slice(0,12),dates:[...html.matchAll(/.{0,110}(?:2026|datePublished|published_time|class="date).{0,110}/gi)].map(m=>m[0]).slice(-15)}));
  }catch(e){console.log(e.message);}
}

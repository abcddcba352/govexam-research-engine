import fs from 'node:fs';
const urls=process.argv.slice(2);
await Promise.all(urls.map(async(url,i)=>{
 try {
  const r=await fetch(url,{signal:AbortSignal.timeout(15000)});const html=await r.text();
  fs.mkdirSync('work',{recursive:true});fs.writeFileSync(`work/subject-publisher-${i}.html`,html);
  const links=[...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m=>({url:m[1],title:m[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()})).filter(x=>x.title.length>15).slice(0,45);
  console.log(JSON.stringify({url,final:r.url,status:r.status,bytes:html.length,title:html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],links,jsonld:[...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1].slice(0,1200))}));
 }catch(e){console.log(JSON.stringify({url,error:e.message}));}
}));

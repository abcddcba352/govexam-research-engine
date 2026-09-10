import { webSearchFree } from '../searchDiscovery.ts';
import { stealthFetch } from '../stealthFetcher.ts';
import { retrieveYoutube } from '../youtubeDiscovery.ts';
const pdf = 'https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2026.pdf';
for (const query of ['SSC CGL notification syllabus site:ssc.gov.in','TGPSC AEE civil syllabus','APPSC endowment officer syllabus','SSC CGL syllabus site:youtube.com']) {
  const result = await webSearchFree(query,3);
  console.log(JSON.stringify({query,results:result.results,diagnostics:result.diagnostics}));
  if(query.includes('youtube')) for(const video of result.results.filter(r=>r.url.includes('youtube.com/watch')).slice(0,1)) {
    const found=await retrieveYoutube(video.url);
    console.log(JSON.stringify({video:found.video?.title,channel:found.video?.channel,diagnostics:found.diagnostics}));
  }
}
const page=await stealthFetch(pdf,{timeoutMs:25000});
console.log(JSON.stringify({url:page.url,success:page.success,isPdf:page.isPdf,characters:page.text.length,error:page.error,preview:page.text.slice(0,150)}));

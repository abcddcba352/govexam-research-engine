import { readPublic, publicUrl } from './retrievalHttp.ts';
import type { CollectionDiagnostic } from './searchDiscovery.ts';
export function youtubeId(raw: string): string | undefined {
  try {
    const u = publicUrl(raw), h = u.hostname.toLowerCase();
    const id = h === 'youtu.be' ? u.pathname.split('/')[1] :
      ['youtube.com','www.youtube.com','m.youtube.com'].includes(h) ?
        (u.pathname === '/watch' ? u.searchParams.get('v') : /^\/(shorts|embed|live)\//.test(u.pathname) ? u.pathname.split('/')[2] : null) : null;
    return id && /^[\w-]{11}$/.test(id) ? id : undefined;
  } catch { return undefined; }
}
export interface YoutubeSource {
  title: string; url: string; channel: string; snippet: string; extractedDriveLinks: string[];
  publication_date?: string; thumbnail?: string; description_available: boolean;
}
export async function retrieveYoutube(raw: string, fetcher: typeof fetch = fetch): Promise<{ video?: YoutubeSource; diagnostics: CollectionDiagnostic[] }> {
  const diagnostics: CollectionDiagnostic[] = [];
  const id = youtubeId(raw);
  if (!id) return { diagnostics:[{stage:'YOUTUBE',target:raw,status:'INVALID_VIDEO_URL',detail:'Use a public YouTube watch, Shorts, live, embed or youtu.be URL.'}] };
  const url = `https://www.youtube.com/watch?v=${id}`;
  let video: YoutubeSource | undefined;
  try {
    const response = await readPublic(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, {fetcher});
    const data = JSON.parse(response.text());
    if (!data.title || !data.author_name) throw new Error('INVALID_OEMBED_RESPONSE');
    video = {url,title:data.title,channel:data.author_name,thumbnail:data.thumbnail_url,snippet:'',extractedDriveLinks:[],description_available:false};
    diagnostics.push({stage:'YOUTUBE',target:url,status:'METADATA_COLLECTED',detail:'Title and channel retrieved from YouTube oEmbed.'});
  } catch (e: any) { diagnostics.push({stage:'YOUTUBE',target:url,status:'METADATA_UNAVAILABLE',detail:e.message}); }
  if (process.env.YOUTUBE_API_KEY) {
    try {
      const response = await readPublic(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${encodeURIComponent(process.env.YOUTUBE_API_KEY)}`, {fetcher});
      const snippet = JSON.parse(response.text()).items?.[0]?.snippet;
      if (!snippet) throw new Error('VIDEO_UNAVAILABLE');
      video = { ...video, url, title:snippet.title,channel:snippet.channelTitle,snippet:snippet.description || '',
        publication_date:snippet.publishedAt,description_available:true,extractedDriveLinks:[] };
      video.extractedDriveLinks = [...new Set((video.snippet.match(/https?:\/\/[^\s<>"']+/g) || []).filter(link => {
        try { publicUrl(link); return true; } catch { return false; }
      }))];
      diagnostics.push({stage:'YOUTUBE',target:url,status:'DESCRIPTION_COLLECTED',detail:`${video.extractedDriveLinks.length} material links. Transcripts and comments were not collected.`});
    } catch { diagnostics.push({stage:'YOUTUBE',target:url,status:'DESCRIPTION_UNAVAILABLE',detail:'YouTube Data API failed or denied access; metadata is retained.'}); }
  } else diagnostics.push({stage:'YOUTUBE',target:url,status:'DESCRIPTION_NOT_CONFIGURED',detail:'Title/channel available via oEmbed. Configure YOUTUBE_API_KEY for descriptions and material links; no transcript or comments have been collected.'});
  return {video,diagnostics};
}

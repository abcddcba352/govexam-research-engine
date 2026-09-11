import { stealthFetch } from './stealthFetcher.ts';
import { webSearchFree, type CollectionDiagnostic } from './searchDiscovery.ts';
import { retrieveYoutube, youtubeId, type YoutubeSource } from './youtubeDiscovery.ts';
import { publicUrl } from './retrievalHttp.ts';
import { INITIAL_OFFICIAL_REGISTRY } from './registryData.ts';
import { extractDirectFacts, extractDocumentSchemeFacts, isAuthenticOfficialDocument, type RetrievedResearchSource } from './researchEvidence.ts';
import type { ExamIdentification, ResearchFact, ResearchMode, SourceTrustLevel, PreviousPaperRecord } from '../src/types.ts';

export function discoveryTrust(url: string): SourceTrustLevel {
  try {
    const host = publicUrl(url).hostname;
    const belongs = (d: string) => !!d && (host === d || host.endsWith('.' + d));
    if (INITIAL_OFFICIAL_REGISTRY.some(r => [r.official_domain,...r.other_official_domains].some(belongs))) return 'LEVEL_5_OFFICIAL';
    if (host.endsWith('.gov.in') || host.endsWith('.nic.in')) return 'LEVEL_4_GOVERNMENT';
    return 'LEVEL_2_SECONDARY';
  } catch { return 'LEVEL_1_DISCOVERY'; }
}
export interface DiscoveredExamIntelligence {
  facts: ResearchFact[];
  sources: Array<{url:string;title:string;domain:string;content:string;level:SourceTrustLevel;document_type:string;is_official_mirror?:boolean}>;
  discoveredPdfs: string[];
  previousPapers: Partial<PreviousPaperRecord>[];
  youtubeSources: YoutubeSource[];
  diagnostics: CollectionDiagnostic[];
}
export function extractStructuredFactsFromDoc(text:string, url:string, id:ExamIdentification, mode = 'HYBRID', isMirror = false): ResearchFact[] {
  const level = isMirror ? 'LEVEL_5_OFFICIAL' : discoveryTrust(url);
  const sources: RetrievedResearchSource[] = [{
    url,
    name: isMirror ? `${url} (Official Commission Mirror)` : url,
    content: text,
    level,
    is_official_mirror: isMirror
  }];
  return [
    ...extractDirectFacts(sources, id, mode as ResearchMode),
    ...extractDocumentSchemeFacts(sources, id, mode as ResearchMode)
  ];
}
export interface DiscoveryOptions {
  urls?: string[]; officialDomains?: string[]; excludedUrls?: string[];
  search?: typeof webSearchFree; retrieve?: typeof stealthFetch; youtube?: typeof retrieveYoutube;
}
export async function executeUniversalDiscovery(id:ExamIdentification, mode = 'HYBRID', options:DiscoveryOptions = {}): Promise<DiscoveredExamIntelligence> {
  const result:DiscoveredExamIntelligence = {facts:[],sources:[],discoveredPdfs:[],previousPapers:[],youtubeSources:[],diagnostics:[]};
  const search = options.search || webSearchFree, retrieve = options.retrieve || stealthFetch, youtube = options.youtube || retrieveYoutube;
  const directVideo = youtubeId(id.exam);
  const query = `${id.exam} ${id.paper === 'Not specified' ? '' : id.paper}`.slice(0,220);
  const domains = options.officialDomains?.length ? options.officialDomains : INITIAL_OFFICIAL_REGISTRY
    .filter(r => id.commission === r.authority_name).flatMap(r => [r.official_domain,...r.other_official_domains]);
  // Independent discovery categories run together across official portals and open web
  const jobs = directVideo ? [] : [
    ...(domains[0] ? [`${query} notification syllabus site:${domains[0]}`] : []),
    `${query} official notification scheme syllabus filetype:pdf`,
    `${query} notification examination scheme pdf download`,
    `${query} syllabus analysis site:youtube.com`,
  ];
  const searches = await Promise.all(jobs.map(async q => {
    try { return await search(q,6); }
    catch (e:any) { return {results:[],combinedSnippets:'',diagnostics:[{stage:'SEARCH',target:q,status:'FAILED',detail:e.message}]}; }
  }));
  searches.forEach(s => result.diagnostics.push(...s.diagnostics));
  const hints = searches.flatMap(s => s.results);

  const supplied = [...(directVideo ? [id.exam] : []),...(options.urls || [])];
  const videoUrls = [...new Set([...supplied,...hints.map(r => r.url)].filter(u => youtubeId(u)))].slice(0,3);
  const queue = [...new Set([...supplied,...hints.map(r => r.url)].filter(u => !youtubeId(u) && !options.excludedUrls?.includes(u)))].sort((a,b) =>
    Number(discoveryTrust(b) === 'LEVEL_5_OFFICIAL') - Number(discoveryTrust(a) === 'LEVEL_5_OFFICIAL'));
  const videoWork = Promise.all(videoUrls.map(async url => {
    try {
    const found = await youtube(url);
    result.diagnostics.push(...found.diagnostics);
    if (found.video) {
      const video = found.video;
      result.youtubeSources.push(video);
      result.sources.push({url:video.url,title:video.title,domain:'www.youtube.com',level:'LEVEL_2_SECONDARY',
        document_type:'YOUTUBE_METADATA',content:`${video.title}\nChannel: ${video.channel}\n${video.snippet}`});
    }
    } catch { result.diagnostics.push({stage:'YOUTUBE',target:url,status:'FAILED',detail:'Video retrieval failed.'}); }
  }));
  const visited = new Set<string>();
  // Try landing pages as well as PDFs; follow their document links even if the
  // landing page is a mostly empty JavaScript shell. Eight downloads maximum.
  while (queue.length && visited.size < 8) {
    const batch = queue.splice(0,Math.min(3,8-visited.size)).filter(url => !visited.has(url));
    batch.forEach(url => visited.add(url));
    await Promise.all(batch.map(async url => {
      try {
      const page = await retrieve(url,{timeoutMs:10000,simulateHuman:false});
      const isOfficialDomain = discoveryTrust(url) === 'LEVEL_5_OFFICIAL';
      result.diagnostics.push({stage:page.isPdf ? 'PDF' : 'DOWNLOAD',target:url,status:page.success ? 'COLLECTED' : 'FAILED',detail:page.error || `${page.text.length} characters`});
      const links = page.discoveredLinks.filter(link => !visited.has(link) && !queue.includes(link) && !options.excludedUrls?.includes(link));
      queue.unshift(...links.filter(link => discoveryTrust(link) === 'LEVEL_5_OFFICIAL').slice(0,6));
      if (!page.success) {
        if (isOfficialDomain) {
          result.diagnostics.push({
            stage: 'FAILOVER',
            target: url,
            status: 'BROKEN_OFFICIAL_LINK',
            detail: `Official direct link unreachable (${page.error || page.status}). Executing all-sites search failover.`
          });
        }
        return;
      }

      const isMirror = !isOfficialDomain && isAuthenticOfficialDocument(page.text, id);
      const level = isMirror ? 'LEVEL_5_OFFICIAL' : discoveryTrust(page.url);
      const rawTitle = hints.find(h => h.url === url)?.title || page.url;
      const title = isMirror ? `${rawTitle} (Official Commission Mirror via ${new URL(page.url).hostname})` : rawTitle;

      if (isMirror) {
        result.diagnostics.push({
          stage: 'MIRROR_RECOVERY',
          target: page.url,
          status: 'OFFICIAL_MIRROR_VERIFIED',
          detail: `Recovered authentic official commission notice from mirror (${new URL(page.url).hostname}).`
        });
      }

      result.sources.push({
        url: page.url,
        title,
        domain: new URL(page.url).hostname,
        content: page.text,
        level,
        document_type: page.isPdf ? 'PDF' : 'WEB_PAGE',
        is_official_mirror: isMirror
      });
      if (page.isPdf) result.discoveredPdfs.push(page.url);
      result.facts.push(...extractStructuredFactsFromDoc(page.text, page.url, id, mode, isMirror));
      } catch { result.diagnostics.push({stage:'DOWNLOAD',target:url,status:'FAILED',detail:'Document retrieval failed.'}); }
    }));
  }
  await videoWork;
  return result;
}

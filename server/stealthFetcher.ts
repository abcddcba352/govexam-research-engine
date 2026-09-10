/** Public document retrieval. HTTP requests cannot execute a portal's JavaScript. */
import { extractPdfText } from './pdfParser.ts';
import { readPublic, publicUrl, textFromHtml, attributes } from './retrievalHttp.ts';
export { webSearchFree } from './searchDiscovery.ts';
export type { WebSearchResult } from './searchDiscovery.ts';
export interface StealthFetchResult {
  text: string; status: number; success: boolean; url: string; contentType: string;
  isPdf: boolean; discoveredLinks: string[]; cookies: string[]; error?: string;
  executionDetails: { durationMs: number; simulatedHumanDelayMs: number; mouseTrajectoryPoints: number; userAgentUsed: string };
}
export function extractOfficialLinksFromHtml(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const a = attributes(match[1]);
    try {
      const url = publicUrl(new URL(a.href, baseUrl).href).href;
      if (/\.pdf(?:[?#]|$)|notification|syllabus|scheme|gazette|paper|pattern|recruitment/i.test(url + ' ' + textFromHtml(match[2]))) links.add(url);
    } catch { /* Skip invalid links. */ }
  }
  return [...links].slice(0,20);
}
export async function stealthFetch(url: string, options: {
  maxLinks?: number; timeoutMs?: number; simulateHuman?: boolean; fetcher?: typeof fetch;
} = {}): Promise<StealthFetchResult> {
  const start = Date.now();
  const base: StealthFetchResult = { text:'', status:0, success:false, url, contentType:'', isPdf:false, discoveredLinks:[], cookies:[],
    executionDetails:{ durationMs:0, simulatedHumanDelayMs:0, mouseTrajectoryPoints:0, userAgentUsed:'GovExamResearch/1.0' } };
  try {
    const response = await readPublic(url, { fetcher:options.fetcher, timeoutMs:options.timeoutMs ?? 12000, maxBytes:12_000_000 });
    base.url = response.url; base.status = response.status; base.contentType = response.headers.get('content-type') || '';
    base.isPdf = new TextDecoder().decode(response.bytes.subarray(0,5)) === '%PDF-';
    if (base.isPdf) {
      const parsed = await extractPdfText(response.bytes);
      base.text = parsed.text;
      if (!parsed.success) base.error = parsed.error || 'PDF_REQUIRES_OCR';
    } else {
      const html = response.text();
      if (/captcha|cf-chl-|challenge-platform|verify you are human/i.test(html)) throw new Error('PUBLISHER_CHALLENGE');
      base.discoveredLinks = extractOfficialLinksFromHtml(html, response.url).slice(0,options.maxLinks ?? 15);
      base.text = textFromHtml(html).slice(0,120000);
      if (base.text.length < 100) base.error = 'JAVASCRIPT_SHELL_OR_EMPTY_PAGE';
    }
    base.success = !base.error && base.text.length >= 100;
  } catch (error: any) { base.error = error.message; }
  base.executionDetails.durationMs = Date.now() - start;
  return base;
}

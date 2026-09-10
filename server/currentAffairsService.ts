import crypto from 'node:crypto';
import type { ExamRecord } from '../src/types.ts';
import { normalize, rankArticle, currentAffairsTopics, checkCurrentAffairsDates, validDate, parsePublicationDate, type CollectedArticle, type CurrentAffairsEvidence } from '../src/currentAffairs.ts';

export function allowedPublisher(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') &&
      (u.hostname.endsWith('.gov.in') || u.hostname.endsWith('.nic.in') ||
        ['rbi.org.in', 'isro.gov.in', 'who.int', 'worldbank.org', 'imf.org', 'un.org', 'icc-cricket.com', 'fide.com'].some(h => u.hostname === h || u.hostname === 'www.'+h || (!['icc-cricket.com','fide.com'].includes(h) && u.hostname.endsWith('.' + h))));
  } catch { return false; }
}

const clean = (html: string) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

export function contentBlock(html:string,start:RegExp,tag:string):string|undefined {
  const open=start.exec(html);if(!open) return undefined;
  const tags=new RegExp(`<(/?)${tag}\\b[^>]*>`,'gi');tags.lastIndex=open.index+open[0].length;
  let depth=1;let match:RegExpExecArray|null;
  while((match=tags.exec(html))) {
    depth+=match[1]?-1:1;
    if(!depth) return html.slice(open.index,tags.lastIndex);
  }
  return undefined;
}

export async function retrieveArticle(url: string, fetcher: typeof fetch = fetch): Promise<Omit<CollectedArticle, 'matched_topics' | 'priority_score' | 'priority_reasons' | 'status'>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    let target = url;
    for (let redirects = 0; redirects <= 3; redirects++) {
      if (!allowedPublisher(target)) throw new Error('Use a direct HTTPS article from an allowed primary publisher.');
      const response = await fetcher(target, { redirect: 'manual', signal: controller.signal, headers: { Accept: 'text/html,text/plain' } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) throw new Error('Source redirect has no destination.');
        target = new URL(location, target).href;
        await response.body?.cancel();
        continue;
      }
      if (!response.ok) throw new Error(`Publisher returned HTTP ${response.status}.`);
      if (!/text\/|application\/xhtml\+xml/i.test(response.headers.get('content-type') || ''))
        throw new Error('This source is not HTML/text. PDF extraction is still required.');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Empty publisher response.');
      const decoder = new TextDecoder(); let html = ''; let size = 0;
      while (true) {
        const part = await reader.read(); if (part.done) break;
        size += part.value.length;
        if (size > 2_000_000) { await reader.cancel(); throw new Error('Source exceeds the 2 MB retrieval limit.'); }
        html += decoder.decode(part.value, { stream: true });
      }
      html += decoder.decode();
      const rbiTitle= /(^|\.)rbi\.org\.in$/.test(new URL(target).hostname) ? html.match(/<td\b[^>]*align=["']center["'][^>]*class=["']tableheader["'][^>]*>\s*<b>([\s\S]*?)<\/b>/i)?.[1] : undefined;
      const pibTitle=/(^|\.)pib\.gov\.in$/.test(new URL(target).hostname) ? html.match(/<h2\b[^>]*id=["']Titleh2["'][^>]*>([\s\S]*?)<\/h2>/i)?.[1] : undefined;
      const title = clean(rbiTitle || pibTitle || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i)?.[1] || new URL(target).hostname);
      const publisherBody=rbiTitle ? contentBlock(html,/<table\b[^>]*class=["']tablebg["'][^>]*>/i,'table') : pibTitle ? contentBlock(html,/<div\b[^>]*class=["'][^"']*innner-page-main-about-us-content-right-part[^"']*["'][^>]*>/i,'div') : undefined;
      const main=publisherBody || html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html;
      const text = clean(main.replace(/<(nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')).slice(0, 60000);
      if (text.length < 80) throw new Error('Source did not return readable article text.');
      const dateTag = html.match(/<meta[^>]*(?:article:published_time|datePublished|pubdate)[^>]*>/i)?.[0];
      const rawDate = dateTag?.match(/content=["']([^"']+)/i)?.[1] || html.match(/<time[^>]*datetime=["']([^"']+)/i)?.[1];
      const posted = text.match(/Posted On:\s*(\d{1,2})\s+([A-Z]{3})\s+(20\d{2})/i);
      const month = posted ? ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].indexOf(posted[2].toUpperCase()) + 1 : 0;
      const labelledDate=rbiTitle ? html.match(/<td\b[^>]*class=["']tableheader["'][^>]*>\s*<b>\s*Date\s*:\s*([^<]+)<\/b>/i)?.[1] : undefined;
      const standaloneDate=/(^|\.)isro\.gov\.in$/.test(new URL(target).hostname) ? [...main.matchAll(/<p\b[^>]*class=["']pageContent["'][^>]*>([\s\S]*?)<\/p>/gi)].map(m=>clean(m[1])).find(t=>/^[A-Za-z]{3,9}\s+\d{1,2},\s*20\d{2}$/.test(t)) : undefined;
      const date = parsePublicationDate(rawDate) || (posted && month ? `${posted[3]}-${String(month).padStart(2, '0')}-${posted[1].padStart(2, '0')}` : undefined) || parsePublicationDate(labelledDate||standaloneDate);
      return { url: target, requested_url: url, title, text, publication_date: validDate(date) ? date : undefined,
        retrieved_at: new Date().toISOString(), content_hash: crypto.createHash('sha256').update(text).digest('hex') };
    }
    throw new Error('Too many source redirects.');
  } finally { clearTimeout(timer); }
}

export async function collectCurrentAffairs(exam: ExamRecord, urls: string[], cutoff: string, fetcher: typeof fetch = fetch) {
  const articles: CollectedArticle[] = []; const failures: { url: string; reason: string }[] = [];
  // Keep malformed URLs as individual failures instead of letting one bad
  // pasted source abort the complete collection batch.
  const unique = [...new Set(urls.map(url => {
    try { return new URL(url).href; } catch { return url; }
  }))];
  for (let i = 0; i < unique.length; i += 3) {
    const batch = await Promise.all(unique.slice(i, i + 3).map(async url => {
      try {
        const article = await retrieveArticle(url, fetcher);
        return { article: { ...article, ...rankArticle(article.title + ' ' + article.text, currentAffairsTopics(exam), article.publication_date, cutoff) } };
      } catch (error: any) { return { failure: { url, reason: error.name === 'AbortError' ? 'Publisher timed out.' : error.message } }; }
    }));
    for (const result of batch) {
      if (result.failure) failures.push(result.failure);
      if (result.article && !articles.some(a => a.content_hash === result.article.content_hash)) articles.push(result.article);
    }
  }
  return { articles: articles.sort((a, b) => b.priority_score - a.priority_score), failures };
}

export function validateArticleEvidence(evidence: CurrentAffairsEvidence | undefined, articles: CollectedArticle[], cutoff: string, answer: string) {
  const errors = checkCurrentAffairsDates(evidence, cutoff);
  const article = evidence && articles.find(a => a.url === evidence.source_url);
  if (!article || !allowedPublisher(article.url)) errors.push('The cited article was not retrieved from a primary publisher.');
  if (article && evidence) {
    if (!article.matched_topics.length) errors.push('The source does not match this paper’s syllabus.');
    if (article.publication_date !== evidence.publication_date) errors.push('Publication date does not match the retrieved article.');
    const quote = normalize(evidence.evidence_snippet || '');
    if (quote.length < 40 || !normalize(article.text).includes(quote)) errors.push('The cited excerpt does not occur in the retrieved article.');
    if (!normalize(answer) || !quote.includes(normalize(answer))) errors.push('The cited excerpt does not explicitly support the proposed answer.');
    // Require an explicit event date in the cited text, rather than equating publication and event dates.
    if (validDate(evidence.event_date)) {
      const day = new Date(evidence.event_date + 'T00:00:00Z');
      const long = day.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
      const short = day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
      if (![evidence.event_date, long, short].some(date => quote.includes(normalize(date)))) errors.push('Event date is not explicit in the source excerpt.');
    }
  }
  return { valid: errors.length === 0, errors, article };
}

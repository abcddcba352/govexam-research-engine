import { readPublic, publicUrl, textFromHtml, attributes } from './retrievalHttp.ts';

export interface WebSearchResult { title: string; url: string; snippet: string }
export interface CollectionDiagnostic { stage: string; target: string; status: string; detail: string }
export interface SearchResult { results: WebSearchResult[]; combinedSnippets: string; diagnostics: CollectionDiagnostic[] }

export function parseSearchResults(html: string, base: string, limit = 8): WebSearchResult[] {
  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const results: WebSearchResult[] = [];
  for (let i = 0; i < anchors.length; i++) {
    const m = anchors[i], a = attributes(m[1]);
    if (!/\b(result__a|result-link)\b/.test(a.class || '') && !/^\/url\?/.test(a.href || '')) continue;
    try {
      let u = new URL(a.href, base);
      // URLSearchParams already decodes once. Double decoding corrupts signed PDF links.
      const target = u.searchParams.get('uddg') || (u.pathname === '/url' ? u.searchParams.get('q') || u.searchParams.get('url') : null);
      if (target) u = new URL(target);
      u = publicUrl(u.href);
      if (/(^|\.)(duckduckgo\.com|google\.com)$/.test(u.hostname)) continue;
      const next = anchors.slice(i + 1).find(x => /\b(result__a|result-link)\b/.test(attributes(x[1]).class || ''));
      const following = html.slice(m.index! + m[0].length, next?.index ?? m.index! + m[0].length + 4000);
      const snippetMatch = following.match(/<(?:a|td|div)\b[^>]*class\s*=\s*["'][^"']*result(?:__|-)?snippet[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|td|div)>/i);
      const title = textFromHtml(m[2]).replace(/\s+/g,' ');
      if (title && !results.some(r => r.url === u.href)) results.push({ url: u.href, title, snippet: snippetMatch ? textFromHtml(snippetMatch[1]) : '' });
      if (results.length >= limit) break;
    } catch { /* Reject malformed or non-public result destinations. */ }
  }
  return results;
}

export function parseBingRssResults(xml: string, limit = 8): WebSearchResult[] {
  const results: WebSearchResult[] = [];
  for (const match of xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>(https?:\/\/[^<]+)<\/link>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<\/item>/gi)) {
    try {
      const url = publicUrl(textFromHtml(match[2].trim())).href;
      if (results.some(r => r.url === url)) continue;
      results.push({url, title:textFromHtml(match[1]).replace(/\s+/g,' ').trim(), snippet:textFromHtml(match[3]).replace(/\s+/g,' ').trim()});
      if (results.length >= limit) break;
    } catch { /* Skip malformed RSS items. */ }
  }
  return results;
}

/**
 * Multi-Provider Search Engine
 * Fallback Chain:
 * 1. Google Custom Search (if GOOGLE_SEARCH_API_KEY & GOOGLE_SEARCH_CX configured)
 * 2. Tavily AI Search (if TAVILY_API_KEY configured)
 * 3. Serper.dev API (if SERPER_API_KEY configured)
 * 4. Brave Search API (if BRAVE_SEARCH_API_KEY configured)
 * 5. Wikipedia Search API (for General Knowledge & conceptual queries)
 * 6. DuckDuckGo HTML / DuckDuckGo Lite / Bing RSS (Built-in zero-key fallback)
 */
export async function webSearchFree(query: string, maxResults = 8, fetcher: typeof fetch = fetch): Promise<SearchResult> {
  const results: WebSearchResult[] = [];
  const diagnostics: CollectionDiagnostic[] = [];

  const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const googleCx = process.env.GOOGLE_SEARCH_CX;
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  const serperApiKey = process.env.SERPER_API_KEY;
  const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;

  // 1. Google Custom Search API
  if (googleApiKey && googleCx) {
    try {
      const gUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodeURIComponent(query)}&num=${Math.min(maxResults, 10)}`;
      const res = await fetcher(gUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.items && Array.isArray(data.items)) {
          for (const item of data.items) {
            results.push({
              title: item.title || '',
              url: item.link || '',
              snippet: item.snippet || ''
            });
          }
          diagnostics.push({ stage: 'SEARCH', target: 'Google Custom Search', status: 'OK', detail: `${results.length} links for ${query}` });
          if (results.length > 0) {
            return formatSearchResult(results, diagnostics, maxResults);
          }
        }
      } else {
        diagnostics.push({ stage: 'SEARCH', target: 'Google Custom Search', status: 'PROVIDER_ERROR', detail: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      diagnostics.push({ stage: 'SEARCH', target: 'Google Custom Search', status: 'FAILED', detail: e?.message || String(e) });
    }
  }

  // 2. Tavily AI Search API
  if (tavilyApiKey) {
    try {
      const res = await fetcher('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: tavilyApiKey, query, max_results: maxResults })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          for (const item of data.results) {
            results.push({
              title: item.title || '',
              url: item.url || '',
              snippet: item.content || item.snippet || ''
            });
          }
          diagnostics.push({ stage: 'SEARCH', target: 'Tavily AI Search', status: 'OK', detail: `${results.length} links for ${query}` });
          if (results.length > 0) {
            return formatSearchResult(results, diagnostics, maxResults);
          }
        }
      } else {
        diagnostics.push({ stage: 'SEARCH', target: 'Tavily AI Search', status: 'PROVIDER_ERROR', detail: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      diagnostics.push({ stage: 'SEARCH', target: 'Tavily AI Search', status: 'FAILED', detail: e?.message || String(e) });
    }
  }

  // 3. Serper.dev Google API
  if (serperApiKey) {
    try {
      const res = await fetcher('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: maxResults })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.organic && Array.isArray(data.organic)) {
          for (const item of data.organic) {
            results.push({
              title: item.title || '',
              url: item.link || '',
              snippet: item.snippet || ''
            });
          }
          diagnostics.push({ stage: 'SEARCH', target: 'Serper.dev', status: 'OK', detail: `${results.length} links for ${query}` });
          if (results.length > 0) {
            return formatSearchResult(results, diagnostics, maxResults);
          }
        }
      } else {
        diagnostics.push({ stage: 'SEARCH', target: 'Serper.dev', status: 'PROVIDER_ERROR', detail: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      diagnostics.push({ stage: 'SEARCH', target: 'Serper.dev', status: 'FAILED', detail: e?.message || String(e) });
    }
  }

  // 4. Brave Search API
  if (braveApiKey) {
    try {
      const res = await fetcher(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`, {
        headers: { 'X-Subscription-Token': braveApiKey, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.web && data.web.results && Array.isArray(data.web.results)) {
          for (const item of data.web.results) {
            results.push({
              title: item.title || '',
              url: item.url || '',
              snippet: item.description || ''
            });
          }
          diagnostics.push({ stage: 'SEARCH', target: 'Brave Search', status: 'OK', detail: `${results.length} links for ${query}` });
          if (results.length > 0) {
            return formatSearchResult(results, diagnostics, maxResults);
          }
        }
      } else {
        diagnostics.push({ stage: 'SEARCH', target: 'Brave Search', status: 'PROVIDER_ERROR', detail: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      diagnostics.push({ stage: 'SEARCH', target: 'Brave Search', status: 'FAILED', detail: e?.message || String(e) });
    }
  }

  // 5. Wikipedia API (for conceptual/factual knowledge verification)
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=4`;
    const res = await fetcher(wikiUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.query && data.query.search && Array.isArray(data.query.search)) {
        for (const item of data.query.search) {
          const cleanSnippet = textFromHtml(item.snippet || '').replace(/\s+/g, ' ').trim();
          results.push({
            title: `${item.title} (Wikipedia)`,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
            snippet: cleanSnippet
          });
        }
        diagnostics.push({ stage: 'SEARCH', target: 'Wikipedia API', status: 'OK', detail: `${data.query.search.length} wiki articles for ${query}` });
      }
    }
  } catch { /* Skip wiki on error */ }

  // 6. Zero-Key Fallback: DuckDuckGo HTML / DuckDuckGo Lite / Bing RSS
  const engines = [
    ['DuckDuckGo HTML', 'https://html.duckduckgo.com/html/?q='],
    ['DuckDuckGo Lite', 'https://lite.duckduckgo.com/lite/?q='],
    ['Bing RSS', 'https://www.bing.com/search?format=rss&q='],
  ];
  for (const [engine, base] of engines) {
    try {
      const response = await readPublic(base + encodeURIComponent(query), { fetcher, timeoutMs: 8000 });
      const html = response.text();
      if (/anomaly\.js|anomaly-modal|challenge-form|unusual traffic|captcha/i.test(html)) {
        diagnostics.push({ stage:'SEARCH', target:engine, status:'PROVIDER_BLOCKED', detail:'Search provider returned a challenge.' });
        continue;
      }
      const found = engine === 'Bing RSS' ? parseBingRssResults(html, maxResults) : parseSearchResults(html, base, maxResults);
      for (const r of found) if (!results.some(x => x.url === r.url)) results.push(r);
      diagnostics.push({ stage:'SEARCH', target:engine, status:found.length ? 'OK' : 'NO_RESULTS', detail:`${found.length} links for ${query}` });
      if (results.length) break;
    } catch (e: any) { diagnostics.push({ stage:'SEARCH', target:engine, status:'FAILED', detail:e?.message || String(e) }); }
  }

  return formatSearchResult(results, diagnostics, maxResults);
}

function formatSearchResult(results: WebSearchResult[], diagnostics: CollectionDiagnostic[], maxResults: number): SearchResult {
  const sliced = results.slice(0, maxResults);
  const combinedSnippets = sliced.map(r => `[${r.title}] (${r.url})\n${r.snippet}`).join('\n\n').slice(0, 30000);
  return { results: sliced, diagnostics, combinedSnippets };
}

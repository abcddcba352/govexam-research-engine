/** Shared bounds for untrusted public source URLs, redirects and response bodies. */
export function publicUrl(raw: string): URL {
  const u = new URL(raw);
  const h = u.hostname.toLowerCase();
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password ||
      (u.port && !['80', '443'].includes(u.port)) || !h.includes('.') ||
      /(^|\.)(localhost|local|internal|test|invalid)$/.test(h) || h.includes(':') ||
      /^\d+\./.test(h)) throw new Error('SOURCE_URL_REJECTED');
  u.hash = '';
  return u;
}

export async function readPublic(raw: string, options: { fetcher?: typeof fetch; timeoutMs?: number; maxBytes?: number; allowUrl?:(url:string)=>boolean } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10000);
  try {
    let url = publicUrl(raw).href;
    for (let n = 0; n <= 4; n++) {
      if(options.allowUrl && !options.allowUrl(url)) throw Error('SOURCE_PUBLISHER_REJECTED');
      const response = await (options.fetcher || fetch)(url, {
        redirect: 'manual', signal: controller.signal,
        headers: { Accept: 'text/html,application/rss+xml,application/atom+xml,application/json,application/pdf,text/plain,*/*;q=0.5', 'User-Agent': 'GovExamResearch/1.0' },
      });
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location) throw new Error('REDIRECT_WITHOUT_LOCATION');
        url = publicUrl(new URL(location, url).href).href;
        continue;
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP_${response.status}`); }
      const limit = options.maxBytes ?? 2_000_000;
      if (Number(response.headers.get('content-length')) > limit) {
        await response.body?.cancel(); throw new Error('SOURCE_TOO_LARGE');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('EMPTY_RESPONSE');
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) {
        const part = await reader.read(); if (part.done) break;
        size += part.value.length;
        if (size > limit) { await reader.cancel(); throw new Error('SOURCE_TOO_LARGE'); }
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return { url, bytes, headers: response.headers, status: response.status, text: () => new TextDecoder().decode(bytes) };
    }
    throw new Error('TOO_MANY_REDIRECTS');
  } catch (error: any) {
    if (controller.signal.aborted) throw new Error('SOURCE_TIMEOUT');
    throw error;
  } finally { clearTimeout(timer); }
}

export const decodeHtml = (s: string) => s.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&nbsp;/gi, ' ')
  .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, v) => { const n = v[0].toLowerCase() === 'x' ? parseInt(v.slice(1),16) : Number(v); return n <= 0x10ffff ? String.fromCodePoint(n) : ''; });
export const textFromHtml = (html: string) => decodeHtml(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<\/(p|div|h\d|li|tr)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
export function attributes(tag: string) {
  const values: Record<string,string> = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) values[m[1].toLowerCase()] = decodeHtml(m[2] ?? m[3] ?? m[4]);
  return values;
}

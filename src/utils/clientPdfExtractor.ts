/**
 * Client-Side PDF Text Extractor
 * Extracts plain text directly inside the user's browser, eliminating
 * large base64 network payloads, Cloudflare 50ms CPU limits, and 503 worker timeouts.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Initialize PDF.js worker with local bundled worker asset
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  } catch {
    // Fallback to exact matching unpkg version
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

async function decompressFlate(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('deflate');
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      let totalLength = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalLength += value.length;
        }
      }
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      return new TextDecoder('latin1').decode(merged);
    } catch {
      try {
        const dsRaw = new DecompressionStream('deflate-raw');
        const writer = dsRaw.writable.getWriter();
        writer.write(bytes);
        writer.close();
        const reader = dsRaw.readable.getReader();
        const chunks: Uint8Array[] = [];
        let totalLength = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            totalLength += value.length;
          }
        }
        const merged = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        return new TextDecoder('latin1').decode(merged);
      } catch {
        return new TextDecoder('latin1').decode(bytes);
      }
    }
  }
  return new TextDecoder('latin1').decode(bytes);
}

// Convert hex string <00410042> or <4142> into readable ASCII text
function decodeHexPdfStr(hexStr: string): string {
  const clean = hexStr.replace(/[^0-9a-fA-F]/g, '');
  let result = '';
  if (clean.length % 4 === 0 && clean.length >= 4) {
    // UTF-16BE / CID encoding
    for (let i = 0; i < clean.length; i += 4) {
      const code = parseInt(clean.substring(i, i + 4), 16);
      if (code >= 32 && code <= 126) {
        result += String.fromCharCode(code);
      } else if (code === 10 || code === 13) {
        result += '\n';
      }
    }
  }
  if (!result || result.length < clean.length / 4) {
    // 8-bit hex
    result = '';
    for (let i = 0; i < clean.length; i += 2) {
      const code = parseInt(clean.substring(i, i + 2), 16);
      if (code >= 32 && code <= 126) {
        result += String.fromCharCode(code);
      } else if (code === 10 || code === 13) {
        result += '\n';
      }
    }
  }
  return result;
}

// Pure client-side PDF stream extractor for instantaneous text recovery (<50ms)
async function fastExtractFromBinary(bytes: Uint8Array): Promise<{ text: string; page_count: number } | null> {
  try {
    let latin1 = '';
    const chunk = 16384;
    for (let i = 0; i < bytes.length; i += chunk) {
      latin1 += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }

    const pageMatches = latin1.match(/\/Type\s*\/Page\b/g);
    const page_count = pageMatches ? pageMatches.length : 1;

    let extractedText = '';
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;
    let streamCount = 0;

    while ((match = streamRegex.exec(latin1)) !== null && streamCount < 200 && extractedText.length < 500000) {
      streamCount++;
      const streamData = match[1];
      let decompressed = streamData;

      const objHeader = latin1.substring(Math.max(0, match.index - 400), match.index);
      if (/\/Filter\s*(?:\[\s*)?\/FlateDecode/i.test(objHeader)) {
        try {
          const rawBytes = new Uint8Array(streamData.length);
          for (let b = 0; b < streamData.length; b++) {
            rawBytes[b] = streamData.charCodeAt(b) & 0xff;
          }
          decompressed = await decompressFlate(rawBytes);
        } catch {
          // Keep streamData as is
        }
      }

      // 1. Extract array strings: [(str1) 12 (str2)] TJ
      const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjArrayRegex.exec(decompressed)) !== null) {
        const inner = tjMatch[1];
        // Handle parenthesis strings: (text)
        const strMatches = inner.match(/\((?:[^\\)]|\\.)*\)/g);
        if (strMatches) {
          const line = strMatches.map(s => unescapePdf(s.slice(1, -1))).join('');
          if (line.trim()) extractedText += line + ' ';
        }
        // Handle hex strings: <0041>
        const hexMatches = inner.match(/<[0-9a-fA-F]+>/g);
        if (hexMatches) {
          const line = hexMatches.map(h => decodeHexPdfStr(h.slice(1, -1))).join('');
          if (line.trim()) extractedText += line + ' ';
        }
      }

      // 2. Direct strings: (string) Tj or ' string or " string
      const tjDirectRegex = /\(((?:[^\\)]|\\.)*)\)\s*(?:Tj|'|")/g;
      let dirMatch: RegExpExecArray | null;
      while ((dirMatch = tjDirectRegex.exec(decompressed)) !== null) {
        const line = unescapePdf(dirMatch[1]);
        if (line.trim()) extractedText += line + '\n';
      }

      // 3. Direct hex strings: <hex> Tj
      const tjHexDirectRegex = /<([0-9a-fA-F]+)>\s*(?:Tj|'|")/g;
      let dirHexMatch: RegExpExecArray | null;
      while ((dirHexMatch = tjHexDirectRegex.exec(decompressed)) !== null) {
        const line = decodeHexPdfStr(dirHexMatch[1]);
        if (line.trim()) extractedText += line + '\n';
      }
    }

    const cleaned = extractedText
      .replace(/\0/g, '')
      .replace(/\\u0000/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/ +/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (cleaned.length >= 80) {
      return { text: cleaned, page_count };
    }
    return null;
  } catch {
    return null;
  }
}

function unescapePdf(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

/**
 * Main client-side PDF text extractor.
 * Combines fast client stream extraction with full PDF.js browser parsing.
 */
export async function extractPdfTextInBrowser(
  file: File,
  onProgress?: (msg: string) => void
): Promise<{ text: string; page_count: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  onProgress?.('Reading document structure...');

  // 1. Try instantaneous fast binary stream extraction (decompresses Flate streams with browser DecompressionStream)
  try {
    const fast = await fastExtractFromBinary(uint8);
    if (fast && fast.text.length > 200) {
      return fast;
    }
  } catch (fastErr) {
    console.warn('[clientPdfExtractor] Fast binary extraction error, trying PDF.js:', fastErr);
  }

  onProgress?.('Extracting text layers from PDF pages...');

  // 2. Load PDF.js in the browser with local worker
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: uint8,
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: true,
      stopAtErrors: false
    });

    const pdf = await loadingTask.promise;
    let fullText = '';
    const totalPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(`Extracting page ${pageNum} of ${totalPages}...`);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);
      
      const pageText = pageStrings.join(' ');
      if (pageText.trim()) {
        fullText += `\n--- Page ${pageNum} ---\n` + pageText + '\n';
      }
    }

    const cleaned = fullText
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/ +/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (cleaned.length > 50) {
      return { text: cleaned, page_count: totalPages };
    }
  } catch (pdfjsErr: any) {
    console.warn('[clientPdfExtractor] PDF.js browser extraction error:', pdfjsErr?.message || pdfjsErr);
    
    // Fallback 2b: Try again with worker disabled / fake worker
    try {
      const loadingTaskNoWorker = pdfjsLib.getDocument({
        data: uint8,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
        disableFontFace: true,
        stopAtErrors: false
      });
      const pdf = await loadingTaskNoWorker.promise;
      let fullText = '';
      const totalPages = pdf.numPages;
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageStrings = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .filter(Boolean);
        const pageText = pageStrings.join(' ');
        if (pageText.trim()) {
          fullText += `\n--- Page ${pageNum} ---\n` + pageText + '\n';
        }
      }
      const cleaned = fullText.trim();
      if (cleaned.length > 50) {
        return { text: cleaned, page_count: totalPages };
      }
    } catch (fallbackErr: any) {
      console.warn('[clientPdfExtractor] Fake worker fallback error:', fallbackErr?.message);
    }
  }

  // 3. If fast binary found any text at all (>50 chars), return it as a best effort
  try {
    const fast = await fastExtractFromBinary(uint8);
    if (fast && fast.text.length > 40) {
      return fast;
    }
  } catch {}

  throw new Error('Could not extract selectable text from this PDF. It appears to be a scanned image without an OCR text layer.');
}

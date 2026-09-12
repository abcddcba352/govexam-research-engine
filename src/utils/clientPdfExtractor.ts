/**
 * Client-Side PDF Text Extractor
 * Extracts plain text directly inside the user's browser, eliminating
 * large base64 network payloads, Cloudflare 50ms CPU limits, and 503 worker timeouts.
 */

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

    while ((match = streamRegex.exec(latin1)) !== null && streamCount < 150 && extractedText.length < 500000) {
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
        const strMatches = inner.match(/\((?:[^\\)]|\\.)*\)/g);
        if (strMatches) {
          const line = strMatches.map(s => unescapePdf(s.slice(1, -1))).join('');
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
export async function extractPdfTextInBrowser(file: File): Promise<{ text: string; page_count: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // 1. Try instantaneous fast binary stream extraction (decompresses Flate streams with browser DecompressionStream)
  try {
    const fast = await fastExtractFromBinary(uint8);
    if (fast && fast.text.length > 150) {
      return fast;
    }
  } catch (fastErr) {
    console.warn('[clientPdfExtractor] Fast binary extraction error, trying PDF.js:', fastErr);
  }

  // 2. Load PDF.js dynamically in the browser
  try {
    const pdfjsLib = await import('pdfjs-dist');
    
    // Configure worker via CDN or fake worker fallback so it works universally in all browsers
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
    }

    const loadingTask = pdfjsLib.getDocument({
      data: uint8,
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: true
    });

    const pdf = await loadingTask.promise;
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

    const cleaned = fullText
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/ +/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (cleaned.length > 50) {
      return { text: cleaned, page_count: totalPages };
    }
  } catch (pdfjsErr) {
    console.warn('[clientPdfExtractor] PDF.js browser extraction error:', pdfjsErr);
  }

  throw new Error('Could not extract selectable text from this PDF. It may be a scanned image or image-only document.');
}

/**
 * GovExam PDF Ingestion & Text Extraction Engine
 * Parses official notification and syllabus PDFs published by government exam commissions.
 */

import zlib from 'node:zlib';

let PDFParseClass: any = null;

function unescapePdfStr(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => {
      const code = parseInt(oct, 8);
      return code === 0 ? '' : String.fromCharCode(code);
    })
    .replace(/\0/g, '')
    .replace(/\\u0000/g, '');
}

/**
 * Ultra-fast native stream PDF text extraction.
 * Extracts font strings and decompresses Flate streams in ~1-3ms CPU time,
 * completely avoiding heavy Canvas/DOMMatrix polyfills and CPU exhaustion.
 */
export function fastExtractPdfText(buffer: ArrayBuffer | Uint8Array | Buffer): ParsedPdfResult | null {
  try {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const latin1 = Buffer.from(bytes).toString('latin1');

    const pageMatches = latin1.match(/\/Type\s*\/Page\b/g);
    const page_count = pageMatches ? pageMatches.length : 1;

    let extractedText = '';

    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;
    let streamCount = 0;

    while ((match = streamRegex.exec(latin1)) !== null && streamCount < 100 && extractedText.length < 250000) {
      streamCount++;
      const streamData = match[1];
      let decompressed = streamData;

      const objHeader = latin1.substring(Math.max(0, match.index - 400), match.index);
      if (/\/Filter\s*(?:\[\s*)?\/FlateDecode/i.test(objHeader)) {
        try {
          const rawBuf = Buffer.from(streamData, 'latin1');
          decompressed = zlib.inflateSync(rawBuf).toString('latin1');
        } catch {
          try {
            const rawBuf = Buffer.from(streamData, 'latin1');
            decompressed = zlib.inflateRawSync(rawBuf).toString('latin1');
          } catch {
            // Keep streamData as is
          }
        }
      }

      // 1. Extract array strings: [(str1) 12 (str2)] TJ or [<0041> 12 <0042>] TJ
      const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjArrayRegex.exec(decompressed)) !== null) {
        const inner = tjMatch[1];
        const tokenRegex = /\((?:[^\\)]|\\.)*\)|<[0-9a-fA-F]+>/g;
        const tokens = inner.match(tokenRegex);
        if (tokens) {
          const line = tokens.map(t => {
            if (t.startsWith('(')) {
              return unescapePdfStr(t.slice(1, -1));
            } else if (t.startsWith('<')) {
              const hex = t.slice(1, -1);
              let s = '';
              for (let i = 0; i < hex.length; i += 2) {
                const byte = parseInt(hex.substr(i, 2), 16);
                if (byte >= 32 && byte <= 126) s += String.fromCharCode(byte);
              }
              return s;
            }
            return '';
          }).join('');
          if (line.trim()) extractedText += line + ' ';
        }
      }

      // 2. Direct strings: (string) Tj or <hex> Tj
      const tjDirectRegex = /(?:\(((?:[^\\)]|\\.)*)\)|<([0-9a-fA-F]+)>)\s*(?:Tj|'|")/g;
      let dirMatch: RegExpExecArray | null;
      while ((dirMatch = tjDirectRegex.exec(decompressed)) !== null) {
        if (dirMatch[1] !== undefined) {
          const line = unescapePdfStr(dirMatch[1]);
          if (line.trim()) extractedText += line + '\n';
        } else if (dirMatch[2] !== undefined) {
          const hex = dirMatch[2];
          let s = '';
          for (let i = 0; i < hex.length; i += 2) {
            const byte = parseInt(hex.substr(i, 2), 16);
            if (byte >= 32 && byte <= 126) s += String.fromCharCode(byte);
          }
          if (s.trim()) extractedText += s + '\n';
        }
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

    // Verify the extracted text contains meaningful words and letters, NOT just digits/integers
    const letterMatches = cleaned.match(/[a-zA-Z\u0900-\u0D7F]/g) || [];
    const digitMatches = cleaned.match(/[0-9]/g) || [];
    const wordMatches = cleaned.match(/[a-zA-Z\u0900-\u0D7F]{2,}/g) || [];
    const letterCount = letterMatches.length;
    const digitCount = digitMatches.length;
    const totalAlphanumeric = letterCount + digitCount;
    const letterRatio = totalAlphanumeric > 0 ? letterCount / totalAlphanumeric : 0;

    if (cleaned.length >= 40 && letterCount >= 25 && wordMatches.length >= 8 && letterRatio >= 0.35) {
      return { text: cleaned, page_count, success: true };
    }
    return null;
  } catch {
    return null;
  }
}

function ensureWorkerDomMatrix() {
  if (typeof (globalThis as any).DOMMatrix !== 'undefined') return;
  // pdfjs creates one matrix while its module is initialising. Text extraction
  // does not need a browser canvas, but Workers still need this small 2-D shape
  // available before the ESM module is evaluated.
  class WorkerDOMMatrix {
    a=1; b=0; c=0; d=1; e=0; f=0;
    m11=1; m12=0; m21=0; m22=1; m41=0; m42=0;
    is2D=true;
    constructor(init?: any) {
      if (Array.isArray(init) && init.length >= 6) [this.a,this.b,this.c,this.d,this.e,this.f]=init;
      if (init && typeof init === 'object') Object.assign(this, init);
      this.m11=this.a; this.m12=this.b; this.m21=this.c; this.m22=this.d; this.m41=this.e; this.m42=this.f;
    }
    multiply(other:any) { return new WorkerDOMMatrix([this.a*other.a+this.c*other.b,this.b*other.a+this.d*other.b,this.a*other.c+this.c*other.d,this.b*other.c+this.d*other.d,this.a*other.e+this.c*other.f+this.e,this.b*other.e+this.d*other.f+this.f]); }
    preMultiplySelf(other:any) { const next=new WorkerDOMMatrix(other).multiply(this); Object.assign(this,next); return this; }
    translate(x=0,y=0) { return this.multiply(new WorkerDOMMatrix([1,0,0,1,x,y])); }
    scale(x=1,y=x) { return this.multiply(new WorkerDOMMatrix([x,0,0,y,0,0])); }
    invertSelf() { const det=this.a*this.d-this.b*this.c; if (!det) return this; Object.assign(this,new WorkerDOMMatrix([this.d/det,-this.b/det,-this.c/det,this.a/det,(this.c*this.f-this.d*this.e)/det,(this.b*this.e-this.a*this.f)/det])); return this; }
  }
  (globalThis as any).DOMMatrix = WorkerDOMMatrix;
}

async function getPDFParseClass() {
  if (!PDFParseClass) {
    ensureWorkerDomMatrix();
    try {
      // Bundle the JavaScript worker itself; pdf-parse/worker also imports a
      // native canvas binary and its data-URL import cannot run on Cloudflare.
      const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
      (globalThis as any).pdfjsWorker = worker;
      const mod: any = await import('pdf-parse');
      PDFParseClass = mod.PDFParse || mod.default?.PDFParse || mod.default;
    } catch { PDFParseClass = null; }
  }
  return PDFParseClass;
}

export interface ParsedPdfResult {
  text: string;
  page_count: number;
  success: boolean;
  error?: string;
}

/**
 * Extracts clean structured text from a binary PDF buffer
 */
export async function extractPdfText(buffer: ArrayBuffer | Uint8Array | Buffer): Promise<ParsedPdfResult> {
  // 1. First, attempt ultra-fast stream extraction (~1-2ms CPU time, zero canvas/browser polyfills)
  const fast = fastExtractPdfText(buffer);
  if (fast && fast.success) {
    return fast;
  }

  // 2. Guard against heavy pdfjs-dist execution inside Cloudflare Workers
  // Cloudflare Workers has a strict 50ms CPU limit. In this environment, pdfjs-dist
  // takes >1800ms of CPU time to parse fonts/canvas and will trigger an immediate Worker crash (503).
  const isCloudflare = typeof (globalThis as any).WebSocketPair !== 'undefined' ||
    process.env.APP_ENV === 'staging' ||
    process.env.ENVIRONMENT === 'staging' ||
    Boolean(process.env.CF_PAGES || process.env.WORKERS_ENV) ||
    !process.versions?.node;

  if (isCloudflare) {
    return {
      text: '',
      page_count: 0,
      success: false,
      error: 'PDF_REQUIRES_OCR_OR_UNSUPPORTED_ENCODING',
    };
  }

  let parser: any;
  try {
    const Cls: any = await getPDFParseClass();
    if (!Cls) {
      return { text: '', page_count: 0, success: false, error: 'PDFParse library could not be loaded' };
    }

    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    parser = new Cls({ data: new Uint8Array(uint8), useSystemFonts: false, isEvalSupported: false });
    
    let rawText = '';
    let totalPages = 1;

    if (typeof parser.getText === 'function') {
      const textResult = await parser.getText();
      if (typeof textResult === 'string') {
        rawText = textResult;
      } else if (textResult && typeof textResult === 'object') {
        rawText = textResult.text || (Array.isArray(textResult.pages) ? textResult.pages.map((p: any) => p.text).join('\n\n') : '');
        totalPages = textResult.total || (Array.isArray(textResult.pages) ? textResult.pages.length : 1);
      }
    }

    // Clean up typical government PDF artifact noise
    const cleanedText = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/ +/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      text: cleanedText,
      page_count: totalPages,
      success: cleanedText.length > 30,
    };
  } catch (err: any) {
    return {
      text: '',
      page_count: 0,
      success: false,
      error: err?.message || String(err),
    };
  } finally {
    try { await parser?.destroy?.(); } catch { /* Preserve extraction outcome. */ }
  }
}

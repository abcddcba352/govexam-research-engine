/**
 * GovExam PDF Ingestion & Text Extraction Engine
 * Parses official notification and syllabus PDFs published by government exam commissions.
 */

let PDFParseClass: any = null;

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

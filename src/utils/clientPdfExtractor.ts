/**
 * Client-Side PDF Text Extractor
 * Uses Mozilla PDF.js to extract text layers, font CMaps, and layout structure
 * directly inside the user's browser, producing clean readable question papers.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker with local bundled worker asset
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).href;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

export interface TextValidationStats {
  length: number;
  letterCount: number;
  digitCount: number;
  wordCount: number;
  letterRatio: number;
}

export interface TextValidationResult {
  isValid: boolean;
  reason?: 'TOO_SHORT' | 'INTEGER_ONLY' | 'NO_WORDS' | 'NON_PRINTABLE';
  stats: TextValidationStats;
}

/**
 * Verifies whether extracted text represents genuine question paper content
 * rather than unmapped glyph codes, isolated page numbers, or an integer-only dump.
 */
export function validateExtractedQuestionText(text: string): TextValidationResult {
  const trimmed = (text || '').trim();
  const length = trimmed.length;

  if (length < 40) {
    return {
      isValid: false,
      reason: 'TOO_SHORT',
      stats: { length, letterCount: 0, digitCount: 0, wordCount: 0, letterRatio: 0 }
    };
  }

  // Count printable characters
  let printableCount = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (
      (code >= 32 && code <= 126) ||
      code === 10 || code === 13 || code === 9 ||
      (code >= 0x0900 && code <= 0x0D7F) // Indic scripts (Devanagari, Telugu, Tamil, Kannada, etc.)
    ) {
      printableCount++;
    }
  }

  if (printableCount / length < 0.80) {
    return {
      isValid: false,
      reason: 'NON_PRINTABLE',
      stats: { length, letterCount: 0, digitCount: 0, wordCount: 0, letterRatio: 0 }
    };
  }

  // Count letters (English + Indic scripts) and digits
  const letterMatches = trimmed.match(/[a-zA-Z\u0900-\u0D7F]/g) || [];
  const digitMatches = trimmed.match(/[0-9]/g) || [];
  const wordMatches = trimmed.match(/[a-zA-Z\u0900-\u0D7F]{2,}/g) || [];

  const letterCount = letterMatches.length;
  const digitCount = digitMatches.length;
  const wordCount = wordMatches.length;
  const totalAlphanumeric = letterCount + digitCount;
  const letterRatio = totalAlphanumeric > 0 ? letterCount / totalAlphanumeric : 0;

  const stats: TextValidationStats = {
    length,
    letterCount,
    digitCount,
    wordCount,
    letterRatio
  };

  // Rejection 1: Dominantly integers/digits (e.g. "1 2 3 ... 25" with no questions)
  if (letterCount < 35 || letterRatio < 0.35) {
    return {
      isValid: false,
      reason: 'INTEGER_ONLY',
      stats
    };
  }

  // Rejection 2: Deficient word count (question papers must have questions)
  if (wordCount < 10) {
    return {
      isValid: false,
      reason: 'NO_WORDS',
      stats
    };
  }

  return {
    isValid: true,
    stats
  };
}

export interface ClientPdfExtractResult {
  text: string;
  page_count: number;
  isScannedOrIntegerOnly?: boolean;
  stats?: TextValidationStats;
}

/**
 * Loads a PDF document with local CMap tables and standard font maps.
 */
async function loadPdfDocument(uint8: Uint8Array): Promise<any> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const cMapUrl = baseUrl ? `${baseUrl}/cmaps/` : `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`;
  const standardFontDataUrl = baseUrl ? `${baseUrl}/standard_fonts/` : `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: uint8,
      cMapUrl,
      cMapPacked: true,
      standardFontDataUrl,
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: false,
      stopAtErrors: false
    });
    return await loadingTask.promise;
  } catch (err: any) {
    console.warn('[PDF Extract] Primary load failed, using fallback:', err?.message);
    const fallbackTask = pdfjsLib.getDocument({
      data: uint8,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
      stopAtErrors: false
    });
    return await fallbackTask.promise;
  }
}

/**
 * Extracts structured, readable text from a PDF file using Mozilla PDF.js.
 * Correctly reconstructs reading order by sorting coordinates top-to-bottom and left-to-right.
 */
export async function extractPdfTextInBrowser(
  file: File,
  onProgress?: (msg: string) => void
): Promise<ClientPdfExtractResult> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  onProgress?.('Loading PDF document...');
  const pdf = await loadPdfDocument(uint8);
  const totalPages = pdf.numPages;
  let fullText = '';

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(`Extracting text from page ${pageNum} of ${totalPages}...`);
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent({ normalizeWhitespace: true });

    const items = (textContent.items || []) as Array<{
      str: string;
      transform?: number[];
      width?: number;
      height?: number;
      hasEOL?: boolean;
    }>;

    if (!items || items.length === 0) continue;

    // Sort items into reading order: top-to-bottom (descending Y), left-to-right (ascending X)
    items.sort((a, b) => {
      const yA = a.transform?.[5] ?? 0;
      const yB = b.transform?.[5] ?? 0;
      if (Math.abs(yA - yB) > 3.5) {
        return yB - yA; // Higher Y coordinate comes first
      }
      const xA = a.transform?.[4] ?? 0;
      const xB = b.transform?.[4] ?? 0;
      return xA - xB; // Lower X comes first on same horizontal line
    });

    // Assemble lines
    const pageLines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;

    for (const item of items) {
      if (!item.str && !item.hasEOL) continue;
      const str = item.str || '';
      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const y = transform[5];

      const isVerticalJump = lastY !== null && Math.abs(y - lastY) > 3.5;
      const startsQuestion = /^\s*(?:(?:Q(?:uestion)?|Sl\.?\s*No\.?|Item)?\s*[\.\:\-]?\s*(?:\(?\s*\d+\s*\)?|\[\s*\d+\s*\])[\.\:\)\-\s]*|\bQ\d+\b)/i.test(str);
      const startsOption = /^\s*(?:\(?[A-Da-d]\)[\.\:\)]?|\bOption\s*[A-D]\b|\(?[1-4]\)[\.\:\)]?|\[[1-4]\])/i.test(str);

      if (isVerticalJump || item.hasEOL || (currentLine.length > 0 && (startsQuestion || startsOption))) {
        if (currentLine.trim()) {
          pageLines.push(currentLine.trim());
        }
        currentLine = str;
      } else {
        if (currentLine && !currentLine.endsWith(' ') && !str.startsWith(' ') && !/^[,.;:?!]/.test(str)) {
          currentLine += ' ' + str;
        } else {
          currentLine += str;
        }
      }

      lastY = y;
    }

    if (currentLine.trim()) {
      pageLines.push(currentLine.trim());
    }

    const pageContent = pageLines.join('\n');
    if (pageContent.trim()) {
      fullText += (fullText ? '\n\n' : '') + pageContent;
    }
  }

  const cleaned = fullText
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Validate extracted text
  const validation = validateExtractedQuestionText(cleaned);
  if (!validation.isValid) {
    return {
      text: '',
      page_count: totalPages,
      isScannedOrIntegerOnly: true,
      stats: validation.stats
    };
  }

  return {
    text: cleaned,
    page_count: totalPages,
    isScannedOrIntegerOnly: false,
    stats: validation.stats
  };
}

/**
 * Renders an individual PDF page onto an HTML5 canvas and converts it to a compressed JPEG base64 string.
 */
async function renderPageToJpegBase64(page: any, scale: number = 1.3): Promise<string> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Canvas 2D context unavailable');

  // Fill solid white background
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: context,
    viewport: viewport,
    intent: 'print'
  }).promise;

  const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
  return dataUrl.split(',')[1];
}

/**
 * Scanned PDF Visual OCR Engine:
 * Renders pages to HTML5 canvas and sends lightweight (~80-120KB) JPEG images
 * to Gemini 3.1 Flash Lite to extract questions verbatim from photocopied or image papers.
 */
export async function extractScannedPdfWithVisionOcr(
  file: File,
  maxPages: number = 50,
  onProgress?: (msg: string, current: number, total: number) => void
): Promise<{ text: string; page_count: number; question_count: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  onProgress?.('Preparing document for AI Vision OCR...', 0, 1);
  const pdf = await loadPdfDocument(uint8);
  const totalPages = pdf.numPages;
  const pagesToScan = Math.min(totalPages, maxPages);

  const accumulatedPages: { pageNum: number; text: string; qCount: number }[] = [];
  const BATCH_SIZE = 2;

  for (let i = 1; i <= pagesToScan; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE - 1, pagesToScan);
    const progressLabel = batchEnd > i
      ? `AI Vision OCR: Scanning Pages ${i}-${batchEnd} of ${pagesToScan}...`
      : `AI Vision OCR: Scanning Page ${i} of ${pagesToScan}...`;
    onProgress?.(progressLabel, i, pagesToScan);

    const batchPromises = [];
    for (let p = i; p <= batchEnd; p++) {
      const pageNum = p;
      batchPromises.push((async () => {
        try {
          const page = await pdf.getPage(pageNum);
          const imageBase64 = await renderPageToJpegBase64(page, 1.3);

          const res = await fetch('/api/pyq/ocr-page', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: imageBase64,
              pageNumber: pageNum,
              totalPages: pagesToScan
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.text) {
              return {
                pageNum,
                text: `--- Page ${pageNum} ---\n` + data.text,
                qCount: data.questionCount || 0
              };
            }
          } else {
            console.warn(`[Vision OCR] Page ${pageNum} returned status ${res.status}`);
          }
        } catch (pageErr: any) {
          console.warn(`[Vision OCR] Error scanning page ${pageNum}:`, pageErr?.message);
        }
        return { pageNum, text: '', qCount: 0 };
      })());
    }

    const batchResults = await Promise.all(batchPromises);
    for (const r of batchResults) {
      if (r.text) accumulatedPages.push(r);
    }
  }

  accumulatedPages.sort((a, b) => a.pageNum - b.pageNum);
  const combinedText = accumulatedPages.map(p => p.text).join('\n\n').trim();
  const totalQuestions = accumulatedPages.reduce((acc, p) => acc + p.qCount, 0);

  return {
    text: combinedText,
    page_count: totalPages,
    question_count: totalQuestions
  };
}

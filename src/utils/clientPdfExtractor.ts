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
      const startsQuestion = /^\s*(?:(?:Q(?:uestion)?\.?\s*(?:No\.?)?|Sl\.?\s*No\.?|Item|ప్రశ్న\.?)\s*[\.\:\-–—]?\s*\d+|\b\d{1,3}\s*(?:\.|\:|\/|[–—-]|-(?!\d))\s*|\bQ\d+\b)/i.test(str);
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
 * Scanned PDF Visual OCR Engine (Multi-Pass with Auto-Recovery):
 * Renders pages to HTML5 canvas and sends JPEG images to Gemini to extract questions.
 * 
 * Key design decisions:
 * - Sequential (1 page at a time) with 5s inter-page pacing = 12 RPM, safely under Gemini's 15 RPM free tier
 * - Empty/short Gemini responses are NOT accepted — they trigger a retry
 * - After Pass 1, any failed pages are automatically re-scanned in Pass 2 (and Pass 3 if needed)
 * - 30s+ cooldown on quota errors to let the rolling 60s window fully drain
 */
export async function extractScannedPdfWithVisionOcr(
  file: File,
  maxPages: number = 120,
  onProgress?: (msg: string, current: number, total: number) => void,
  specificPages?: number[]
): Promise<{ text: string; page_count: number; question_count: number; missing_pages: number[]; scanned_pages: { pageNum: number; text: string; qCount: number }[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  onProgress?.('Preparing document for AI Vision OCR...', 0, 1);
  const pdf = await loadPdfDocument(uint8);
  const totalPages = pdf.numPages;

  const targetPages: number[] = Array.isArray(specificPages) && specificPages.length > 0
    ? specificPages.filter(p => p >= 1 && p <= totalPages)
    : Array.from({ length: Math.min(totalPages, maxPages) }, (_, idx) => idx + 1);

  // ── Results map (pageNum → result). Using a Map so recovery passes can overwrite failed entries. ──
  const pageResults = new Map<number, { pageNum: number; text: string; qCount: number }>();
  const scanStartTime = Date.now();

  // ── PACING CONSTANTS ──
  const INTER_PAGE_DELAY_MS = 5000;      // 5s between pages = ~12 RPM (under 15 RPM ceiling)
  const QUOTA_COOLDOWN_BASE_SEC = 30;     // 30s minimum wait on 429 errors

  /** Formats elapsed time since scan start */
  function elapsed(): string {
    const sec = Math.round((Date.now() - scanStartTime) / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  /** Returns total questions found so far across all successfully scanned pages */
  function totalQs(): number {
    return Array.from(pageResults.values()).reduce((sum, p) => sum + p.qCount, 0);
  }

  /**
   * Attempts to scan a single page. Returns true if the page was transcribed
   * with meaningful content (>30 chars), false otherwise.
   */
  async function scanOnePage(
    pageNum: number, maxAttempts: number, passLabel: string, idx: number, total: number
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      onProgress?.(
        `${passLabel}: Page ${pageNum} (${idx}/${total}) • ${totalQs()} Qs • ${elapsed()}` +
        (attempt > 1 ? ` [retry ${attempt}/${maxAttempts}]` : ''),
        idx, total
      );

      try {
        const page = await pdf.getPage(pageNum);
        const imageBase64 = await renderPageToJpegBase64(page, 1.3);

        const res = await fetch('/api/pyq/ocr-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageBase64, pageNumber: pageNum, totalPages })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const pageText = (data.text || '').trim();

            // ── CRITICAL: Reject empty/very-short responses ──
            // Gemini sometimes returns success with empty text on rate-limited or complex pages.
            // Title/ad pages produce 50+ char descriptions, so 30 chars is a safe floor.
            if (pageText.length < 30) {
              console.warn(`[Vision OCR] Page ${pageNum}: only ${pageText.length} chars returned — retrying`);
              if (attempt < maxAttempts) {
                await new Promise(r => setTimeout(r, 8000));
                continue;
              }
              // On final attempt, accept whatever we got (might be a genuinely blank page)
            }

            pageResults.set(pageNum, {
              pageNum,
              text: `--- Page ${pageNum} ---\n` + (pageText || '[Page scanned - no content detected]'),
              qCount: data.questionCount || 0
            });
            return true;
          }
        }

        // ── Non-OK response: pause and retry ──
        const isQuota = res.status === 429;
        const waitSec = isQuota
          ? QUOTA_COOLDOWN_BASE_SEC + (attempt - 1) * 10   // 30s, 40s, 50s, 60s, 70s
          : 6 + attempt * 3;                                // 9s, 12s, 15s, 18s, 21s
        onProgress?.(
          `Page ${pageNum}: ${isQuota ? 'Gemini quota reached' : `Status ${res.status}`}. ` +
          `Cooling ${waitSec}s (retry ${attempt}/${maxAttempts})...`,
          idx, total
        );
        await new Promise(r => setTimeout(r, waitSec * 1000));
      } catch (err: any) {
        console.warn(`[Vision OCR] Page ${pageNum} error (attempt ${attempt}):`, err?.message);
        const waitSec = 6 + attempt * 3;
        onProgress?.(`Page ${pageNum}: Error — retrying in ${waitSec}s...`, idx, total);
        await new Promise(r => setTimeout(r, waitSec * 1000));
      }
    }
    return false;
  }

  // ════════════════════════════════════════════════════════════════
  // PASS 1 — Initial scan of all target pages
  // ════════════════════════════════════════════════════════════════
  let failedPages: number[] = [];

  for (let i = 0; i < targetPages.length; i++) {
    const pageNum = targetPages[i];
    const ok = await scanOnePage(pageNum, 5, 'Scanning', i + 1, targetPages.length);
    if (!ok) failedPages.push(pageNum);

    if (i < targetPages.length - 1) {
      await new Promise(r => setTimeout(r, INTER_PAGE_DELAY_MS));
    }
  }

  // ════════════════════════════════════════════════════════════════
  // PASS 2 — Auto-recovery of any failed pages
  // ════════════════════════════════════════════════════════════════
  if (failedPages.length > 0) {
    onProgress?.(`Recovery: Re-scanning ${failedPages.length} failed pages after 15s cooldown...`, 1, 1);
    await new Promise(r => setTimeout(r, 15000));

    const stillFailed: number[] = [];
    for (let i = 0; i < failedPages.length; i++) {
      const ok = await scanOnePage(failedPages[i], 4, 'Recovery', i + 1, failedPages.length);
      if (!ok) stillFailed.push(failedPages[i]);
      if (i < failedPages.length - 1) {
        await new Promise(r => setTimeout(r, 6000));
      }
    }
    failedPages = stillFailed;
  }

  // ════════════════════════════════════════════════════════════════
  // PASS 3 — Final attempt for any remaining failures
  // ════════════════════════════════════════════════════════════════
  if (failedPages.length > 0) {
    onProgress?.(`Final retry: ${failedPages.length} pages remaining after 20s cooldown...`, 1, 1);
    await new Promise(r => setTimeout(r, 20000));

    for (let i = 0; i < failedPages.length; i++) {
      await scanOnePage(failedPages[i], 3, 'Final retry', i + 1, failedPages.length);
      if (i < failedPages.length - 1) {
        await new Promise(r => setTimeout(r, 8000));
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Assemble final results
  // ════════════════════════════════════════════════════════════════
  const allPages = Array.from(pageResults.values()).sort((a, b) => a.pageNum - b.pageNum);
  const combinedText = allPages.map(p => p.text).join('\n\n').trim();
  const totalQuestions = allPages.reduce((acc, p) => acc + p.qCount, 0);
  const missingPages = targetPages.filter(p => !pageResults.has(p));

  onProgress?.(
    `Done! ${totalQuestions} questions from ${allPages.length}/${targetPages.length} pages in ${elapsed()}` +
    (missingPages.length > 0 ? ` (${missingPages.length} pages could not be scanned)` : ''),
    targetPages.length, targetPages.length
  );

  return {
    text: combinedText,
    page_count: totalPages,
    question_count: totalQuestions,
    missing_pages: missingPages,
    scanned_pages: allPages
  };
}


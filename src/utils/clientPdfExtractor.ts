/**
 * Client-Side PDF Text Extractor
 * Uses Mozilla PDF.js to extract text layers, font CMaps, and layout structure
 * directly inside the user's browser, producing clean readable question papers.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Initialize PDF.js worker with local bundled worker asset
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

/**
 * Checks whether the extracted text contains meaningful readable content
 * rather than unmapped glyph codes, control characters, or binary noise.
 */
function isCleanReadableText(text: string): boolean {
  if (!text || text.trim().length < 40) return false;

  // Check printable character ratio
  let printableCount = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Printable ASCII, Telugu / Devanagari unicode blocks, or common whitespace
    if (
      (code >= 32 && code <= 126) ||
      code === 10 || code === 13 || code === 9 ||
      (code >= 0x0900 && code <= 0x097F) || // Devanagari
      (code >= 0x0C00 && code <= 0x0C7F)    // Telugu
    ) {
      printableCount++;
    }
  }

  const printableRatio = printableCount / text.length;
  if (printableRatio < 0.85) return false;

  // Check for common question / exam keywords or basic words
  const hasExamWords = /\b(?:which|what|who|when|where|why|how|article|constitution|state|india|telangana|andhra|question|option|correct|following|answer|select|given|below|statements|pairs)\b/i.test(text);
  const hasQuestionNumbers = /(?:Q\s*\d+|\b\d+[\.\:\)]|\([A-D1-4]\))/i.test(text);

  return hasExamWords || hasQuestionNumbers;
}

/**
 * Extracts structured, readable text from a PDF file using Mozilla PDF.js.
 * Correctly reconstructs line breaks, question boundaries, and options.
 */
export async function extractPdfTextInBrowser(
  file: File,
  onProgress?: (msg: string) => void
): Promise<{ text: string; page_count: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  onProgress?.('Loading PDF document...');

  let pdf: any;
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: uint8,
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: false,
      stopAtErrors: false
    });
    pdf = await loadingTask.promise;
  } catch (workerErr: any) {
    console.warn('[PDF Extract] Standard worker init failed, attempting fake worker:', workerErr?.message);
    const loadingTaskFallback = pdfjsLib.getDocument({
      data: uint8,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
      stopAtErrors: false
    });
    pdf = await loadingTaskFallback.promise;
  }

  const totalPages = pdf.numPages;
  let fullText = '';

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(`Extracting page ${pageNum} of ${totalPages}...`);
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent({ normalizeWhitespace: true });

    const items = textContent.items as Array<{
      str: string;
      transform?: number[];
      width?: number;
      height?: number;
      hasEOL?: boolean;
    }>;

    if (!items || items.length === 0) continue;

    // Assemble lines by tracking vertical coordinate (Y)
    const pageLines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;

    for (const item of items) {
      if (!item.str && !item.hasEOL) continue;
      const str = item.str || '';
      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const y = transform[5]; // Y coordinate (decreases as you read down)

      // Start a new line if:
      // 1. PDF hasEOL flag is set
      // 2. Vertical position moved downwards by more than 4 points
      // 3. Current token looks like a question number (e.g. "1.", "Q1.", "Question 1:")
      // 4. Current token looks like an option (e.g. "(A)", "(1)", "Option A")
      const isVerticalJump = lastY !== null && Math.abs(y - lastY) > 4;
      const startsQuestion = /^\s*(?:Q(?:uestion)?\s*\d+[\.\:\)]|\b\d+[\.\:][ \t]|\bQ\d+\b)/i.test(str);
      const startsOption = /^\s*(?:\(?[A-Da-d]\)[\.\:\)]|\bOption\s*[A-D]\b|\(?[1-4]\)[\.\:\)]|\[[1-4]\])/i.test(str);

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

  // Validate that extracted content is readable and not garbage binary values
  if (!isCleanReadableText(cleaned)) {
    throw new Error('This PDF appears to be a scanned image without an OCR text layer (or contains non-standard custom font glyphs). Please copy and paste the question paper text directly into the text box below.');
  }

  return {
    text: cleaned,
    page_count: totalPages
  };
}

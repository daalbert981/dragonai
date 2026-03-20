'use client'

/**
 * Client-Side PDF Text Extraction
 *
 * Uses PDF.js from CDN to extract text from PDF files in the browser.
 * This avoids all webpack bundling issues by loading PDF.js dynamically from CDN.
 */

// PDF.js CDN version
const PDFJS_VERSION = '3.11.174';
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

export interface PDFExtractionResult {
  text: string;
  numPages: number;
  metadata?: any;
  error?: string;
}

/**
 * Load PDF.js library from CDN
 */
async function loadPDFJS(): Promise<any> {
  // Check if already loaded
  if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }

  // Load from CDN
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        // Configure worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
        resolve(pdfjsLib);
      } else {
        reject(new Error('PDF.js failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
    document.head.appendChild(script);
  });
}

/**
 * Extract text from a PDF file
 *
 * @param file - The PDF file to extract text from
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns Extracted text and metadata
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: number) => void
): Promise<PDFExtractionResult> {
  try {
    // Load PDF.js from CDN
    const pdfjsLib = await loadPDFJS();

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const numPages = pdf.numPages;
    let fullText = '';

    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      fullText += pageText + '\n\n';

      // Report progress
      if (onProgress) {
        const progress = Math.round((pageNum / numPages) * 100);
        onProgress(progress);
      }
    }

    // Get metadata
    const metadata = await pdf.getMetadata();

    return {
      text: fullText.trim(),
      numPages,
      metadata: metadata.info
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      text: '',
      numPages: 0,
      error: error instanceof Error ? error.message : 'Failed to extract PDF text'
    };
  }
}

/**
 * Check if a file is a PDF
 */
export function isPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Estimate token count for text (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

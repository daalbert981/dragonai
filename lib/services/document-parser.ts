import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

// pdf-parse doesn't have proper ES module support
const pdf = require('pdf-parse');

export interface ParsedDocument {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount?: number;
    processingTime: number;
    [key: string]: any;
  };
}

export interface ParserOptions {
  performOCR?: boolean;
  ocrLanguage?: string;
}

/**
 * Document Parser Service
 * Handles parsing of PDF, DOCX, and images with OCR support
 */
export class DocumentParser {
  /**
   * Parse a document based on its MIME type
   */
  async parseDocument(
    buffer: Buffer,
    mimeType: string,
    options: ParserOptions = {}
  ): Promise<ParsedDocument> {
    const startTime = Date.now();

    try {
      let result: ParsedDocument;

      if (mimeType === 'application/pdf') {
        result = await this.parsePDF(buffer);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        result = await this.parseDOCX(buffer);
      } else if (mimeType.startsWith('image/')) {
        result = await this.parseImage(buffer, options.ocrLanguage || 'eng');
      } else {
        throw new Error(`Unsupported document type: ${mimeType}`);
      }

      result.metadata.processingTime = Date.now() - startTime;
      result.metadata.wordCount = this.countWords(result.text);

      return result;
    } catch (error) {
      throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse PDF document
   */
  private async parsePDF(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const data = await pdf(buffer);

      return {
        text: data.text,
        metadata: {
          pageCount: data.numpages,
          pdfInfo: data.info,
          processingTime: 0, // Will be set by caller
        },
      };
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse DOCX document
   */
  private async parseDOCX(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer });

      return {
        text: result.value,
        metadata: {
          processingTime: 0, // Will be set by caller
          messages: result.messages,
        },
      };
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse image with OCR
   */
  private async parseImage(buffer: Buffer, language: string = 'eng'): Promise<ParsedDocument> {
    try {
      // Convert to JPEG if needed and optimize for OCR
      const processedBuffer = await sharp(buffer)
        .greyscale()
        .normalize()
        .sharpen()
        .jpeg()
        .toBuffer();

      // Perform OCR
      const { data } = await Tesseract.recognize(processedBuffer, language, {
        logger: () => {}, // Suppress logs
      });

      return {
        text: data.text,
        metadata: {
          confidence: data.confidence,
          language,
          processingTime: 0, // Will be set by caller
        },
      };
    } catch (error) {
      throw new Error(`Image OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Clean and normalize text
   */
  cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}

// Export singleton instance
export const documentParser = new DocumentParser();

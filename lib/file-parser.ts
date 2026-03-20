/**
 * File Parser Utilities
 *
 * Handles parsing of various file types including:
 * - PDFs (text extraction)
 * - Word documents (DOCX)
 * - Spreadsheets (XLSX, CSV)
 * - Images (metadata and preparation for vision AI)
 * - Code files (text extraction with language detection)
 */

import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import { encoding_for_model } from 'tiktoken';

/**
 * Parsed file result
 */
export interface ParsedFileResult {
  /**
   * Extracted text content
   */
  text: string | null;

  /**
   * Structured data (for spreadsheets, JSON, etc.)
   */
  data: any;

  /**
   * Metadata about the file
   */
  metadata: {
    /**
     * File type category
     */
    type: 'pdf' | 'document' | 'spreadsheet' | 'image' | 'code' | 'text';

    /**
     * Number of pages (for PDFs)
     */
    pages?: number;

    /**
     * Programming language (for code files)
     */
    language?: string;

    /**
     * Number of sheets (for spreadsheets)
     */
    sheets?: number;

    /**
     * Estimated token count
     */
    tokenCount?: number;

    /**
     * Any parsing warnings or errors
     */
    warnings?: string[];
  };
}

/**
 * Extract text from file buffer (server-side)
 * Used for syllabus synthesis and other server-side text extraction needs
 */
export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  // Handle DOCX files
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error(`Failed to extract text from Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Handle plain text files
  if (mimeType === 'text/plain' || mimeType.startsWith('text/')) {
    return buffer.toString('utf-8');
  }

  // Handle PDF files
  if (mimeType === 'application/pdf') {
    // PDF extraction currently disabled due to webpack compatibility issues
    // Users should convert PDFs to DOCX or TXT format
    throw new Error('PDF text extraction is currently unavailable. Please convert your PDF to DOCX or TXT format first. You can use Google Docs (File → Download → Microsoft Word) or online converters like pdf2docx.com');
  }

  throw new Error(`Unsupported file type for text extraction: ${mimeType}`);
}

/**
 * Parse a file based on its MIME type
 */
export async function parseFile(file: File): Promise<ParsedFileResult> {
  const mimeType = file.type;
  const filename = file.name;

  // PDF files
  if (mimeType === 'application/pdf') {
    return await parsePDF(file);
  }

  // Word documents
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return await parseDOCX(file);
  }

  // Spreadsheets
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'text/csv'
  ) {
    return await parseSpreadsheet(file);
  }

  // Images (prepare for vision AI)
  if (mimeType.startsWith('image/')) {
    return await parseImage(file);
  }

  // Code and text files
  if (mimeType.startsWith('text/') || isCodeFile(filename)) {
    return await parseTextFile(file);
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Parse PDF file
 *
 * Note: PDF parsing is currently disabled due to webpack compatibility issues.
 * PDFs will be uploaded but text extraction is not available.
 * Consider using external PDF processing service or Adobe PDF Services API.
 */
async function parsePDF(file: File): Promise<ParsedFileResult> {
  // Return metadata only - PDF text extraction temporarily disabled
  return {
    text: null,
    data: {
      requiresPDFProcessing: true,
      mimeType: file.type,
      size: file.size
    },
    metadata: {
      type: 'pdf',
      warnings: ['PDF text extraction is currently unavailable. The file has been uploaded and the LLM can still see the filename, but cannot read the content. Consider describing the PDF contents in your message.']
    }
  };
}

/**
 * Parse Word document (DOCX)
 */
async function parseDOCX(file: File): Promise<ParsedFileResult> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });

    const tokenCount = estimateTokenCount(result.value);

    return {
      text: result.value,
      data: null,
      metadata: {
        type: 'document',
        tokenCount,
        warnings: result.messages.length > 0
          ? result.messages.map(m => m.message)
          : undefined
      }
    };
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error(`Failed to parse Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse spreadsheet (XLSX, XLS, CSV)
 */
async function parseSpreadsheet(file: File): Promise<ParsedFileResult> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();

    if (file.type === 'text/csv') {
      await workbook.csv.read(require('stream').Readable.from(buffer));
    } else {
      await workbook.xlsx.load(buffer);
    }

    const sheets = workbook.worksheets.map(worksheet => {
      const rows: any[] = [];
      const csvRows: string[] = [];

      worksheet.eachRow((row, rowNumber) => {
        const values = row.values as any[];
        // ExcelJS row.values is 1-indexed (index 0 is undefined), so slice from 1
        const cellValues = values.slice(1).map(v => v ?? '');

        if (rowNumber === 1) {
          // Header row for JSON conversion
          rows.push(cellValues);
        } else {
          // Data rows
          const obj: Record<string, any> = {};
          cellValues.forEach((val, i) => {
            const header = (rows[0]?.[i] ?? `Column${i + 1}`).toString();
            obj[header] = val;
          });
          rows.push(obj);
        }

        csvRows.push(cellValues.map(v => String(v)).join(','));
      });

      return {
        name: worksheet.name,
        data: rows.slice(1), // Skip header row from JSON data
        csv: csvRows.join('\n')
      };
    });

    // Combine all sheets into text representation
    const text = sheets
      .map(sheet => `Sheet: ${sheet.name}\n${sheet.csv}`)
      .join('\n\n');

    const tokenCount = estimateTokenCount(text);

    return {
      text,
      data: { sheets },
      metadata: {
        type: 'spreadsheet',
        sheets: sheets.length,
        tokenCount
      }
    };
  } catch (error) {
    console.error('Spreadsheet parsing error:', error);
    throw new Error(`Failed to parse spreadsheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse image file (prepare metadata for vision AI)
 */
async function parseImage(file: File): Promise<ParsedFileResult> {
  // For images, we don't extract text here
  // Instead, we return metadata and let the vision AI handle it
  return {
    text: null,
    data: {
      requiresVisionAI: true,
      mimeType: file.type,
      size: file.size
    },
    metadata: {
      type: 'image',
      warnings: ['Image files require vision AI processing for content extraction']
    }
  };
}

/**
 * Parse text/code file
 */
async function parseTextFile(file: File): Promise<ParsedFileResult> {
  try {
    const text = await file.text();
    const language = detectLanguage(file.name);
    const tokenCount = estimateTokenCount(text);

    return {
      text,
      data: {
        language,
        lines: text.split('\n').length
      },
      metadata: {
        type: 'code',
        language,
        tokenCount
      }
    };
  } catch (error) {
    console.error('Text file parsing error:', error);
    throw new Error(`Failed to parse text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Detect programming language from filename
 */
export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'rb': 'ruby',
    'php': 'php',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'r': 'r',
    'sql': 'sql',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sh': 'bash',
    'bash': 'bash'
  };

  return languageMap[ext || ''] || 'text';
}

/**
 * Check if a file is a code file based on extension
 */
export function isCodeFile(filename: string): boolean {
  const codeExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
    'cs', 'rb', 'php', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'm',
    'sh', 'bash', 'sql', 'html', 'css', 'json', 'xml', 'yaml', 'yml'
  ];

  const ext = filename.split('.').pop()?.toLowerCase();
  return codeExtensions.includes(ext || '');
}

/**
 * Estimate token count for text
 * Uses tiktoken for accurate GPT model token counting
 */
export function estimateTokenCount(text: string, model: string = 'gpt-4o'): number {
  try {
    const encoding = encoding_for_model(model as any);
    const tokens = encoding.encode(text);
    const count = tokens.length;
    encoding.free(); // Important: free memory
    return count;
  } catch (error) {
    // Fallback to rough estimation if tiktoken fails
    // Approximate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(
  text: string,
  maxTokens: number,
  model: string = 'gpt-4o'
): string {
  try {
    const encoding = encoding_for_model(model as any);
    const tokens = encoding.encode(text);

    if (tokens.length <= maxTokens) {
      encoding.free();
      return text;
    }

    // Truncate tokens and decode
    const truncatedTokens = tokens.slice(0, maxTokens);
    const truncatedText = new TextDecoder().decode(encoding.decode(truncatedTokens));
    encoding.free();

    return truncatedText + '\n\n[Content truncated due to length...]';
  } catch (error) {
    // Fallback to character-based truncation
    const approxChars = maxTokens * 4;
    if (text.length <= approxChars) {
      return text;
    }
    return text.slice(0, approxChars) + '\n\n[Content truncated due to length...]';
  }
}

/**
 * Format parsed file content for LLM context
 */
export function formatFileForContext(
  filename: string,
  parsedResult: ParsedFileResult,
  maxTokens: number = 4000
): string {
  const { text, metadata } = parsedResult;

  // For images, return a placeholder
  if (metadata.type === 'image') {
    return `[Image file: ${filename}]\n(This image will be analyzed using vision AI)`;
  }

  // If no text extracted, return metadata only
  if (!text) {
    return `[File: ${filename}]\n(No text content could be extracted from this file)`;
  }

  // Truncate if needed
  const truncatedText = truncateToTokenLimit(text, maxTokens);

  // Format based on type
  let formatted = `[File: ${filename}`;

  if (metadata.type === 'pdf' && metadata.pages) {
    formatted += ` (${metadata.pages} pages)`;
  }

  if (metadata.type === 'code' && metadata.language) {
    formatted += ` - ${metadata.language}`;
  }

  formatted += `]\n\n`;

  // Add code fence for code files
  if (metadata.type === 'code' && metadata.language) {
    formatted += `\`\`\`${metadata.language}\n${truncatedText}\n\`\`\``;
  } else {
    formatted += truncatedText;
  }

  return formatted;
}

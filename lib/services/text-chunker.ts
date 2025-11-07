import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface TextChunk {
  content: string;
  metadata: {
    chunkIndex: number;
    startChar?: number;
    endChar?: number;
    [key: string]: any;
  };
}

export interface ChunkerOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
  keepSeparator?: boolean;
}

/**
 * Text Chunking Service
 * Intelligently splits text into chunks optimized for AI processing
 */
export class TextChunker {
  private readonly defaultOptions: Required<ChunkerOptions> = {
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '. ', '? ', '! ', ', ', ' ', ''],
    keepSeparator: true,
  };

  /**
   * Chunk text into smaller pieces with overlap
   */
  async chunkText(
    text: string,
    options: ChunkerOptions = {}
  ): Promise<TextChunk[]> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    try {
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: mergedOptions.chunkSize,
        chunkOverlap: mergedOptions.chunkOverlap,
        separators: mergedOptions.separators,
        keepSeparator: mergedOptions.keepSeparator,
      });

      const chunks = await splitter.createDocuments([text]);

      return chunks.map((chunk, index) => ({
        content: chunk.pageContent,
        metadata: {
          chunkIndex: index,
          ...chunk.metadata,
        },
      }));
    } catch (error) {
      throw new Error(`Text chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Chunk text with custom metadata
   */
  async chunkTextWithMetadata(
    text: string,
    documentMetadata: Record<string, any> = {},
    options: ChunkerOptions = {}
  ): Promise<TextChunk[]> {
    const chunks = await this.chunkText(text, options);

    return chunks.map((chunk) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        ...documentMetadata,
      },
    }));
  }

  /**
   * Get optimal chunk size based on text length
   */
  getOptimalChunkSize(textLength: number): number {
    if (textLength < 2000) {
      return 500; // Small documents
    } else if (textLength < 10000) {
      return 1000; // Medium documents
    } else {
      return 1500; // Large documents
    }
  }

  /**
   * Validate chunk quality
   */
  validateChunk(chunk: string): { valid: boolean; reason?: string } {
    if (!chunk || chunk.trim().length === 0) {
      return { valid: false, reason: 'Empty chunk' };
    }

    if (chunk.length < 50) {
      return { valid: false, reason: 'Chunk too short' };
    }

    // Check if chunk has meaningful content (not just punctuation)
    const meaningfulChars = chunk.replace(/[\s.,!?;:(){}[\]"'`~@#$%^&*+=<>\/\\|_-]/g, '');
    if (meaningfulChars.length < 20) {
      return { valid: false, reason: 'Insufficient content' };
    }

    return { valid: true };
  }

  /**
   * Filter out low-quality chunks
   */
  filterQualityChunks(chunks: TextChunk[]): TextChunk[] {
    return chunks.filter((chunk) => {
      const validation = this.validateChunk(chunk.content);
      return validation.valid;
    });
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate statistics for chunks
   */
  getChunkStatistics(chunks: TextChunk[]): {
    totalChunks: number;
    averageLength: number;
    minLength: number;
    maxLength: number;
    estimatedTokens: number;
  } {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        averageLength: 0,
        minLength: 0,
        maxLength: 0,
        estimatedTokens: 0,
      };
    }

    const lengths = chunks.map((c) => c.content.length);
    const totalLength = lengths.reduce((sum, len) => sum + len, 0);

    return {
      totalChunks: chunks.length,
      averageLength: Math.round(totalLength / chunks.length),
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths),
      estimatedTokens: this.estimateTokenCount(
        chunks.map((c) => c.content).join('')
      ),
    };
  }
}

// Export singleton instance
export const textChunker = new TextChunker();

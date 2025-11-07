import { documentParser, ParsedDocument } from './document-parser';
import { textChunker, TextChunk } from './text-chunker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ProcessingResult {
  documentId: string;
  success: boolean;
  chunksCreated: number;
  error?: string;
  metadata?: any;
}

/**
 * Document Processing Orchestrator
 * Coordinates document parsing, chunking, and database storage
 */
export class DocumentProcessor {
  /**
   * Process a document: parse, chunk, and store
   */
  async processDocument(
    documentId: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<ProcessingResult> {
    try {
      // Update status to PROCESSING
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'PROCESSING',
          processingStartedAt: new Date(),
        },
      });

      // Step 1: Parse document
      const parsedDoc = await documentParser.parseDocument(buffer, mimeType);

      // Step 2: Clean text
      const cleanedText = documentParser.cleanText(parsedDoc.text);

      // Step 3: Chunk text
      const chunkSize = textChunker.getOptimalChunkSize(cleanedText.length);
      const chunks = await textChunker.chunkText(cleanedText, {
        chunkSize,
        chunkOverlap: Math.floor(chunkSize * 0.2), // 20% overlap
      });

      // Step 4: Filter quality chunks
      const qualityChunks = textChunker.filterQualityChunks(chunks);

      // Step 5: Store chunks in database
      const chunkRecords = await Promise.all(
        qualityChunks.map((chunk, index) =>
          prisma.documentChunk.create({
            data: {
              documentId,
              content: chunk.content,
              chunkIndex: index,
              metadata: {
                ...chunk.metadata,
                ...parsedDoc.metadata,
              },
            },
          })
        )
      );

      // Step 6: Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'COMPLETED',
          processingCompletedAt: new Date(),
        },
      });

      return {
        documentId,
        success: true,
        chunksCreated: chunkRecords.length,
        metadata: {
          ...parsedDoc.metadata,
          chunkStatistics: textChunker.getChunkStatistics(qualityChunks),
        },
      };
    } catch (error) {
      // Update document status to FAILED
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
          errorMessage,
        },
      });

      return {
        documentId,
        success: false,
        chunksCreated: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Reprocess a failed document
   */
  async reprocessDocument(documentId: string): Promise<ProcessingResult> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Delete existing chunks
    await prisma.documentChunk.deleteMany({
      where: { documentId },
    });

    // Fetch document from blob storage
    const response = await fetch(document.blobUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    return this.processDocument(documentId, buffer, document.mimeType);
  }

  /**
   * Get document with chunks for AI context
   */
  async getDocumentContext(documentId: string): Promise<{
    document: any;
    chunks: any[];
    fullText: string;
  }> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' },
        },
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const fullText = document.chunks.map((c: any) => c.content).join('\n\n');

    return {
      document,
      chunks: document.chunks,
      fullText,
    };
  }

  /**
   * Get multiple documents context
   */
  async getMultipleDocumentsContext(documentIds: string[]): Promise<{
    documents: any[];
    fullText: string;
    totalChunks: number;
  }> {
    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        status: 'COMPLETED',
      },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' },
        },
      },
    });

    const fullText = documents
      .map((doc: any) => {
        const docText = doc.chunks.map((c: any) => c.content).join('\n\n');
        return `=== ${doc.originalName} ===\n\n${docText}`;
      })
      .join('\n\n---\n\n');

    const totalChunks = documents.reduce(
      (sum: number, doc: any) => sum + doc.chunks.length,
      0
    );

    return {
      documents,
      fullText,
      totalChunks,
    };
  }

  /**
   * Search chunks by content
   */
  async searchChunks(query: string, userId: string, limit: number = 10) {
    // Simple text search - can be enhanced with vector search later
    const chunks = await prisma.documentChunk.findMany({
      where: {
        content: {
          contains: query,
          mode: 'insensitive',
        },
        document: {
          userId,
          status: 'COMPLETED',
        },
      },
      include: {
        document: {
          select: {
            id: true,
            originalName: true,
            filename: true,
          },
        },
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return chunks;
  }
}

// Export singleton instance
export const documentProcessor = new DocumentProcessor();

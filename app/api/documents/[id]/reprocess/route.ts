import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { documentProcessor } from '@/lib/services/document-processor';

const prisma = new PrismaClient();

/**
 * POST /api/documents/[id]/reprocess - Reprocess a failed document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Get userId from session
    const userId = 'demo-user-id';

    // Verify ownership
    const document = await prisma.document.findFirst({
      where: {
        id: params.id,
        userId,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (document.status === 'PROCESSING') {
      return NextResponse.json(
        { error: 'Document is already being processed' },
        { status: 400 }
      );
    }

    // Reprocess asynchronously
    documentProcessor.reprocessDocument(params.id)
      .catch(error => {
        console.error('Reprocessing error:', error);
      });

    return NextResponse.json({
      success: true,
      message: 'Document reprocessing started',
      documentId: params.id,
    });
  } catch (error) {
    console.error('Error reprocessing document:', error);
    return NextResponse.json(
      { error: 'Failed to reprocess document' },
      { status: 500 }
    );
  }
}

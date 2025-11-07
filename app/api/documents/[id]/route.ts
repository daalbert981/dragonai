import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { documentProcessor } from '@/lib/services/document-processor';

const prisma = new PrismaClient();

/**
 * GET /api/documents/[id] - Get a single document with its chunks
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Get userId from session
    const userId = 'demo-user-id';

    const document = await prisma.document.findFirst({
      where: {
        id: params.id,
        userId,
      },
      include: {
        course: true,
        chunks: {
          orderBy: { chunkIndex: 'asc' },
          select: {
            id: true,
            content: true,
            chunkIndex: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id] - Delete a single document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Get userId from session
    const userId = 'demo-user-id';

    // Delete document (chunks will be cascade deleted)
    const document = await prisma.document.deleteMany({
      where: {
        id: params.id,
        userId, // Ensure user owns the document
      },
    });

    if (document.count === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/documents/[id] - Update document metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Get userId from session
    const userId = 'demo-user-id';

    const body = await request.json();
    const { courseId } = body;

    const document = await prisma.document.updateMany({
      where: {
        id: params.id,
        userId,
      },
      data: {
        courseId: courseId || null,
      },
    });

    if (document.count === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Document updated successfully',
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

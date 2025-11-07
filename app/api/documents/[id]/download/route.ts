import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/documents/[id]/download - Download original document
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
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Fetch from blob storage
    const response = await fetch(document.blobUrl);

    if (!response.ok) {
      throw new Error('Failed to fetch document from storage');
    }

    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.originalName}"`,
        'Content-Length': document.size.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 }
    );
  }
}

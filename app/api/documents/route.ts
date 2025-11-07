import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/documents - List all documents for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Get userId from session
    const userId = 'demo-user-id';

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    // Build query
    const where: any = { userId };
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;

    // Get documents with pagination
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { chunks: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json({
      documents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents - Delete multiple documents
 */
export async function DELETE(request: NextRequest) {
  try {
    // TODO: Get userId from session
    const userId = 'demo-user-id';

    const { documentIds } = await request.json();

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid document IDs' },
        { status: 400 }
      );
    }

    // Delete documents (chunks will be cascade deleted)
    const result = await prisma.document.deleteMany({
      where: {
        id: { in: documentIds },
        userId, // Ensure user owns the documents
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Error deleting documents:', error);
    return NextResponse.json(
      { error: 'Failed to delete documents' },
      { status: 500 }
    );
  }
}

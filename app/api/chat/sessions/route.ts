import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/chat/sessions - Get all chat sessions for the user
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Get userId from session
    const userId = 'demo-user-id';

    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Get first message for preview
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/sessions - Create a new chat session
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Get userId from session
    const userId = 'demo-user-id';

    const body = await request.json();
    const { title } = body;

    const session = await prisma.chatSession.create({
      data: {
        userId,
        title: title || 'New Chat',
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat/sessions - Delete multiple chat sessions
 */
export async function DELETE(request: NextRequest) {
  try {
    // TODO: Get userId from session
    const userId = 'demo-user-id';

    const { sessionIds } = await request.json();

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid session IDs' },
        { status: 400 }
      );
    }

    const result = await prisma.chatSession.deleteMany({
      where: {
        id: { in: sessionIds },
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Error deleting chat sessions:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat sessions' },
      { status: 500 }
    );
  }
}

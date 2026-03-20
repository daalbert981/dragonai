/**
 * Individual Chat Session API Route
 *
 * Allows students to delete their own sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/courses/[courseId]/sessions/[sessionId]
 *
 * Delete a chat session (only if it belongs to the current user)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { courseId: string; sessionId: string } }
) {
  try {
    // Get user from session
    const session = await getServerSession(authOptions);
    const userId = parseInt((session?.user as any)?.id);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify session exists and belongs to user
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: params.sessionId }
    });

    if (!chatSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (chatSession.userId !== userId || chatSession.courseId !== params.courseId) {
      return NextResponse.json(
        { error: 'Access denied - This session does not belong to you' },
        { status: 403 }
      );
    }

    // Delete session (cascade will delete all messages and file uploads)
    await prisma.chatSession.delete({
      where: { id: params.sessionId }
    });

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}

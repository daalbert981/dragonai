import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await requireRole('SUPERADMIN');

    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    // Prevent deleting yourself
    if (currentUserId === params.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const targetUserId = parseInt(params.userId);
    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user's chat data first (no cascade relation from User to ChatSession)
    const userSessions = await prisma.chatSession.findMany({
      where: { userId: targetUserId },
      select: { id: true },
    });
    if (userSessions.length > 0) {
      const sessionIds = userSessions.map(s => s.id);
      await prisma.fileUpload.deleteMany({ where: { userId: targetUserId } });
      await prisma.chatMessage.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.chatSession.deleteMany({ where: { userId: targetUserId } });
    }

    // Delete user (cascades to enrollments and instructor assignments)
    await prisma.user.delete({
      where: { id: targetUserId },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);

    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

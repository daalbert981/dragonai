import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteUserChatDataWithFiles } from '@/lib/file-cleanup';

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

    // Delete user's chat data AND their uploaded files in GCS
    // (previously only DB rows were deleted, orphaning the GCS objects)
    const cleanup = await deleteUserChatDataWithFiles(targetUserId);
    console.log(
      `[USER DELETE] userId ${targetUserId}: ${cleanup.sessions} sessions, ` +
      `${cleanup.files} GCS files deleted (${cleanup.filesFailed} failed)`
    );

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

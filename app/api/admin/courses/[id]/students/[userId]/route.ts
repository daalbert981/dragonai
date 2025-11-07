import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await requireRole('ADMIN');
    const instructorId = (session.user as any).id;

    // Verify instructor owns this course
    const course = await prisma.course.findFirst({
      where: {
        id: params.id,
        instructors: {
          some: {
            userId: instructorId,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Delete enrollment
    await prisma.courseEnrollment.delete({
      where: {
        courseId_userId: {
          courseId: params.id,
          userId: params.userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing student:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to remove student' },
      { status: 500 }
    );
  }
}

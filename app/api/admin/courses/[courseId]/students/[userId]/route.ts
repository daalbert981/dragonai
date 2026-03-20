import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; userId: string } }
) {
  try {
    // Require instructor role
    const session = await requireRole('INSTRUCTOR');
    const instructorId = parseInt((session.user as any).id);

    // Verify instructor has access to this course
    const course = await prisma.course.findFirst({
      where: {
        id: params.courseId,
        instructors: {
          some: {
            userId: instructorId,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the enrollment
    const studentId = parseInt(params.userId);

    await prisma.courseEnrollment.delete({
      where: {
        courseId_userId: {
          courseId: params.courseId,
          userId: studentId,
        },
      },
    });

    return NextResponse.json(
      { message: 'Student removed from course successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error removing student:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to remove student' },
      { status: 500 }
    );
  }
}

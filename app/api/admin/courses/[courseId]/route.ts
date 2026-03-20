import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    // Require instructor role
    const session = await requireRole('INSTRUCTOR');
    const instructorId = parseInt((session.user as any).id);

    // Get course details (only if instructor has access)
    const course = await prisma.course.findFirst({
      where: {
        id: params.courseId,
        instructors: {
          some: {
            userId: instructorId,
          },
        },
      },
      include: {
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
          orderBy: {
            enrolledAt: 'desc',
          },
        },
        instructors: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            materials: true,
            instructors: true,
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

    return NextResponse.json(course);
  } catch (error: any) {
    console.error('Error fetching course:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userIdInt = parseInt(userId);

    // Superadmins can delete any course; instructors can only delete their own
    if (userRole === 'SUPERADMIN') {
      const course = await prisma.course.findUnique({
        where: { id: params.courseId },
      });
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
    } else if (userRole === 'INSTRUCTOR') {
      const course = await prisma.course.findFirst({
        where: {
          id: params.courseId,
          instructors: { some: { userId: userIdInt } },
        },
      });
      if (!course) {
        return NextResponse.json(
          { error: 'Course not found or access denied' },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete course (cascades to enrollments, materials, instructors, sessions, messages)
    await prisma.course.delete({
      where: { id: params.courseId },
    });

    return NextResponse.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}

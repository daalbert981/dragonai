import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Require instructor role
    const session = await requireRole('ADMIN');
    const userId = (session.user as any).id;

    // Get all courses where user is an instructor
    const courses = await prisma.course.findMany({
      where: {
        instructors: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        _count: {
          select: {
            enrollments: true,
            materials: true,
          },
        },
        instructors: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(courses);
  } catch (error: any) {
    console.error('Error fetching courses:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

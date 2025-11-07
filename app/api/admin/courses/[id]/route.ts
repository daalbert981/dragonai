import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateCourseSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  syllabus: z.string().optional(),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  reasoningLevel: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole('ADMIN');
    const userId = (session.user as any).id;

    const course = await prisma.course.findFirst({
      where: {
        id: params.id,
        instructors: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
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
        enrollments: {
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
        materials: {
          orderBy: {
            uploadedAt: 'desc',
          },
        },
        _count: {
          select: {
            enrollments: true,
            materials: true,
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole('ADMIN');
    const userId = (session.user as any).id;

    // Verify instructor owns this course
    const existingCourse = await prisma.course.findFirst({
      where: {
        id: params.id,
        instructors: {
          some: {
            userId: userId,
          },
        },
      },
    });

    if (!existingCourse) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateCourseSchema.parse(body);

    const updatedCourse = await prisma.course.update({
      where: { id: params.id },
      data: validatedData,
      include: {
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
        _count: {
          select: {
            enrollments: true,
            materials: true,
          },
        },
      },
    });

    return NextResponse.json(updatedCourse);
  } catch (error: any) {
    console.error('Error updating course:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    );
  }
}

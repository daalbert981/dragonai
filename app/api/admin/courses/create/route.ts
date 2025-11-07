import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required'),
  code: z.string().min(1, 'Course code is required'),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Require instructor role
    const session = await requireRole('ADMIN');
    const userId = (session.user as any).id;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createCourseSchema.parse(body);

    // Check if course code already exists
    const existingCourse = await prisma.course.findUnique({
      where: { code: validatedData.code },
    });

    if (existingCourse) {
      return NextResponse.json(
        { error: 'Course code already exists' },
        { status: 400 }
      );
    }

    // Create course and assign instructor
    const course = await prisma.course.create({
      data: {
        name: validatedData.name,
        code: validatedData.code,
        description: validatedData.description,
        instructors: {
          create: {
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
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error: any) {
    console.error('Error creating course:', error);

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
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}

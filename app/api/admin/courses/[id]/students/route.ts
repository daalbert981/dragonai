import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const addStudentSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole('ADMIN');
    const userId = (session.user as any).id;

    // Verify instructor owns this course
    const course = await prisma.course.findFirst({
      where: {
        id: params.id,
        instructors: {
          some: {
            userId: userId,
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

    const body = await request.json();
    const { email } = addStudentSchema.parse(body);

    // Find student by email
    const student = await prisma.user.findUnique({
      where: { email },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found with this email' },
        { status: 404 }
      );
    }

    // Check if student is already enrolled
    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_userId: {
          courseId: params.id,
          userId: student.id,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Student is already enrolled in this course' },
        { status: 400 }
      );
    }

    // Enroll student
    const enrollment = await prisma.courseEnrollment.create({
      data: {
        courseId: params.id,
        userId: student.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (error: any) {
    console.error('Error adding student:', error);

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
      { error: 'Failed to add student' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';

const enrollStudentSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  createNew: z.boolean().optional(),
}).refine(
  (data) => {
    // If createNew is true, require username and password
    if (data.createNew) {
      return data.username && data.password && data.email;
    }
    // Otherwise, just require email
    return data.email;
  },
  {
    message: 'When creating a new student, username, email, and password are required',
  }
);

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = enrollStudentSchema.parse(body);

    let studentUser;

    // If creating new student
    if (validatedData.createNew) {
      // Check if username already exists
      const existingUsername = await prisma.user.findUnique({
        where: { username: validatedData.username },
      });

      if (existingUsername) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }

      // Check if email already exists
      const existingEmail = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already exists. Use the existing student option instead.' },
          { status: 400 }
        );
      }

      // Hash password and create new student
      const hashedPassword = await bcrypt.hash(validatedData.password!, 10);

      studentUser = await prisma.user.create({
        data: {
          username: validatedData.username!,
          email: validatedData.email!,
          password: hashedPassword,
          classId: 'student',
        },
      });
    } else {
      // Find existing student by email
      studentUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (!studentUser) {
        return NextResponse.json(
          { error: 'Student not found. Would you like to create a new student account?' },
          { status: 404 }
        );
      }

      // Verify user is a student
      if (studentUser.classId !== 'student') {
        return NextResponse.json(
          { error: 'This user is not a student' },
          { status: 400 }
        );
      }
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_userId: {
          courseId: params.courseId,
          userId: studentUser.id,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Student is already enrolled in this course' },
        { status: 400 }
      );
    }

    // Enroll the student
    const enrollment = await prisma.courseEnrollment.create({
      data: {
        courseId: params.courseId,
        userId: studentUser.id,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: validatedData.createNew
          ? 'New student created and enrolled successfully'
          : 'Student enrolled successfully',
        enrollment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error enrolling student:', error);

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
      { error: 'Failed to enroll student' },
      { status: 500 }
    );
  }
}

// GET all students enrolled in course (for autocomplete/selection)
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
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
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ enrollments: course.enrollments });
  } catch (error: any) {
    console.error('Error fetching enrollments:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}

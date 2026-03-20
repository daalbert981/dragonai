import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['STUDENT', 'INSTRUCTOR', 'SUPERADMIN'], {
    errorMap: () => ({ message: 'Role must be STUDENT, INSTRUCTOR, or SUPERADMIN' })
  }),
});

// Map role to classId for database storage
function roleToClassId(role: string): string {
  switch (role) {
    case 'SUPERADMIN':
      return 'superadmin';
    case 'INSTRUCTOR':
      return 'instructor';
    case 'STUDENT':
      return 'student';
    default:
      return 'student';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require superadmin role
    await requireRole('SUPERADMIN');

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

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
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user with appropriate classId
    const user = await prisma.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        classId: roleToClassId(validatedData.role),
      },
      select: {
        id: true,
        username: true,
        email: true,
        classId: true,
      },
    });

    // Return user data without password
    return NextResponse.json({
      ...user,
      role: validatedData.role,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);

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
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// Get all users (already exists in the page, but adding API endpoint for consistency)
export async function GET(request: NextRequest) {
  try {
    // Require superadmin role
    await requireRole('SUPERADMIN');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        classId: true,
        _count: {
          select: {
            enrollments: true,
            instructorCourses: true,
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    // Map classId to role for display
    const usersWithRoles = users.map(user => ({
      ...user,
      role: user.classId === 'admin' || user.classId === 'superadmin' ? 'SUPERADMIN' :
            user.classId === 'instructor' ? 'INSTRUCTOR' : 'STUDENT',
    }));

    return NextResponse.json(usersWithRoles);
  } catch (error: any) {
    console.error('Error fetching users:', error);

    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

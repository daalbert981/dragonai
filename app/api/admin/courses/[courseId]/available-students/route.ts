/**
 * Available Students API Route
 *
 * Returns list of students not yet enrolled in the course
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/courses/[courseId]/available-students
 *
 * Get list of students who are not enrolled in this course
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    // Verify authentication and instructor role
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || !userRole || (userRole !== 'INSTRUCTOR' && userRole !== 'SUPERADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized - Instructor access required' },
        { status: 403 }
      );
    }

    const { courseId } = params;

    // Get all students (users with STUDENT-like classId)
    const allStudents = await prisma.user.findMany({
      where: {
        classId: {
          notIn: ['admin', 'superadmin', 'instructor']
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        classId: true,
      },
      orderBy: {
        username: 'asc'
      }
    });

    // Get already enrolled student IDs
    const enrolledStudents = await prisma.courseEnrollment.findMany({
      where: {
        courseId
      },
      select: {
        userId: true
      }
    });

    const enrolledIds = new Set(enrolledStudents.map(e => e.userId));

    // Filter out enrolled students
    const availableStudents = allStudents.filter(
      student => !enrolledIds.has(student.id)
    );

    return NextResponse.json({
      success: true,
      students: availableStudents
    });
  } catch (error) {
    console.error('Error fetching available students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available students' },
      { status: 500 }
    );
  }
}

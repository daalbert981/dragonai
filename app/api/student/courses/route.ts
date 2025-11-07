import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/student/courses - Fetch enrolled courses for the current student
export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with actual session/auth when implemented
    // For now, we'll use a query parameter for testing
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 401 }
      )
    }

    // Fetch enrolled courses with enrollment date
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: studentId,
      },
      include: {
        course: true,
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    })

    // Transform the data to include enrollment date with course
    const courses = enrollments.map((enrollment) => ({
      ...enrollment.course,
      enrolledAt: enrollment.enrolledAt,
    }))

    return NextResponse.json({ courses })
  } catch (error) {
    console.error('Error fetching student courses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}

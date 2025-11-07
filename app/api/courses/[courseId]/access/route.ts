/**
 * Course Access Validation API Route
 *
 * Validates user access to a specific course.
 * Used as a security check before allowing chat or file operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateCourseAccess, getCourseEnrollment } from '@/lib/security'
import { ApiResponse } from '@/types'

/**
 * GET /api/courses/[courseId]/access
 *
 * Check if the current user has access to the specified course.
 *
 * @returns Course enrollment details if access is granted
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params

    // TODO: Get user ID from session
    // For now, we'll use a header - update this with your NextAuth.js implementation
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Unauthorized - Please log in'
        },
        { status: 401 }
      )
    }

    // Validate course access
    const hasAccess = await validateCourseAccess(userId, courseId)

    if (!hasAccess) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Access denied - You are not enrolled in this course'
        },
        { status: 403 }
      )
    }

    // Get enrollment details
    const enrollment = await getCourseEnrollment(userId, courseId)

    if (!enrollment) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Enrollment not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        courseId: enrollment.courseId,
        role: enrollment.role,
        enrolledAt: enrollment.enrolledAt,
        course: {
          id: enrollment.course.id,
          title: enrollment.course.title,
          description: enrollment.course.description,
          code: enrollment.course.code
        }
      },
      message: 'Access granted'
    })
  } catch (error) {
    console.error('Error validating course access:', error)

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

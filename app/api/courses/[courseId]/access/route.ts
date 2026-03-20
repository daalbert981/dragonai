/**
 * Course Access Validation API Route
 *
 * Validates user access to a specific course.
 * Used as a security check before allowing chat or file operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { validateCourseAccess } from '@/lib/security'
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

    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined

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

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { courseId },
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

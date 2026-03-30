import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enrollWithTokenSchema } from '@/types'
import { constantTimeEqual } from '@/lib/security'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = parseInt((session.user as any).id)

    // Rate limit by user ID
    const rateLimit = await checkRateLimit({
      ...RATE_LIMITS.TOKEN_ENROLL,
      identifier: userId.toString(),
      endpoint: 'enroll-with-token',
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many enrollment attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = enrollWithTokenSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { registrationToken } = parsed.data

    // Verify user is a student
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { classId: true },
    })

    if (!user || (user.classId !== 'student' && user.classId !== 'STUDENT')) {
      return NextResponse.json(
        { error: 'Only students can enroll using a token.' },
        { status: 403 }
      )
    }

    // Look up course by registration token
    const course = await prisma.course.findUnique({
      where: { registrationToken },
      select: {
        id: true,
        name: true,
        code: true,
        registrationToken: true,
        registrationTokenExpiry: true,
        isActive: true,
      },
    })

    if (
      !course ||
      !course.registrationToken ||
      !course.isActive ||
      (course.registrationTokenExpiry && course.registrationTokenExpiry < new Date())
    ) {
      return NextResponse.json(
        { error: 'Invalid or expired registration token.' },
        { status: 400 }
      )
    }

    // Constant-time comparison
    if (!constantTimeEqual(registrationToken, course.registrationToken)) {
      return NextResponse.json(
        { error: 'Invalid or expired registration token.' },
        { status: 400 }
      )
    }

    // Check if already enrolled (idempotent)
    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_userId: {
          courseId: course.id,
          userId,
        },
      },
    })

    if (existingEnrollment) {
      return NextResponse.json({
        success: true,
        message: 'You are already enrolled in this course.',
        course: { id: course.id, name: course.name, code: course.code },
      })
    }

    // Create enrollment
    await prisma.courseEnrollment.create({
      data: {
        courseId: course.id,
        userId,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Successfully enrolled in ${course.name}.`,
      course: { id: course.id, name: course.name, code: course.code },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Invalid session') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[ENROLL-WITH-TOKEN] Error:', error)
    return NextResponse.json(
      { error: 'Enrollment failed. Please try again.' },
      { status: 500 }
    )
  }
}

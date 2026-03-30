import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { tokenRegistrationSchema } from '@/types'
import { sanitizeInput, constantTimeEqual, getClientIp } from '@/lib/security'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import * as bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const clientIp = getClientIp(request)
    const rateLimit = await checkRateLimit({
      ...RATE_LIMITS.REGISTRATION,
      identifier: clientIp,
      endpoint: 'register',
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetIn.toString(),
          },
        }
      )
    }

    const body = await request.json()
    const parsed = tokenRegistrationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { username, password, registrationToken } = parsed.data
    const sanitizedUsername = sanitizeInput(username)

    // Look up course by registration token
    const course = await prisma.course.findUnique({
      where: { registrationToken },
      select: {
        id: true,
        name: true,
        registrationToken: true,
        registrationTokenExpiry: true,
        isActive: true,
      },
    })

    // Generic error for invalid/expired/missing token (prevents enumeration)
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

    // Constant-time comparison as defense-in-depth
    if (!constantTimeEqual(registrationToken, course.registrationToken)) {
      return NextResponse.json(
        { error: 'Invalid or expired registration token.' },
        { status: 400 }
      )
    }

    // Check if username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username: sanitizedUsername },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken.' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user and enrollment in a transaction
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: sanitizedUsername,
          password: hashedPassword,
          classId: 'student',
        },
      })

      await tx.courseEnrollment.create({
        data: {
          courseId: course.id,
          userId: user.id,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please sign in.',
    })
  } catch (error) {
    console.error('[REGISTER] Error:', error)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}

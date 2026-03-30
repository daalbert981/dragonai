import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSecureToken } from '@/lib/security'

async function verifyInstructorAccess(courseId: string, instructorId: number) {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      instructors: {
        some: { userId: instructorId },
      },
    },
    select: {
      id: true,
      registrationToken: true,
      registrationTokenExpiry: true,
    },
  })
  return course
}

// GET — retrieve current registration token info
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await requireRole('INSTRUCTOR')
    const instructorId = parseInt((session.user as any).id)

    const course = await verifyInstructorAccess(params.courseId, instructorId)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const isExpired = course.registrationTokenExpiry
      ? course.registrationTokenExpiry < new Date()
      : false

    return NextResponse.json({
      hasToken: !!course.registrationToken,
      token: course.registrationToken || null,
      expiresAt: course.registrationTokenExpiry?.toISOString() || null,
      isExpired,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[REGISTRATION-TOKEN GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch token' }, { status: 500 })
  }
}

// POST — generate or regenerate registration token
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await requireRole('INSTRUCTOR')
    const instructorId = parseInt((session.user as any).id)

    const course = await verifyInstructorAccess(params.courseId, instructorId)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const body = await request.json()
    const expiryHours = Number(body.expiryHours)

    if (!expiryHours || expiryHours < 1 || expiryHours > 720) {
      return NextResponse.json(
        { error: 'Expiry must be between 1 and 720 hours (30 days).' },
        { status: 400 }
      )
    }

    const token = generateSecureToken(32)
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000)

    await prisma.course.update({
      where: { id: params.courseId },
      data: {
        registrationToken: token,
        registrationTokenExpiry: expiresAt,
      },
    })

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[REGISTRATION-TOKEN POST] Error:', error)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}

// DELETE — revoke registration token
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await requireRole('INSTRUCTOR')
    const instructorId = parseInt((session.user as any).id)

    const course = await verifyInstructorAccess(params.courseId, instructorId)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    await prisma.course.update({
      where: { id: params.courseId },
      data: {
        registrationToken: null,
        registrationTokenExpiry: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[REGISTRATION-TOKEN DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to revoke token' }, { status: 500 })
  }
}

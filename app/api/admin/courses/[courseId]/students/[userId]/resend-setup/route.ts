/**
 * Resend Setup Email API Route
 *
 * Regenerates a pending student's setup token (fresh 7-day expiry) and
 * emails them the link. Instructor-only; only works for accounts that
 * have not completed setup (no password yet).
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimiter } from '@/lib/rate-limit'
import { isEmailConfigured, sendSetupEmail } from '@/lib/email'

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string; userId: string } }
) {
  try {
    const session = await requireRole('INSTRUCTOR')
    const instructorId = parseInt((session.user as any).id)
    const { courseId } = params
    const targetUserId = parseInt(params.userId)

    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Email sending is not configured. Use the CSV download instead.' },
        { status: 400 }
      )
    }

    const instructorAccess = await prisma.courseInstructor.findFirst({
      where: { courseId, userId: instructorId },
    })
    if (!instructorAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const rateLimit = await rateLimiter(String(instructorId), 'resend_setup', {
      maxRequests: 30,
      windowSeconds: 60 * 60,
    })
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many resend requests' }, { status: 429 })
    }

    // Student must be enrolled in this course and not yet set up
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId, userId: targetUserId } },
      include: {
        user: { select: { id: true, email: true, password: true } },
        course: { select: { name: true } },
      },
    })

    if (!enrollment || !enrollment.user.email) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (enrollment.user.password) {
      return NextResponse.json(
        { error: 'This student has already set up their account' },
        { status: 400 }
      )
    }

    const setupToken = crypto.randomBytes(32).toString('hex')
    const setupTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: targetUserId },
      data: { setupToken, setupTokenExpiry },
    })

    const baseUrl =
      req.headers.get('x-forwarded-proto') && req.headers.get('host')
        ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('host')}`
        : new URL(req.url).origin

    const result = await sendSetupEmail({
      to: enrollment.user.email,
      setupUrl: `${baseUrl}/setup/${setupToken}`,
      courseName: enrollment.course.name,
    })

    if (!result.sent) {
      return NextResponse.json(
        { error: `Email failed to send: ${result.error}` },
        { status: 502 }
      )
    }

    console.log(`[RESEND-SETUP] Sent setup email for userId ${targetUserId}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[RESEND-SETUP] Error:', error)
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to resend setup email' }, { status: 500 })
  }
}

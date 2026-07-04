/**
 * Message Feedback API Route
 *
 * Students rate assistant answers 👍/👎. Feedback rows are identity-free
 * (no userId) — ownership is verified at write time via the message's
 * session, then only the rating is stored.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { validateCourseAccess } from '@/lib/security'
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/courses/[courseId]/messages/[messageId]/feedback
 *
 * @body rating - 1 (helpful) or -1 (not helpful), or 0 to remove
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string; messageId: string } }
) {
  try {
    const { courseId, messageId } = params

    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userIdInt = parseInt(userId)
    if (isNaN(userIdInt)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const hasAccess = await validateCourseAccess(userId, courseId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const rateLimit = await rateLimiter(userId, 'feedback', RATE_LIMITS.API_GENERAL)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const rating = body?.rating

    if (rating !== 1 && rating !== -1 && rating !== 0) {
      return NextResponse.json(
        { error: 'rating must be 1, -1, or 0' },
        { status: 400 }
      )
    }

    // The message must be an assistant answer in one of the requester's
    // own sessions in this course
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: {
        role: true,
        session: { select: { userId: true, courseId: true } },
      },
    })

    if (
      !message ||
      message.session.userId !== userIdInt ||
      message.session.courseId !== courseId
    ) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.role !== 'ASSISTANT') {
      return NextResponse.json(
        { error: 'Only assistant messages can be rated' },
        { status: 400 }
      )
    }

    if (rating === 0) {
      await prisma.messageFeedback.deleteMany({ where: { messageId } })
      return NextResponse.json({ success: true, rating: null })
    }

    const feedback = await prisma.messageFeedback.upsert({
      where: { messageId },
      create: { messageId, rating },
      update: { rating },
    })

    return NextResponse.json({ success: true, rating: feedback.rating })
  } catch (error) {
    console.error('Error saving message feedback:', error)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }
}

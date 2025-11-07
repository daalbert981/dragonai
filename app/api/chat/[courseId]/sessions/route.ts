import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema for creating a new chat session
const createSessionSchema = z.object({
  title: z.string().optional().default('New Chat'),
  userId: z.string().cuid(),
})

// Schema for session query params
const sessionQuerySchema = z.object({
  userId: z.string().cuid().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
})

/**
 * GET /api/chat/[courseId]/sessions
 * Get all chat sessions for a course
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params
    const { searchParams } = new URL(request.url)

    // Parse and validate query params
    const queryParams = sessionQuerySchema.safeParse({
      userId: searchParams.get('userId'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    })

    if (!queryParams.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryParams.error.format() },
        { status: 400 }
      )
    }

    const { userId, limit, offset } = queryParams.data

    // Build query filters
    const where: any = { courseId }
    if (userId) {
      where.userId = userId
    }

    // Fetch sessions with message count
    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.chatSession.count({ where }),
    ])

    return NextResponse.json({
      sessions: sessions.map(session => ({
        id: session.id,
        title: session.title,
        courseId: session.courseId,
        user: session.user,
        messageCount: session._count.messages,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Failed to fetch sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat/[courseId]/sessions
 * Create a new chat session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params
    const body = await request.json()

    // Validate request body
    const result = createSessionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.format() },
        { status: 400 }
      )
    }

    const { title, userId } = result.data

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create new session
    const session = await prisma.chatSession.create({
      data: {
        title,
        courseId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        session: {
          id: session.id,
          title: session.title,
          courseId: session.courseId,
          user: session.user,
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create session:', error)
    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chat/[courseId]/sessions?sessionId=xxx
 * Delete a chat session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Verify session exists and belongs to the course
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        courseId: params.courseId,
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Delete session (cascade will delete messages)
    await prisma.chatSession.delete({
      where: { id: sessionId },
    })

    return NextResponse.json(
      { success: true, message: 'Session deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to delete session:', error)
    return NextResponse.json(
      { error: 'Failed to delete chat session' },
      { status: 500 }
    )
  }
}

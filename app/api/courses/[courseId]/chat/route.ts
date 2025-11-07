/**
 * Chat Messages API Route
 *
 * Handles chat message creation with:
 * - Security validation
 * - Rate limiting
 * - Session management
 * - File attachment linking
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateCourseAccess } from '@/lib/security'
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeInput } from '@/lib/security'
import { ApiResponse, ChatMessageRequest, ChatMessageResponse } from '@/types'

/**
 * POST /api/courses/[courseId]/chat
 *
 * Create a new chat message and optionally start a new session.
 *
 * @body content - Message content
 * @body sessionId - Optional existing session ID
 * @body fileIds - Optional array of uploaded file IDs
 * @returns Created message and session ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params

    // TODO: Get user ID from session
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

    // Rate limiting
    const rateLimit = await rateLimiter(userId, 'chat_message', RATE_LIMITS.CHAT_MESSAGE)

    if (!rateLimit.allowed) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Too many messages. Please try again in ${rateLimit.resetIn} seconds.`
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetIn.toString()
          }
        }
      )
    }

    // Parse request body
    const body: ChatMessageRequest = await request.json()
    const { content, sessionId, fileIds = [] } = body

    if (!content?.trim() && fileIds.length === 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Message content or files required'
        },
        { status: 400 }
      )
    }

    // Sanitize input
    const sanitizedContent = sanitizeInput(content || '')

    // Get or create session
    let chatSession

    if (sessionId) {
      // Verify session exists and belongs to user
      chatSession = await prisma.chatSession.findUnique({
        where: { id: sessionId }
      })

      if (!chatSession || chatSession.userId !== userId || chatSession.courseId !== courseId) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Invalid session'
          },
          { status: 400 }
        )
      }
    } else {
      // Create new session
      chatSession = await prisma.chatSession.create({
        data: {
          userId,
          courseId,
          title: sanitizedContent.substring(0, 50) + (sanitizedContent.length > 50 ? '...' : '')
        }
      })
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        sessionId: chatSession.id,
        userId,
        role: 'USER',
        content: sanitizedContent,
        isStreaming: false
      },
      include: {
        fileUploads: true
      }
    })

    // Link file uploads to message if provided
    if (fileIds.length > 0) {
      await prisma.fileUpload.updateMany({
        where: {
          id: { in: fileIds },
          userId // Security: ensure files belong to user
        },
        data: {
          messageId: message.id
        }
      })

      // Fetch updated message with files
      const updatedMessage = await prisma.message.findUnique({
        where: { id: message.id },
        include: {
          fileUploads: true
        }
      })

      if (updatedMessage) {
        return NextResponse.json<ApiResponse<ChatMessageResponse>>(
          {
            success: true,
            data: {
              message: {
                id: updatedMessage.id,
                sessionId: updatedMessage.sessionId,
                userId: updatedMessage.userId,
                role: updatedMessage.role as 'USER' | 'ASSISTANT' | 'SYSTEM',
                content: updatedMessage.content,
                isStreaming: updatedMessage.isStreaming,
                error: updatedMessage.error,
                tokenCount: updatedMessage.tokenCount,
                createdAt: updatedMessage.createdAt,
                updatedAt: updatedMessage.updatedAt,
                fileUploads: updatedMessage.fileUploads.map(f => ({
                  id: f.id,
                  messageId: f.messageId,
                  userId: f.userId,
                  filename: f.filename,
                  originalName: f.originalName,
                  mimeType: f.mimeType,
                  size: f.size,
                  url: f.url,
                  status: f.status as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
                  uploadedAt: f.uploadedAt
                }))
              },
              sessionId: chatSession.id
            },
            message: 'Message created successfully'
          },
          { status: 201 }
        )
      }
    }

    return NextResponse.json<ApiResponse<ChatMessageResponse>>(
      {
        success: true,
        data: {
          message: {
            id: message.id,
            sessionId: message.sessionId,
            userId: message.userId,
            role: message.role as 'USER' | 'ASSISTANT' | 'SYSTEM',
            content: message.content,
            isStreaming: message.isStreaming,
            error: message.error,
            tokenCount: message.tokenCount,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            fileUploads: []
          },
          sessionId: chatSession.id
        },
        message: 'Message created successfully'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating message:', error)

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create message'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/courses/[courseId]/chat
 *
 * Get chat messages for a session.
 *
 * @query sessionId - Chat session ID
 * @query limit - Optional message limit (default: 50)
 * @returns Array of messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const limit = parseInt(searchParams.get('limit') || '50')

    // TODO: Get user ID from session
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      )
    }

    if (!sessionId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Session ID required'
        },
        { status: 400 }
      )
    }

    // Verify session access
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    })

    if (!session || session.userId !== userId || session.courseId !== courseId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Session not found or access denied'
        },
        { status: 404 }
      )
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: { sessionId },
      include: {
        fileUploads: true
      },
      orderBy: { createdAt: 'asc' },
      take: limit
    })

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        messages: messages.map(m => ({
          id: m.id,
          sessionId: m.sessionId,
          userId: m.userId,
          role: m.role,
          content: m.content,
          isStreaming: m.isStreaming,
          error: m.error,
          tokenCount: m.tokenCount,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          fileUploads: m.fileUploads
        }))
      }
    })
  } catch (error) {
    console.error('Error fetching messages:', error)

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Failed to fetch messages'
      },
      { status: 500 }
    )
  }
}

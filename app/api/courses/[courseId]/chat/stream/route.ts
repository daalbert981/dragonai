/**
 * Chat Streaming API Route
 *
 * Handles real-time streaming of AI responses using Server-Sent Events (SSE).
 * Auth + orchestration only — context assembly lives in lib/chat/context-builder,
 * tool handling in lib/chat/tools, stream processing in lib/chat/stream-handler.
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { validateCourseAccess } from '@/lib/security'
import { rateLimiter, RATE_LIMITS } from '@/lib/rate-limit'
import { createChatStream, handleStreamError } from '@/lib/openai-stream'
import { buildChatContext, buildStreamOptions } from '@/lib/chat/context-builder'
import { buildTools } from '@/lib/chat/tools'
import { createSseResponse } from '@/lib/chat/stream-handler'

/**
 * GET /api/courses/[courseId]/chat/stream
 *
 * Stream AI assistant responses in real-time.
 *
 * @query sessionId - Chat session ID
 * @returns Server-Sent Events stream
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    // Get user from session
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      )
    }

    // Convert userId to Int for database
    const userIdInt = parseInt(userId)
    if (isNaN(userIdInt)) {
      return new Response(
        JSON.stringify({ error: 'Invalid user ID' }),
        { status: 400 }
      )
    }

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID required' }),
        { status: 400 }
      )
    }

    // Validate course access
    const hasAccess = await validateCourseAccess(userId, courseId)

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403 }
      )
    }

    // Rate limiting — own bucket (each message = one POST + one stream GET,
    // so sharing the chat_message bucket would halve the effective limit)
    const rateLimit = await rateLimiter(userId, 'chat_stream', RATE_LIMITS.CHAT_MESSAGE)

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: `Too many messages. Please try again in ${rateLimit.resetIn} seconds.` }),
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

    // Verify session ownership
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    })

    if (!chatSession || chatSession.userId !== userIdInt || chatSession.courseId !== courseId) {
      return new Response(
        JSON.stringify({ error: 'Session not found or access denied' }),
        { status: 404 }
      )
    }

    // Assemble course context, history, and system prompt
    const context = await buildChatContext(courseId, sessionId)

    if (!context) {
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { status: 404 }
      )
    }

    const tools = buildTools(context.readableMaterials)
    const streamOptions = buildStreamOptions(context, tools)

    const openaiStream = await createChatStream(context.formattedMessages, streamOptions)

    return createSseResponse(openaiStream, {
      sessionId,
      userIdInt,
      courseId,
      formattedMessages: context.formattedMessages,
      streamOptions,
      readableMaterials: context.readableMaterials,
      isGPT5Model: context.isGPT5Model,
      tools,
    })
  } catch (error) {
    console.error('Error in chat stream:', error)
    return handleStreamError(error)
  }
}

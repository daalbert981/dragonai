/**
 * Chat Streaming API Route
 *
 * Handles real-time streaming of AI responses using Server-Sent Events (SSE).
 * Integrates with OpenAI API for intelligent responses.
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateCourseAccess } from '@/lib/security'
import {
  createChatStream,
  createStreamingResponse,
  handleStreamError,
  formatMessagesForOpenAI,
  estimateTokenCount
} from '@/lib/openai-stream'

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

    // TODO: Get user ID from session
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
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

    // Verify session ownership
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        course: true
      }
    })

    if (!session || session.userId !== userId || session.courseId !== courseId) {
      return new Response(
        JSON.stringify({ error: 'Session not found or access denied' }),
        { status: 404 }
      )
    }

    // Get conversation history (last 10 messages for context)
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        fileUploads: true
      }
    })

    // Reverse to chronological order
    messages.reverse()

    // Format messages for OpenAI
    const formattedMessages = formatMessagesForOpenAI(
      messages.map(m => ({
        role: m.role.toLowerCase(),
        content: m.content
      }))
    )

    // Create system prompt with course context
    const systemPrompt = `You are an AI teaching assistant for the course "${session.course.title}" (${session.course.code}).

Your role is to:
- Help students understand course material
- Answer questions clearly and pedagogically
- Encourage critical thinking
- Provide examples when helpful
- Admit when you're unsure rather than guessing
- Be supportive and encouraging

Course Description: ${session.course.description || 'No description available'}

Provide helpful, accurate, and educational responses to student questions.`

    // Create OpenAI stream
    const openaiStream = await createChatStream(formattedMessages, {
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt
    })

    // Track the response for database storage
    let fullResponse = ''
    let tokenCount = 0

    // Wrap the stream to capture content
    const captureStream = async function* () {
      for await (const chunk of openaiStream) {
        const delta = chunk.choices[0]?.delta?.content || ''
        if (delta) {
          fullResponse += delta
        }
        yield chunk
      }

      // After streaming is complete, save the assistant message
      tokenCount = estimateTokenCount(fullResponse)

      await prisma.message.create({
        data: {
          sessionId,
          userId: 'assistant', // Special user ID for assistant
          role: 'ASSISTANT',
          content: fullResponse,
          isStreaming: false,
          tokenCount
        }
      })

      // Update session timestamp
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() }
      })
    }

    // Return streaming response
    return createStreamingResponse(captureStream())
  } catch (error) {
    console.error('Error in chat stream:', error)
    return handleStreamError(error)
  }
}

/**
 * Runtime configuration for streaming
 */
export const runtime = 'edge' // Use edge runtime for better streaming performance

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createChatStream, estimateTokenCount, ChatMessage } from '@/lib/openai-stream'
import { z } from 'zod'

// Schema for chat request
const chatRequestSchema = z.object({
  sessionId: z.string().cuid(),
  userId: z.string().cuid(),
  message: z.string().min(1).max(10000),
  documentIds: z.array(z.string().cuid()).optional().default([]),
  model: z.string().optional().default('gpt-4-turbo-preview'),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().int().positive().optional().default(2000),
})

/**
 * POST /api/chat/[courseId]/send
 * Send a message and get streaming AI response
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params
    const body = await request.json()

    // Validate request body
    const result = chatRequestSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.format() },
        { status: 400 }
      )
    }

    const {
      sessionId,
      userId,
      message,
      documentIds,
      model,
      temperature,
      maxTokens,
    } = result.data

    // Verify session exists and belongs to the course
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        courseId,
        userId,
      },
      include: {
        course: true,
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      )
    }

    // Get conversation history (last 10 messages for context)
    const previousMessages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        role: true,
        content: true,
      },
    })

    // Reverse to get chronological order
    const conversationHistory: ChatMessage[] = previousMessages
      .reverse()
      .map(msg => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: msg.content,
      }))

    // Add new user message
    conversationHistory.push({
      role: 'user',
      content: message,
    })

    // Get document context if documentIds provided
    let contextDocuments: string[] = []
    if (documentIds.length > 0) {
      const documents = await prisma.document.findMany({
        where: {
          id: { in: documentIds },
          courseId,
          status: 'COMPLETED',
        },
        select: {
          name: true,
          extractedText: true,
        },
      })

      contextDocuments = documents
        .filter(doc => doc.extractedText)
        .map(doc => `Document: ${doc.name}\n\n${doc.extractedText}`)
    }

    // Save user message to database
    const userMessage = await prisma.message.create({
      data: {
        content: message,
        role: 'USER',
        sessionId,
        userId,
        tokenCount: estimateTokenCount(message),
        documentIds,
      },
    })

    // Update session timestamp
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    })

    // Create streaming response
    const streamResponse = await createChatStream({
      messages: conversationHistory,
      model,
      temperature,
      maxTokens,
      contextDocuments,
    })

    // Save the assistant's response after streaming completes
    // We'll use a custom header to pass the message ID for client-side saving
    const responseHeaders = new Headers(streamResponse.headers)
    responseHeaders.set('X-User-Message-Id', userMessage.id)
    responseHeaders.set('X-Session-Id', sessionId)
    responseHeaders.set('X-User-Id', userId)

    // Return streaming response with custom headers
    return new Response(streamResponse.body, {
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/chat/[courseId]/send?sessionId=xxx
 * Get messages for a chat session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

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

    // Fetch messages
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { sessionId },
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
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.message.count({ where: { sessionId } }),
    ])

    return NextResponse.json({
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        user: msg.user,
        tokenCount: msg.tokenCount,
        documentIds: msg.documentIds,
        createdAt: msg.createdAt.toISOString(),
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/chat/[courseId]/send
 * Save assistant's response after streaming completes
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const body = await request.json()
    const { sessionId, userId, content } = body

    if (!sessionId || !userId || !content) {
      return NextResponse.json(
        { error: 'sessionId, userId, and content are required' },
        { status: 400 }
      )
    }

    // Verify session exists
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

    // Save assistant message
    const message = await prisma.message.create({
      data: {
        content,
        role: 'ASSISTANT',
        sessionId,
        userId,
        tokenCount: estimateTokenCount(content),
      },
    })

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        role: message.role,
        tokenCount: message.tokenCount,
        createdAt: message.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to save assistant message:', error)
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    )
  }
}

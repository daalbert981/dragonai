/**
 * Chat Streaming API Route
 *
 * Handles real-time streaming of AI responses using Server-Sent Events (SSE).
 * Integrates with OpenAI API for intelligent responses.
 * Updated: Fixed authentication and field issues
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { validateCourseAccess } from '@/lib/security'
import {
  createChatStream,
  handleStreamError,
  formatMessagesForOpenAI,
  estimateTokenCount,
  streamToSSE
} from '@/lib/openai-stream'
import { formatInTimeZone } from 'date-fns-tz'
import { truncateToTokenLimit } from '@/lib/file-parser'

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

    // Fetch course details and materials for system prompt
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        materials: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    })

    if (!course) {
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { status: 404 }
      )
    }

    // Fetch active class notes (activeAt <= now, expiresAt null or > now)
    const now = new Date()
    let activeNotes: { type: string; title: string; content: string }[] = []
    try {
      activeNotes = await prisma.classNote.findMany({
        where: {
          courseId,
          activeAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: [{ sortOrder: 'asc' }],
        select: { type: true, title: true, content: true },
      })
    } catch {
      // Table may not exist yet — fall through to legacy fields
    }

    // Get conversation history (limit configured per course)
    const messageLimit = course.messageHistoryLimit || 10
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: messageLimit,
      include: {
        fileUploads: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            extractedText: true,
            parsedData: true,
            tokenCount: true,
            url: true,
            status: true
          }
        }
      }
    })

    // Reverse to chronological order
    messages.reverse()

    // Build file context from uploaded files
    let fileContext = '';
    messages.forEach((msg, idx) => {
      if (msg.fileUploads && msg.fileUploads.length > 0) {
        msg.fileUploads.forEach(file => {
          if (file.extractedText) {
            // Include extracted text from documents
            fileContext += `\n\n[File: ${file.originalName}]\n${file.extractedText}\n`;
          } else if (file.mimeType?.startsWith('image/')) {
            // Note for images (will be handled by vision API separately)
            fileContext += `\n\n[Image file: ${file.originalName} - URL: ${file.url}]\n`;
          } else if (file.status === 'FAILED') {
            fileContext += `\n\n[File: ${file.originalName} - Processing failed]\n`;
          } else if (file.status === 'PROCESSING') {
            fileContext += `\n\n[File: ${file.originalName} - Currently processing...]\n`;
          }
        });
      }
    });

    // Format messages for OpenAI
    const formattedMessages = formatMessagesForOpenAI(
      messages.map(m => {
        let content = m.content;

        // Add file context to user messages if files are attached
        if (m.role === 'USER' && m.fileUploads && m.fileUploads.length > 0) {
          const fileInfo = m.fileUploads
            .map(f => `[Attached: ${f.originalName}]`)
            .join(' ');
          content = `${content}\n\n${fileInfo}`;
        }

        return {
          role: m.role.toLowerCase(),
          content
        };
      })
    )

    // Get current date/time in course timezone
    const courseTimezone = course.timezone || 'America/New_York'
    const currentDateTime = formatInTimeZone(
      new Date(),
      courseTimezone,
      'EEEE, MMMM do, yyyy \'at\' h:mm a zzz'
    )

    // Build list of materials with extractable content for the tool
    const readableMaterials = course.materials.filter(m => m.extractedText)
    const allMaterials = course.materials

    // Build course materials section for system prompt
    let materialsSection = ''
    if (allMaterials.length > 0) {
      materialsSection = '\n\nCourse Materials Available:\n'
      allMaterials.forEach((material, index) => {
        materialsSection += `${index + 1}. ${material.originalName}`
        if (material.description) {
          materialsSection += ` - ${material.description}`
        }
        materialsSection += `\n   URL: ${material.storageUrl}`
        if (material.extractedText) {
          materialsSection += ` [full text available via read_material tool]`
        }
        materialsSection += '\n'
      })
      materialsSection += '\nYou can reference these materials when answering questions. The URLs are accessible to students.'
      if (readableMaterials.length > 0) {
        materialsSection += `\n\nIMPORTANT: You have a "read_material" tool available to read the full text content of materials marked as [full text available]. Use this tool ONLY when you need specific details (exact wording, specific policies, precise numbers, etc.) that are not covered by the syllabus summary above. Do NOT use the tool for general questions that the syllabus summary already answers. Do not announce or mention that you are reading a file — just use the information naturally in your response.`
      }
    }

    // Build syllabus section if available
    let syllabusSection = ''
    if (course.syllabus) {
      syllabusSection = `\n\nCourse Syllabus:\n${course.syllabus}`
    }

    // Build prior classes section: structured notes + legacy field
    const priorNotes = activeNotes
      .filter((n) => n.type === 'PRIOR')
      .map((n) => `[${n.title}]\n${n.content}`)
      .join('\n\n')
    const priorLegacy = course.priorClasses || ''
    const priorCombined = [priorNotes, priorLegacy].filter(Boolean).join('\n\n')
    let priorClassesSection = ''
    if (priorCombined) {
      priorClassesSection = `\n\n<prior_classes>\n${priorCombined}\n</prior_classes>`
    }

    // Build upcoming classes section: structured notes + legacy field
    const upcomingNotes = activeNotes
      .filter((n) => n.type === 'UPCOMING')
      .map((n) => `[${n.title}]\n${n.content}`)
      .join('\n\n')
    const upcomingLegacy = course.upcomingClasses || ''
    const upcomingCombined = [upcomingNotes, upcomingLegacy].filter(Boolean).join('\n\n')
    let upcomingClassesSection = ''
    if (upcomingCombined) {
      upcomingClassesSection = `\n\n<upcoming_classes>\n${upcomingCombined}\n</upcoming_classes>`
    }

    // Create system prompt with course context
    let baseSystemPrompt = course.systemPrompt ? course.systemPrompt : `You are an AI teaching assistant for the course "${course.name}" (${course.code}).

Your role is to:
- Help students understand course material
- Answer questions clearly and pedagogically
- Encourage critical thinking
- Provide examples when helpful
- Admit when you're unsure rather than guessing
- Be supportive and encouraging
- Reference course materials when relevant

IMPORTANT: When providing links to course materials or external resources, ALWAYS format them as markdown links using the syntax [link text](URL). For example: [View the lecture notes](https://example.com/notes.pdf)

Course Description: ${course.description || 'No description available'}

Provide helpful, accurate, and educational responses to student questions. Remember to use markdown formatting for links.`

    // Always append materials section (for both custom and default prompts)
    if (materialsSection) {
      baseSystemPrompt += materialsSection
    }

    // Always append syllabus and file context (for both custom and default prompts)
    if (syllabusSection) {
      baseSystemPrompt += syllabusSection
    }

    // Always append prior classes information if available
    if (priorClassesSection) {
      baseSystemPrompt += priorClassesSection
    }

    // Always append upcoming classes information if available
    if (upcomingClassesSection) {
      baseSystemPrompt += upcomingClassesSection
    }

    // Always append file context if present (for both custom and default prompts)
    if (fileContext) {
      baseSystemPrompt += `\n\nStudent-uploaded files in this conversation:\n${fileContext}\n\nPlease reference these uploaded files when answering questions.`
    }

    // Always prepend current date/time to the system prompt
    const systemPrompt = `IMPORTANT: You have access to the current date and time. When a student asks for the current date or time, provide this information:

Current Date/Time: ${currentDateTime}

${baseSystemPrompt}`


    // Determine model type for parameter handling
    const isOSeriesModel = /^o[1-9]/.test(course.model)
    const isGPT5Model = course.model.startsWith('gpt-5')

    // Build tool definitions if readable materials exist
    const tools = readableMaterials.length > 0 ? [{
      type: 'function' as const,
      function: {
        name: 'read_material',
        description: 'Read the full text content of a course material. Only use this when you need specific details not covered by the syllabus summary.',
        parameters: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: `The original filename of the material to read. Available files: ${readableMaterials.map(m => m.originalName).join(', ')}`
            }
          },
          required: ['filename']
        }
      }
    }] : undefined

    // Create OpenAI stream with course-specific settings
    const streamOptions: any = {
      model: course.model || 'gpt-5.4-mini',
      maxTokens: 2000,
      systemPrompt
    }

    // Different models use different parameters
    if (isOSeriesModel || isGPT5Model) {
      streamOptions.reasoningEffort = course.reasoningLevel || 'medium'
    } else {
      streamOptions.temperature = course.temperature || 0.7
    }

    // Add tools for all model types
    if (tools) {
      streamOptions.tools = tools
      // Also pass via openAIParams for chat completions API models
      if (!isGPT5Model) {
        streamOptions.openAIParams = { tools }
      }
    }

    const openaiStream = await createChatStream(formattedMessages, streamOptions)

    // Custom SSE response that handles tool calls
    const encoder = new TextEncoder()

    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          await processStream(openaiStream, controller, encoder, {
            sessionId,
            userIdInt,
            courseId,
            formattedMessages,
            streamOptions,
            readableMaterials,
            isGPT5Model,
            tools,
          })
          controller.close()
        } catch (error) {
          console.error('Error in SSE stream:', error)
          const errorData = `data: ${JSON.stringify({
            delta: '',
            done: true,
            error: error instanceof Error ? error.message : 'Stream error occurred'
          })}\n\n`
          controller.enqueue(encoder.encode(errorData))
          controller.close()
        }
      }
    })

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('Error in chat stream:', error)
    return handleStreamError(error)
  }
}

/**
 * Process the OpenAI stream, handling tool calls transparently
 */
async function processStream(
  stream: AsyncIterable<any>,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  ctx: {
    sessionId: string
    userIdInt: number
    courseId: string
    formattedMessages: any[]
    streamOptions: any
    readableMaterials: any[]
    isGPT5Model: boolean
    tools: any[] | undefined
  }
) {
  let fullResponse = ''
  let toolCallAccumulator: { id: string; name: string; arguments: string } | null = null

  for await (const event of stream) {
    // --- Chat Completions API tool call handling ---
    if (event.choices?.[0]?.delta?.tool_calls) {
      const tc = event.choices[0].delta.tool_calls[0]
      if (tc.id) {
        toolCallAccumulator = { id: tc.id, name: tc.function?.name || '', arguments: '' }
      }
      if (tc.function?.arguments) {
        toolCallAccumulator!.arguments += tc.function.arguments
      }

      if (event.choices[0].finish_reason === 'tool_calls') {
        const result = await executeToolCall(toolCallAccumulator!, ctx, controller, encoder)

        const messagesWithToolResult = [
          { role: 'system', content: ctx.streamOptions.systemPrompt },
          ...ctx.formattedMessages,
          {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: toolCallAccumulator!.id,
              type: 'function',
              function: {
                name: toolCallAccumulator!.name,
                arguments: toolCallAccumulator!.arguments,
              }
            }]
          },
          {
            role: 'tool',
            tool_call_id: toolCallAccumulator!.id,
            content: result,
          }
        ]

        const followUpOptions = { ...ctx.streamOptions }
        delete followUpOptions.systemPrompt
        followUpOptions.openAIParams = {}
        followUpOptions.tools = undefined

        const followUpStream = await createChatStream(
          messagesWithToolResult as any,
          { ...followUpOptions, systemPrompt: undefined }
        )

        await processStream(followUpStream, controller, encoder, {
          ...ctx,
          tools: undefined,
        })
        return
      }
      continue
    }

    // --- Responses API (GPT-5) tool call handling ---
    if (event.type === 'response.output_item.added' && event.item?.type === 'function_call') {
      toolCallAccumulator = {
        id: event.item.call_id || event.item.id || 'call_' + Date.now(),
        name: event.item.name || '',
        arguments: ''
      }
      continue
    }

    if (event.type === 'response.function_call_arguments.delta') {
      if (toolCallAccumulator) {
        toolCallAccumulator.arguments += event.delta || ''
      }
      continue
    }

    if (event.type === 'response.function_call_arguments.done') {
      if (toolCallAccumulator) {
        // Execute the tool call
        const result = await executeToolCall(toolCallAccumulator, ctx, controller, encoder)

        // For Responses API, we use a non-streaming follow-up with tool output
        // then stream a second call for the final answer
        const followUpOptions = { ...ctx.streamOptions }
        followUpOptions.tools = undefined

        // Build conversation with tool result appended to instructions
        const toolResultPrompt = `${ctx.streamOptions.systemPrompt}\n\n--- Tool Result ---\nThe read_material tool was called for "${toolCallAccumulator.name === 'read_material' ? JSON.parse(toolCallAccumulator.arguments).filename : 'unknown'}". Here is the content:\n\n${result}\n\n--- End Tool Result ---\nNow answer the student's question using this material. Do not mention that you used a tool.`

        const followUpStream = await createChatStream(
          ctx.formattedMessages,
          { ...followUpOptions, systemPrompt: toolResultPrompt }
        )

        await processStream(followUpStream, controller, encoder, {
          ...ctx,
          tools: undefined,
        })
        return
      }
      continue
    }

    // --- Normal content handling ---
    let delta = ''
    let isFinished = false

    if (event.choices) {
      delta = event.choices[0]?.delta?.content || ''
      isFinished = !!event.choices[0]?.finish_reason
    } else if (event.type === 'response.output_text.delta') {
      delta = event.delta || ''
    } else if (event.type === 'response.done' || event.type === 'response.completed') {
      // Only mark finished if we have content (not if it was just a tool call response)
      if (fullResponse) isFinished = true
    }

    if (delta) {
      fullResponse += delta
      const sseData = `data: ${JSON.stringify({ delta, done: false })}\n\n`
      controller.enqueue(encoder.encode(sseData))
    }

    if (isFinished && fullResponse) {
      const tokenCount = estimateTokenCount(fullResponse)

      try {
        await prisma.chatMessage.create({
          data: {
            sessionId: ctx.sessionId,
            userId: ctx.userIdInt,
            role: 'ASSISTANT',
            content: fullResponse,
            tokenCount
          }
        })

        await prisma.chatSession.update({
          where: { id: ctx.sessionId },
          data: { updatedAt: new Date() }
        })
      } catch (error) {
        console.error('Error saving ASSISTANT message:', error)
      }

      const doneData = `data: ${JSON.stringify({ delta: '', done: true, finishReason: 'stop' })}\n\n`
      controller.enqueue(encoder.encode(doneData))
      return
    }
  }

  // If stream ended without explicit finish (edge case)
  if (fullResponse) {
    const tokenCount = estimateTokenCount(fullResponse)
    try {
      await prisma.chatMessage.create({
        data: {
          sessionId: ctx.sessionId,
          userId: ctx.userIdInt,
          role: 'ASSISTANT',
          content: fullResponse,
          tokenCount
        }
      })
      await prisma.chatSession.update({
        where: { id: ctx.sessionId },
        data: { updatedAt: new Date() }
      })
    } catch (error) {
      console.error('Error saving ASSISTANT message:', error)
    }
    const doneData = `data: ${JSON.stringify({ delta: '', done: true, finishReason: 'stop' })}\n\n`
    controller.enqueue(encoder.encode(doneData))
  }
}

/**
 * Execute a read_material tool call
 */
async function executeToolCall(
  toolCall: { id: string; name: string; arguments: string },
  ctx: { readableMaterials: any[]; courseId: string },
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
): Promise<string> {
  if (toolCall.name !== 'read_material') {
    return JSON.stringify({ error: `Unknown tool: ${toolCall.name}` })
  }

  let args: { filename: string }
  try {
    args = JSON.parse(toolCall.arguments)
  } catch {
    return JSON.stringify({ error: 'Invalid tool arguments' })
  }

  // Find matching material
  const material = ctx.readableMaterials.find(
    m => m.originalName === args.filename || m.filename === args.filename
  )

  if (!material || !material.extractedText) {
    return JSON.stringify({ error: `Material not found or has no extractable text: ${args.filename}` })
  }

  // Send tool call indicator to client
  const toolEvent = `data: ${JSON.stringify({
    delta: '',
    done: false,
    toolCall: { name: 'read_material', filename: material.originalName }
  })}\n\n`
  controller.enqueue(encoder.encode(toolEvent))

  // Truncate to reasonable size (max ~30k tokens)
  const text = truncateToTokenLimit(material.extractedText, 30000)

  return text
}

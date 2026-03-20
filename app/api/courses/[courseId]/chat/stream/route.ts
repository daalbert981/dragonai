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
  createStreamingResponse,
  handleStreamError,
  formatMessagesForOpenAI,
  estimateTokenCount
} from '@/lib/openai-stream'
import { formatInTimeZone } from 'date-fns-tz'

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

    // Build course materials section for system prompt
    let materialsSection = ''
    if (course.materials && course.materials.length > 0) {
      materialsSection = '\n\nCourse Materials Available:\n'
      course.materials.forEach((material, index) => {
        materialsSection += `${index + 1}. ${material.originalName}`
        if (material.description) {
          materialsSection += ` - ${material.description}`
        }
        materialsSection += `\n   URL: ${material.storageUrl}\n`
      })
      materialsSection += '\nYou can reference these materials when answering questions. The URLs are accessible to students.'
    }

    // Build syllabus section if available
    let syllabusSection = ''
    if (course.syllabus) {
      syllabusSection = `\n\nCourse Syllabus:\n${course.syllabus}`
    }

    // Build prior classes section if available
    let priorClassesSection = ''
    if (course.priorClasses) {
      priorClassesSection = `\n\n<prior_classes>\n${course.priorClasses}\n</prior_classes>`
    }

    // Build upcoming classes section if available
    let upcomingClassesSection = ''
    if (course.upcomingClasses) {
      upcomingClassesSection = `\n\n<upcoming_classes>\n${course.upcomingClasses}\n</upcoming_classes>`
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

Course Description: ${course.description || 'No description available'}${materialsSection}

Provide helpful, accurate, and educational responses to student questions. Remember to use markdown formatting for links.`

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

    // Create OpenAI stream with course-specific settings
    const streamOptions: any = {
      model: course.model || 'gpt-5.4-mini',
      maxTokens: 2000,
      systemPrompt
    }

    // Different models use different parameters
    if (isOSeriesModel || isGPT5Model) {
      // o-series (o1, o3, o4-mini) and GPT-5+ models use reasoningEffort
      streamOptions.reasoningEffort = course.reasoningLevel || 'medium'
    } else {
      // All other models use temperature
      streamOptions.temperature = course.temperature || 0.7
    }

    const openaiStream = await createChatStream(formattedMessages, streamOptions)

    // Track the response for database storage
    let fullResponse = ''
    let tokenCount = 0

    // Wrap the stream to capture content
    const captureStream = async function* () {
      for await (const event of openaiStream as AsyncIterable<any>) {
        // Handle both chat completions and Responses API formats
        let delta = ''
        let isFinished = false

        if (event.choices) {
          // Chat completions API format
          delta = event.choices[0]?.delta?.content || ''
          isFinished = !!event.choices[0]?.finish_reason
        } else if (event.type === 'response.output_text.delta') {
          // Responses API format - text delta event
          delta = event.delta || ''
        } else if (event.type === 'response.done' || event.type === 'response.completed') {
          // Responses API - completion event
          isFinished = true
        }

        if (delta) {
          fullResponse += delta
        }

        // Save the message BEFORE yielding the final chunk
        // (because streamToSSE breaks after receiving an event with finish_reason)
        if (isFinished && fullResponse) {
          tokenCount = estimateTokenCount(fullResponse)

          try {
            await prisma.chatMessage.create({
              data: {
                sessionId,
                userId: userIdInt,
                role: 'ASSISTANT',
                content: fullResponse,
                tokenCount
              }
            })

            // Update session timestamp
            await prisma.chatSession.update({
              where: { id: sessionId },
              data: { updatedAt: new Date() }
            })
          } catch (error) {
            console.error('Error saving ASSISTANT message:', error)
          }
        }

        yield event
      }
    }

    // Return streaming response
    return createStreamingResponse(captureStream())
  } catch (error) {
    console.error('Error in chat stream:', error)
    return handleStreamError(error)
  }
}

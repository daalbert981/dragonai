/**
 * Chat Context Builder
 *
 * Assembles everything the chat stream needs for a request: course data,
 * conversation history, the system prompt (materials, syllabus, class
 * notes, uploaded-file context), and model options.
 *
 * Extracted verbatim from app/api/courses/[courseId]/chat/stream/route.ts
 * (v1.8.0); the only behavior change is the token budget applied to
 * inlined student-file content (was unbounded).
 */

import { prisma } from '@/lib/prisma'
import { formatMessagesForOpenAI } from '@/lib/openai-stream'
import { budgetFileContext } from '@/lib/token-budget'
import { formatInTimeZone } from 'date-fns-tz'

export interface ChatContext {
  course: NonNullable<Awaited<ReturnType<typeof fetchCourseWithMaterials>>>
  formattedMessages: any[]
  systemPrompt: string
  readableMaterials: any[]
  isOSeriesModel: boolean
  isGPT5Model: boolean
}

async function fetchCourseWithMaterials(courseId: string) {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: {
      materials: {
        orderBy: { uploadedAt: 'desc' },
      },
    },
  })
}

/**
 * Build the full chat context for a session, or null if the course
 * does not exist.
 */
export async function buildChatContext(
  courseId: string,
  sessionId: string
): Promise<ChatContext | null> {
  const course = await fetchCourseWithMaterials(courseId)

  if (!course) {
    return null
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
          status: true,
        },
      },
    },
  })

  // Reverse to chronological order
  messages.reverse()

  // Build file context from uploaded files (token-budgeted)
  const uploadedFiles = messages.flatMap((msg) => msg.fileUploads ?? [])
  const fileContext = budgetFileContext(uploadedFiles)

  // Format messages for OpenAI
  const formattedMessages = formatMessagesForOpenAI(
    messages.map((m) => {
      let content = m.content

      // Add file context to user messages if files are attached
      if (m.role === 'USER' && m.fileUploads && m.fileUploads.length > 0) {
        const fileInfo = m.fileUploads
          .map((f) => `[Attached: ${f.originalName}]`)
          .join(' ')
        content = `${content}\n\n${fileInfo}`
      }

      return {
        role: m.role.toLowerCase(),
        content,
      }
    })
  )

  // Get current date/time in course timezone
  const courseTimezone = course.timezone || 'America/New_York'
  const currentDateTime = formatInTimeZone(
    new Date(),
    courseTimezone,
    "EEEE, MMMM do, yyyy 'at' h:mm a zzz"
  )

  // Build list of materials with extractable content for the tool
  const readableMaterials = course.materials.filter((m) => m.extractedText)
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
    materialsSection +=
      '\nYou can reference these materials when answering questions. The URLs are accessible to students.'
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
  let baseSystemPrompt = course.systemPrompt
    ? course.systemPrompt
    : `You are an AI teaching assistant for the course "${course.name}" (${course.code}).

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

  return {
    course,
    formattedMessages,
    systemPrompt,
    readableMaterials,
    isOSeriesModel,
    isGPT5Model,
  }
}

/**
 * Build the OpenAI stream options for a course + prepared context.
 */
export function buildStreamOptions(ctx: ChatContext, tools: any[] | undefined) {
  const { course, systemPrompt, isOSeriesModel, isGPT5Model } = ctx

  const streamOptions: any = {
    model: course.model || 'gpt-5.4-mini',
    maxTokens: 2000,
    systemPrompt,
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

  return streamOptions
}

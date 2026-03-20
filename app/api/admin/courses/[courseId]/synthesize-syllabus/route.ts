/**
 * Syllabus Synthesis API Route
 *
 * Handles syllabus file upload and AI synthesis
 * - Accepts file upload (PDF, DOCX, DOC, TXT)
 * - Extracts text content (PDFs via client-side extraction)
 * - Uses OpenAI to synthesize key insights
 * - Returns synthesized summary
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { extractTextFromFile } from '@/lib/file-parser'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Default synthesis prompt
const DEFAULT_SYNTHESIS_PROMPT = `You are an expert educational content analyzer. Analyze the provided syllabus document and extract the most important information for students and the AI teaching assistant.

Please synthesize the following key insights in a clear, structured format:

1. **Course Overview**: Brief summary of what the course covers
2. **Learning Objectives**: Main goals and outcomes students should achieve
3. **Key Topics**: Major themes and subject areas covered
4. **Assessment Methods**: How students will be evaluated (exams, projects, papers, etc.)
5. **Important Policies**: Attendance, late work, academic integrity, grading scale
6. **Required Materials**: Textbooks, software, equipment needed
7. **Course Structure**: Weekly schedule overview, major milestones

Keep the synthesis concise but comprehensive. Focus on information that would be most useful for:
- Students understanding course expectations
- AI assistant providing context-aware help
- Quick reference for course policies and requirements

Format the output as clear, readable text with section headings.`

/**
 * POST /api/admin/courses/[courseId]/synthesize-syllabus
 *
 * Upload and synthesize syllabus file
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params

    // Authentication
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify instructor has access to this course
    const instructorAccess = await prisma.courseInstructor.findFirst({
      where: {
        courseId,
        userId: parseInt(userId)
      }
    })

    if (!instructorAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied - You are not an instructor for this course' },
        { status: 403 }
      )
    }

    // Get course with synthesis prompt
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        syllabusSynthesisPrompt: true
      }
    })

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      )
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const customPrompt = formData.get('customPrompt') as string | null
    const preExtractedText = formData.get('extractedText') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log(`[SYLLABUS SYNTHESIS] Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`)

    // Extract text from file
    let extractedText: string

    if (preExtractedText && file.type === 'application/pdf') {
      // Use pre-extracted text from client-side PDF extraction
      extractedText = preExtractedText
      console.log(`[SYLLABUS SYNTHESIS] Using client-side extracted PDF text (${extractedText.length} characters)`)
    } else {
      // Extract server-side for non-PDF files
      const buffer = Buffer.from(await file.arrayBuffer())
      extractedText = await extractTextFromFile(buffer, file.name, file.type)
      console.log(`[SYLLABUS SYNTHESIS] Extracted ${extractedText.length} characters server-side`)
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Could not extract text from file. Please ensure the file contains readable text.' },
        { status: 400 }
      )
    }

    // Determine which prompt to use
    const synthesisPrompt = customPrompt ||
                           course.syllabusSynthesisPrompt ||
                           DEFAULT_SYNTHESIS_PROMPT

    console.log(`[SYLLABUS SYNTHESIS] Using ${customPrompt ? 'custom' : course.syllabusSynthesisPrompt ? 'course' : 'default'} prompt`)

    // Call OpenAI to synthesize
    console.log(`[SYLLABUS SYNTHESIS] Calling OpenAI for synthesis...`)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini', // Cost-effective with 1M context for document analysis
      messages: [
        {
          role: 'system',
          content: synthesisPrompt
        },
        {
          role: 'user',
          content: `Here is the syllabus document to analyze:\n\n${extractedText}`
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent output
      max_tokens: 2000
    })

    const synthesizedContent = completion.choices[0]?.message?.content

    if (!synthesizedContent) {
      return NextResponse.json(
        { success: false, error: 'Failed to synthesize syllabus' },
        { status: 500 }
      )
    }

    console.log(`[SYLLABUS SYNTHESIS] Generated ${synthesizedContent.length} characters of synthesis`)

    return NextResponse.json({
      success: true,
      data: {
        synthesizedContent,
        extractedText,
        promptUsed: customPrompt ? 'custom' : course.syllabusSynthesisPrompt ? 'course' : 'default',
        tokensUsed: completion.usage?.total_tokens || 0
      }
    })
  } catch (error) {
    console.error('[SYLLABUS SYNTHESIS] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to synthesize syllabus'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/courses/[courseId]/synthesize-syllabus
 *
 * Get the default or course-specific synthesis prompt
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params

    // Authentication
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get course synthesis prompt
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        syllabusSynthesisPrompt: true
      }
    })

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        defaultPrompt: DEFAULT_SYNTHESIS_PROMPT,
        coursePrompt: course.syllabusSynthesisPrompt,
        activePrompt: course.syllabusSynthesisPrompt || DEFAULT_SYNTHESIS_PROMPT
      }
    })
  } catch (error) {
    console.error('[SYLLABUS SYNTHESIS] Error fetching prompt:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch synthesis prompt'
      },
      { status: 500 }
    )
  }
}

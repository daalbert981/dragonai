/**
 * Student Course Chat Page
 *
 * Main page for students to interact with the AI assistant for a specific course.
 * Includes:
 * - Chat interface with streaming responses
 * - Session management
 * - File upload support
 * - Access control validation
 */

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { prisma } from '@/lib/prisma'
import { validateCourseAccess } from '@/lib/security'
import { MessageSquare, Loader2, BookOpen, AlertCircle } from 'lucide-react'

interface CourseChatePageProps {
  params: {
    courseId: string
  }
  searchParams: {
    sessionId?: string
  }
}

/**
 * Student Course Chat Page
 */
export default async function StudentCourseChatPage({
  params,
  searchParams
}: CourseChatePageProps) {
  const { courseId } = params
  const { sessionId } = searchParams

  // TODO: Get user from session
  // For now, using a mock user ID - replace with actual auth
  const userId = 'mock-user-id' // Replace with: await getServerSession()

  // Validate course access
  const hasAccess = await validateCourseAccess(userId, courseId)

  if (!hasAccess) {
    redirect('/student?error=access_denied')
  }

  // Get course details
  const course = await prisma.course.findUnique({
    where: { id: courseId }
  })

  if (!course || !course.isActive) {
    redirect('/student?error=course_not_found')
  }

  // Get initial messages if session ID is provided
  let initialMessages = []

  if (sessionId) {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: {
        fileUploads: true
      }
    })

    initialMessages = messages.map(m => ({
      id: m.id,
      sessionId: m.sessionId,
      userId: m.userId,
      role: m.role as 'USER' | 'ASSISTANT' | 'SYSTEM',
      content: m.content,
      isStreaming: false,
      error: m.error,
      tokenCount: m.tokenCount,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      fileUploads: m.fileUploads.map(f => ({
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
    }))
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-4">
          {/* Course info */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {course.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {course.code} • AI Assistant
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => window.history.back()}
            >
              Back to Course
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Suspense fallback={<ChatLoadingState />}>
          <ChatInterface
            courseId={courseId}
            sessionId={sessionId}
            initialMessages={initialMessages}
            userId={userId}
          />
        </Suspense>
      </main>

      {/* Footer info */}
      <footer className="border-t border-border bg-muted/30 px-4 py-2">
        <div className="container">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>
              AI-powered assistant • Responses may not always be accurate • Always verify important information
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

/**
 * Loading state for chat interface
 */
function ChatLoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Loading chat...</p>
      </div>
    </div>
  )
}

/**
 * Error state for access denied
 */
export function AccessDeniedState() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center space-y-4 max-w-md p-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to access this course chat. Please contact your instructor if you believe this is an error.
        </p>
        <button
          onClick={() => window.location.href = '/student'}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}

/**
 * Metadata for the page
 */
export async function generateMetadata({ params }: CourseChatePageProps) {
  const { courseId } = params

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { name: true, code: true }
  })

  if (!course) {
    return {
      title: 'Course Not Found'
    }
  }

  return {
    title: `${course.code} - Chat | Dragon AI`,
    description: `AI Assistant chat for ${course.name}`
  }
}

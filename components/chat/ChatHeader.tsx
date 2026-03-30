'use client'

import { BookOpen, PenSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ChatHistory } from './ChatHistory'

interface ChatHeaderProps {
  courseName: string
  courseCode: string
  courseId: string
  sessionId?: string
}

export function ChatHeader({ courseName, courseCode, courseId, sessionId }: ChatHeaderProps) {
  const router = useRouter()

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 sm:h-16 items-center px-3 sm:px-4">
        {/* Course info */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate">
              {courseName}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {courseCode}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button
            className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
            onClick={() => router.push(`/student/courses/${courseId}/chat`)}
            title="New Chat"
          >
            <PenSquare className="h-4 w-4" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
          <ChatHistory
            courseId={courseId}
            currentSessionId={sessionId}
          />
          <button
            className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => router.back()}
          >
            <span className="hidden sm:inline">Back to Course</span>
            <span className="sm:hidden">Back</span>
          </button>
        </div>
      </div>
    </header>
  )
}

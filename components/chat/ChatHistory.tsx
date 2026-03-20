'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { History, Trash2, MessageSquare, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

interface ChatSession {
  id: string
  courseId: string
  createdAt: Date
  updatedAt: Date
  messageCount: number
  preview: string
  firstMessageDate: Date
}

interface ChatHistoryProps {
  courseId: string
  currentSessionId?: string
}

export function ChatHistory({ courseId, currentSessionId }: ChatHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  // Fetch sessions when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, courseId])

  const fetchSessions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/courses/${courseId}/sessions`)
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          firstMessageDate: new Date(s.firstMessageDate)
        })))
      } else {
        console.error('Failed to fetch sessions:', response.status)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this chat session? This action cannot be undone.')) {
      return
    }

    setDeletingId(sessionId)
    try {
      const response = await fetch(`/api/courses/${courseId}/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove from list
        setSessions(prev => prev.filter(s => s.id !== sessionId))

        // If we're deleting the current session, start a new chat
        if (sessionId === currentSessionId) {
          router.push(`/student/courses/${courseId}/chat`)
          router.refresh()
        }
      } else {
        alert('Failed to delete session')
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Failed to delete session')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSessionClick = (sessionId: string) => {
    router.push(`/student/courses/${courseId}/chat?sessionId=${sessionId}`)
    setIsOpen(false)
    router.refresh()
  }

  const handleNewChat = () => {
    setIsOpen(false)
    router.push(`/student/courses/${courseId}/chat`)
    router.refresh()
  }

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <History className="h-4 w-4" />
        Chat History
      </Button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-screen w-full sm:w-96 bg-background border-l border-border z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                Chat History
              </h2>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* New Chat Button */}
            <div className="p-4 border-b border-border">
              <Button
                onClick={handleNewChat}
                className="w-full gap-2"
                variant="default"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  Loading sessions...
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No chat history yet</p>
                  <p className="text-xs mt-1">Start a new conversation!</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSessionClick(session.id)}
                    className={`
                      group relative p-3 rounded-lg border cursor-pointer transition-colors
                      ${session.id === currentSessionId
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted/30 border-border hover:bg-muted/50'
                      }
                    `}
                  >
                    {/* Session Info */}
                    <div className="pr-8">
                      <p className="text-sm font-medium line-clamp-2 mb-1">
                        {session.preview}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        <span>{session.messageCount} messages</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(session.updatedAt, { addSuffix: true })}</span>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                      onClick={(e) => handleDelete(session.id, e)}
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === session.id}
                      className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

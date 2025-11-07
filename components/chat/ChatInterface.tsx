/**
 * Chat Interface Component
 *
 * Main chat interface with:
 * - Real-time streaming responses
 * - Optimistic UI updates
 * - File upload support
 * - Message retry and regenerate
 * - Auto-scroll to latest message
 * - Error handling
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, StopCircle } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { FileUpload } from './FileUpload'
import { ErrorBoundary, ChatErrorFallback } from './ErrorBoundary'
import { ClientMessage, StreamChunk } from '@/types'
import { cn } from '@/lib/utils'

interface ChatInterfaceProps {
  /**
   * Course ID for context
   */
  courseId: string

  /**
   * Optional session ID for continuing existing chat
   */
  sessionId?: string

  /**
   * Initial messages to display
   */
  initialMessages?: ClientMessage[]

  /**
   * User ID
   */
  userId: string
}

/**
 * Main Chat Interface Component
 */
export function ChatInterface({
  courseId,
  sessionId: initialSessionId,
  initialMessages = [],
  userId
}: ChatInterfaceProps) {
  // State
  const [messages, setMessages] = useState<ClientMessage[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sessionId, setSessionId] = useState(initialSessionId)
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * Auto-resize textarea
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [inputValue])

  /**
   * Send a message
   */
  const sendMessage = useCallback(async (content: string, fileIds: string[] = []) => {
    if (!content.trim() && fileIds.length === 0) return
    if (isSending || isStreaming) return

    setIsSending(true)
    setError(null)

    // Create optimistic user message
    const userMessage: ClientMessage = {
      id: `temp-user-${Date.now()}`,
      sessionId: sessionId || '',
      userId,
      role: 'USER',
      content: content.trim(),
      isStreaming: false,
      error: null,
      tokenCount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isOptimistic: true,
      fileUploads: []
    }

    // Add optimistic message to UI
    setMessages(prev => [...prev, userMessage])

    // Clear input
    setInputValue('')
    setUploadedFileIds([])

    try {
      // Send message to API
      const response = await fetch(`/api/courses/${courseId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content.trim(),
          sessionId,
          fileIds
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Update session ID if new
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId)
      }

      // Replace optimistic message with real one
      setMessages(prev =>
        prev.map(msg =>
          msg.id === userMessage.id
            ? { ...data.message, isOptimistic: false }
            : msg
        )
      )

      // Start streaming assistant response
      await streamAssistantResponse(data.sessionId)
    } catch (error) {
      console.error('Error sending message:', error)

      // Update optimistic message with error
      setMessages(prev =>
        prev.map(msg =>
          msg.id === userMessage.id
            ? {
                ...msg,
                error: 'Failed to send message',
                isOptimistic: false
              }
            : msg
        )
      )

      setError('Failed to send message. Please try again.')
    } finally {
      setIsSending(false)
    }
  }, [courseId, sessionId, userId, isSending, isStreaming])

  /**
   * Stream assistant response
   */
  const streamAssistantResponse = async (chatSessionId: string) => {
    setIsStreaming(true)

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    // Create optimistic assistant message
    const assistantMessageId = `temp-assistant-${Date.now()}`
    const assistantMessage: ClientMessage = {
      id: assistantMessageId,
      sessionId: chatSessionId,
      userId: 'assistant',
      role: 'ASSISTANT',
      content: '',
      isStreaming: true,
      error: null,
      tokenCount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isOptimistic: true
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      const response = await fetch(`/api/courses/${courseId}/chat/stream?sessionId=${chatSessionId}`, {
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error('Failed to stream response')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6))

              if (data.error) {
                throw new Error(data.error)
              }

              if (data.delta) {
                accumulatedContent += data.delta

                // Update message with new content
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                )
              }

              if (data.done) {
                // Finalize message
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, isStreaming: false, isOptimistic: false }
                      : msg
                  )
                )
                break
              }
            } catch (e) {
              // Skip invalid JSON
              console.warn('Failed to parse SSE data:', e)
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Stream was cancelled
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId))
      } else {
        console.error('Streaming error:', error)

        // Update message with error
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  error: 'Failed to generate response',
                  isStreaming: false,
                  isOptimistic: false
                }
              : msg
          )
        )

        setError('Failed to generate response. Please try again.')
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  /**
   * Stop streaming
   */
  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  /**
   * Retry failed message
   */
  const retryMessage = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message || message.role !== 'USER') return

    // Remove failed message
    setMessages(prev => prev.filter(m => m.id !== messageId))

    // Resend
    sendMessage(message.content, message.fileUploads?.map(f => f.id) || [])
  }, [messages, sendMessage])

  /**
   * Regenerate assistant response
   */
  const regenerateResponse = useCallback((messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    // Remove the assistant message and all subsequent messages
    setMessages(prev => prev.slice(0, messageIndex))

    // Trigger new response
    if (sessionId) {
      streamAssistantResponse(sessionId)
    }
  }, [messages, sessionId])

  /**
   * Handle file upload
   */
  const handleFilesUploaded = (fileIds: string[]) => {
    setUploadedFileIds(prev => [...prev, ...fileIds])
  }

  /**
   * Handle form submit
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputValue, uploadedFileIds)
  }

  /**
   * Handle textarea key down
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Get last assistant message for regenerate button
  const lastAssistantMessageId = [...messages]
    .reverse()
    .find(m => m.role === 'ASSISTANT')?.id

  return (
    <ErrorBoundary fallback={ChatErrorFallback}>
      <div className="flex flex-col h-full">
        {/* Error banner */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center space-y-3 max-w-md">
                <h3 className="text-lg font-semibold text-foreground">
                  Start a conversation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ask questions, upload files, or discuss course material with your AI assistant.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={message.isStreaming}
                  onRetry={retryMessage}
                  onRegenerate={regenerateResponse}
                  isLastAssistantMessage={message.id === lastAssistantMessageId}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-background p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* File upload */}
            {uploadedFileIds.length === 0 && (
              <FileUpload
                courseId={courseId}
                onFilesUploaded={handleFilesUploaded}
                onError={setError}
                disabled={isSending || isStreaming}
              />
            )}

            {/* Message input */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message... (Shift+Enter for new line)"
                  disabled={isSending || isStreaming}
                  className={cn(
                    'w-full px-4 py-3 pr-12 rounded-lg border border-border',
                    'bg-background text-foreground placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                    'resize-none min-h-[52px] max-h-[200px]',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  rows={1}
                />
              </div>

              {/* Send/Stop button */}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopStreaming}
                  className="flex-shrink-0 p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  title="Stop generating"
                >
                  <StopCircle className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={(!inputValue.trim() && uploadedFileIds.length === 0) || isSending}
                  className={cn(
                    'flex-shrink-0 p-3 rounded-lg transition-colors',
                    'bg-primary hover:bg-primary/90 text-primary-foreground',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  title="Send message"
                >
                  {isSending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default ChatInterface

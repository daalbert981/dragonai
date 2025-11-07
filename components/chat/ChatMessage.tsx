/**
 * Chat Message Component
 *
 * Displays individual chat messages with support for:
 * - User and assistant messages
 * - Copy to clipboard
 * - Retry failed messages
 * - Regenerate responses
 * - Streaming status indication
 * - File attachments
 */

'use client'

import React, { useState } from 'react'
import { Copy, RefreshCw, Check, AlertCircle, Loader2, User, Bot, FileText } from 'lucide-react'
import { ClientMessage, FileUpload } from '@/types'
import { MessageErrorFallback } from './ErrorBoundary'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  /**
   * Message data
   */
  message: ClientMessage

  /**
   * Whether this message is currently streaming
   */
  isStreaming?: boolean

  /**
   * Callback to retry sending a failed message
   */
  onRetry?: (messageId: string) => void

  /**
   * Callback to regenerate an assistant response
   */
  onRegenerate?: (messageId: string) => void

  /**
   * Whether this is the last assistant message (for regenerate button)
   */
  isLastAssistantMessage?: boolean
}

/**
 * Chat Message Component
 */
export function ChatMessage({
  message,
  isStreaming = false,
  onRetry,
  onRegenerate,
  isLastAssistantMessage = false
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false)

  const isUser = message.role === 'USER'
  const isAssistant = message.role === 'ASSISTANT'
  const hasError = !!message.error

  /**
   * Copy message content to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  /**
   * Handle retry button click
   */
  const handleRetry = () => {
    if (onRetry) {
      onRetry(message.id)
    }
  }

  /**
   * Handle regenerate button click
   */
  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate(message.id)
    }
  }

  // Show error state
  if (hasError) {
    return (
      <div className={cn(
        'flex gap-3 p-4',
        isUser ? 'justify-end' : 'justify-start'
      )}>
        <div className="max-w-[80%]">
          <MessageErrorFallback error={message.error!} onRetry={onRetry ? handleRetry : undefined} />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex gap-3 p-4 transition-colors',
        isUser ? 'justify-end bg-transparent' : 'justify-start bg-muted/30',
        message.isOptimistic && 'opacity-70'
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        'flex-1 max-w-[80%] space-y-2',
        isUser && 'flex flex-col items-end'
      )}>
        {/* Message bubble */}
        <div
          className={cn(
            'rounded-lg px-4 py-3 break-words',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-background border border-border'
          )}
        >
          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Generating response...</span>
            </div>
          )}

          {/* Message text */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>

          {/* File attachments */}
          {message.fileUploads && message.fileUploads.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.fileUploads.map((file) => (
                <FileAttachment key={file.id} file={file} />
              ))}
            </div>
          )}
        </div>

        {/* Message actions */}
        <div className="flex items-center gap-2">
          {/* Timestamp */}
          <span className="text-xs text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>

          {/* Optimistic indicator */}
          {message.isOptimistic && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Sending...
            </span>
          )}

          {/* Action buttons (only for non-optimistic messages) */}
          {!message.isOptimistic && (
            <>
              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="Copy message"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                )}
              </button>

              {/* Regenerate button (for last assistant message) */}
              {isAssistant && isLastAssistantMessage && onRegenerate && !isStreaming && (
                <button
                  onClick={handleRegenerate}
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                  title="Regenerate response"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * File Attachment Component
 */
function FileAttachment({ file }: { file: FileUpload }) {
  const getStatusColor = () => {
    switch (file.status) {
      case 'COMPLETED':
        return 'text-green-600 dark:text-green-400'
      case 'FAILED':
        return 'text-red-600 dark:text-red-400'
      case 'PROCESSING':
        return 'text-yellow-600 dark:text-yellow-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const getStatusIcon = () => {
    switch (file.status) {
      case 'COMPLETED':
        return <Check className="h-3 w-3" />
      case 'FAILED':
        return <AlertCircle className="h-3 w-3" />
      case 'PROCESSING':
        return <Loader2 className="h-3 w-3 animate-spin" />
      default:
        return <Loader2 className="h-3 w-3 animate-spin" />
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded border border-border">
      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.originalName}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </p>
      </div>

      <div className={cn('flex-shrink-0', getStatusColor())}>
        {getStatusIcon()}
      </div>
    </div>
  )
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export default ChatMessage

/**
 * Error Boundary Component
 *
 * Catches and handles errors gracefully in the chat interface.
 * Provides a fallback UI when errors occur and allows recovery.
 */

'use client'

import React, { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  /**
   * Child components to wrap
   */
  children: ReactNode

  /**
   * Optional fallback component to render on error
   */
  fallback?: (error: Error, reset: () => void) => ReactNode

  /**
   * Optional callback when error occurs
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary for React components
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <ChatInterface />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console
    console.error('Error caught by boundary:', error, errorInfo)

    // Call optional error callback
    this.props.onError?.(error, errorInfo)

    // In production, you might want to send this to an error tracking service
    // Example: Sentry.captureException(error)
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null
    })
  }

  render(): ReactNode {
    const { hasError, error } = this.state
    const { children, fallback } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.handleReset)
      }

      // Default error UI
      return <DefaultErrorFallback error={error} onReset={this.handleReset} />
    }

    return children
  }
}

/**
 * Default error fallback component
 */
interface DefaultErrorFallbackProps {
  error: Error
  onReset: () => void
}

function DefaultErrorFallback({ error, onReset }: DefaultErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>

          <div className="flex-1 space-y-3">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
              Something went wrong
            </h3>

            <p className="text-sm text-red-700 dark:text-red-300">
              An error occurred while rendering the chat interface. This might be a temporary issue.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-3">
                <summary className="text-sm font-medium text-red-800 dark:text-red-200 cursor-pointer">
                  Error details
                </summary>
                <pre className="mt-2 text-xs text-red-900 dark:text-red-100 bg-red-100 dark:bg-red-900/30 p-3 rounded overflow-auto max-h-48">
                  {error.message}
                  {'\n\n'}
                  {error.stack}
                </pre>
              </details>
            )}

            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white text-sm font-medium rounded-md transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Chat-specific error fallback
 */
export function ChatErrorFallback({ error, onReset }: DefaultErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800 max-w-md">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <h4 className="font-semibold text-red-900 dark:text-red-100">
            Chat Error
          </h4>
        </div>

        <p className="text-sm text-red-700 dark:text-red-300 mb-4">
          We encountered an error in the chat. Your messages have been saved.
        </p>

        <button
          onClick={onReset}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Reload chat
        </button>
      </div>
    </div>
  )
}

/**
 * Message-specific error fallback (for individual message errors)
 */
export function MessageErrorFallback({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
            Message failed
          </p>
          <p className="text-sm text-red-700 dark:text-red-300 break-words">
            {error}
          </p>

          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorBoundary

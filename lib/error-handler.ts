import { toast } from './toast'

/**
 * Global error handler utility functions
 */

export type ErrorWithMessage = {
  message: string
}

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError

  try {
    return new Error(JSON.stringify(maybeError))
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError))
  }
}

export function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message
}

/**
 * Handle API errors and show appropriate toast notifications
 */
export function handleApiError(error: unknown, customMessage?: string) {
  const errorMessage = getErrorMessage(error)

  toast.error(customMessage || 'An error occurred', {
    description: errorMessage,
  })

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error)
  }
}

/**
 * Handle form validation errors
 */
export function handleValidationError(errors: Record<string, string[]>) {
  const firstError = Object.values(errors)[0]?.[0]

  if (firstError) {
    toast.error('Validation Error', {
      description: firstError,
    })
  }
}

/**
 * Async error handler wrapper for safe async operations
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  errorMessage?: string
): Promise<[Error | null, T | null]> {
  try {
    const data = await promise
    return [null, data]
  } catch (error) {
    const err = toErrorWithMessage(error)

    if (errorMessage) {
      handleApiError(err, errorMessage)
    }

    return [err as Error, null]
  }
}

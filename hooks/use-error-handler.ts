'use client'

import { useCallback } from 'react'
import { toast } from '@/lib/toast'
import { getErrorMessage } from '@/lib/error-handler'

/**
 * Hook for handling errors in components
 */
export function useErrorHandler() {
  const handleError = useCallback((error: unknown, customMessage?: string) => {
    const errorMessage = getErrorMessage(error)

    toast.error(customMessage || 'An error occurred', {
      description: errorMessage,
    })

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', error)
    }
  }, [])

  return { handleError }
}

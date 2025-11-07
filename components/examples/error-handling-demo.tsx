'use client'

import { useState } from 'react'
import { toast } from '@/lib/toast'
import { SectionErrorBoundary } from '@/components/section-error-boundary'

/**
 * Demo component showing how to use the error handling system
 * This component demonstrates:
 * 1. Toast notifications
 * 2. Error boundaries
 * 3. Error simulation
 */
export function ErrorHandlingDemo() {
  const [shouldError, setShouldError] = useState(false)

  if (shouldError) {
    throw new Error('Simulated error for testing error boundary!')
  }

  const handleSuccessToast = () => {
    toast.success('Operation successful!', {
      description: 'Your changes have been saved.',
    })
  }

  const handleErrorToast = () => {
    toast.error('Operation failed!', {
      description: 'Please try again later.',
    })
  }

  const handleWarningToast = () => {
    toast.warning('Warning!', {
      description: 'This action may have consequences.',
    })
  }

  const handleInfoToast = () => {
    toast.info('Information', {
      description: 'Here is some useful information.',
    })
  }

  const handleLoadingToast = () => {
    const loadingToast = toast.loading('Processing...', {
      description: 'Please wait while we process your request.',
    })

    setTimeout(() => {
      toast.dismiss(loadingToast)
      toast.success('Completed!')
    }, 3000)
  }

  const handlePromiseToast = () => {
    const promise = new Promise((resolve, reject) => {
      setTimeout(() => {
        Math.random() > 0.5 ? resolve('Success!') : reject(new Error('Failed!'))
      }, 2000)
    })

    toast.promise(promise, {
      loading: 'Processing...',
      success: 'Operation completed successfully!',
      error: 'Operation failed!',
    })
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Toast Notifications Demo</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={handleSuccessToast}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Success Toast
          </button>
          <button
            onClick={handleErrorToast}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Error Toast
          </button>
          <button
            onClick={handleWarningToast}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Warning Toast
          </button>
          <button
            onClick={handleInfoToast}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Info Toast
          </button>
          <button
            onClick={handleLoadingToast}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Loading Toast
          </button>
          <button
            onClick={handlePromiseToast}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Promise Toast
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Error Boundary Demo</h2>
        <button
          onClick={() => setShouldError(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Trigger Error
        </button>
      </div>

      <SectionErrorBoundary sectionName="Demo Section">
        <div className="p-6 bg-muted rounded-lg">
          <h3 className="text-lg font-semibold mb-2">
            This content is protected by an error boundary
          </h3>
          <p className="text-muted-foreground">
            If an error occurs in this section, it will be caught and displayed
            gracefully.
          </p>
        </div>
      </SectionErrorBoundary>
    </div>
  )
}

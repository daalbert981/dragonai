'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-background to-muted">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-9xl font-bold text-destructive">500</h1>
        <h2 className="text-3xl font-semibold">Something Went Wrong</h2>
        <p className="text-xl text-muted-foreground">
          An unexpected error occurred. We've been notified and are working to fix it.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-muted rounded-lg text-left">
            <p className="font-mono text-sm text-destructive break-all">
              {error.message}
            </p>
          </div>
        )}
        <div className="flex gap-4 justify-center pt-6">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8 py-2"
          >
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-8 py-2"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}

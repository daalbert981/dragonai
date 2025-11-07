'use client'

import { useEffect } from 'react'

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Student section error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-muted">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-destructive"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-3xl font-semibold">Student Dashboard Error</h2>
        <p className="text-lg text-muted-foreground">
          An error occurred in your student dashboard. Please try again or contact your instructor if the problem persists.
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
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8 py-2"
          >
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-8 py-2"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}

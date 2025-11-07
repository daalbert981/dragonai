'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-slate-50 to-slate-100">
          <div className="text-center space-y-6 max-w-2xl">
            <h1 className="text-9xl font-bold text-red-600">Error</h1>
            <h2 className="text-3xl font-semibold text-slate-900">
              Critical Error
            </h2>
            <p className="text-xl text-slate-600">
              A critical error occurred. Please try refreshing the page.
            </p>
            <div className="flex gap-4 justify-center pt-6">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 bg-slate-900 text-white hover:bg-slate-700 h-10 px-8 py-2"
              >
                Try Again
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 border border-slate-300 bg-white hover:bg-slate-50 h-10 px-8 py-2"
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}

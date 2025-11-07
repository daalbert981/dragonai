'use client'

import { ErrorBoundary } from './error-boundary'
import { ReactNode } from 'react'

interface SectionErrorBoundaryProps {
  children: ReactNode
  sectionName?: string
}

export function SectionErrorBoundary({
  children,
  sectionName = 'Section'
}: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center p-12 bg-muted/50 rounded-lg border border-destructive/50 min-h-[300px]">
          <div className="text-center space-y-4 max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
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
            <h3 className="text-xl font-semibold text-destructive">
              {sectionName} Error
            </h3>
            <p className="text-sm text-muted-foreground">
              This section encountered an error and couldn't be displayed.
              Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error(`Error in ${sectionName}:`, error, errorInfo)
        // You can integrate with error reporting service here
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

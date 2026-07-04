/**
 * Next.js Instrumentation
 *
 * This file runs once when the server starts up.
 * Use it for initializing background tasks, monitoring, etc.
 *
 * Error monitoring: Sentry initializes here when SENTRY_DSN is set
 * (no-op otherwise). PII is scrubbed before events leave the server
 * (FERPA: no student emails in error reports).
 *
 * Background scheduler: session-retention cleanup runs in-process via
 * node-cron (every 6 hours) when ENABLE_INTERNAL_CRON=true and
 * CLEANUP_API_KEY are set. The web dyno is a Basic dyno (never sleeps),
 * so in-process cron is reliable; ~5-10MB RAM. See DATA_RETENTION_SETUP.md
 * for the external-cron alternative.
 */

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

function scrubEmails(value: string): string {
  return value.replace(EMAIL_PATTERN, '[email redacted]')
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.SENTRY_DSN) {
      const Sentry = await import('@sentry/nextjs')

      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        // FERPA: never attach user identifiers or request bodies
        sendDefaultPii: false,
        tracesSampleRate: 0,
        beforeSend(event) {
          if (event.message) {
            event.message = scrubEmails(event.message)
          }
          for (const exception of event.exception?.values ?? []) {
            if (exception.value) {
              exception.value = scrubEmails(exception.value)
            }
          }
          if (event.user) {
            delete event.user
          }
          return event
        },
      })

      console.log('[INSTRUMENTATION] Sentry error monitoring enabled')
    } else {
      console.log('[INSTRUMENTATION] SENTRY_DSN not set — error monitoring disabled')
    }

    if (process.env.ENABLE_INTERNAL_CRON === 'true' && process.env.CLEANUP_API_KEY) {
      const { startScheduler } = await import('./lib/scheduler')
      startScheduler()
    } else {
      console.log('[INSTRUMENTATION] Internal cron disabled (set ENABLE_INTERNAL_CRON=true + CLEANUP_API_KEY)')
    }
  }
}

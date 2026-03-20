/**
 * Next.js Instrumentation
 *
 * This file runs once when the server starts up.
 * Use it for initializing background tasks, monitoring, etc.
 *
 * ONLY ENABLE IF YOU WANT APPLICATION-LEVEL SCHEDULING
 * Otherwise, use external cron services (recommended)
 */

export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[INSTRUMENTATION] Server starting up...')

    // Uncomment to enable background scheduler
    // WARNING: This will use additional RAM (~5-10MB)
    // Only use if external cron is not available

    // const { startScheduler } = await import('./lib/scheduler')
    // startScheduler()

    console.log('[INSTRUMENTATION] Startup complete')
    console.log('[INSTRUMENTATION] Note: Background scheduler is DISABLED')
    console.log('[INSTRUMENTATION] To enable: Uncomment scheduler in instrumentation.ts')
    console.log('[INSTRUMENTATION] Recommended: Use external cron service instead (see DATA_RETENTION_SETUP.md)')
  }
}

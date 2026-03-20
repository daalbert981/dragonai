/**
 * Application-level scheduler for periodic tasks
 *
 * RESOURCE IMPACT: Adds ~5-10MB RAM usage
 * Only use if external cron is not available
 */

import cron from 'node-cron'

// Flag to ensure we only start once
let schedulerStarted = false

/**
 * Start the background scheduler
 * Call this once when the server starts
 */
export function startScheduler() {
  if (schedulerStarted) {
    console.log('[SCHEDULER] Already running, skipping start')
    return
  }

  console.log('[SCHEDULER] Starting background tasks...')

  // Run cleanup every 6 hours (0 */6 * * *)
  // This is a good balance between compliance and resource usage
  cron.schedule('0 */6 * * *', async () => {
    console.log('[SCHEDULER] Running scheduled session cleanup...')

    try {
      const apiKey = process.env.CLEANUP_API_KEY

      if (!apiKey) {
        console.error('[SCHEDULER] CLEANUP_API_KEY not set in environment!')
        return
      }

      // Call the cleanup API internally with authentication
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/cleanup-expired-sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })

      const result = await response.json()

      if (result.success) {
        console.log(`[SCHEDULER] Cleanup completed: ${result.totalDeleted} sessions deleted`)
      } else {
        console.error('[SCHEDULER] Cleanup failed:', result.error)
      }
    } catch (error) {
      console.error('[SCHEDULER] Error running cleanup:', error)
    }
  })

  schedulerStarted = true
  console.log('[SCHEDULER] Background scheduler started (runs every 6 hours)')
}

/**
 * For manual testing - run cleanup immediately
 */
export async function runCleanupNow() {
  console.log('[SCHEDULER] Running manual cleanup...')

  try {
    const apiKey = process.env.CLEANUP_API_KEY

    if (!apiKey) {
      throw new Error('CLEANUP_API_KEY not set in environment!')
    }

    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/cleanup-expired-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    const result = await response.json()
    console.log('[SCHEDULER] Cleanup result:', result)
    return result
  } catch (error) {
    console.error('[SCHEDULER] Error running cleanup:', error)
    throw error
  }
}

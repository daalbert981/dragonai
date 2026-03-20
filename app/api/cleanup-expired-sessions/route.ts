/**
 * Cleanup Expired Sessions API Route
 *
 * Background job to delete expired chat sessions across all courses
 * based on their retention policies. This ensures data privacy compliance.
 *
 * Can be called:
 * - Via cron job (recommended)
 * - Manually via API call
 * - On server startup
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Verify API key for cleanup endpoint
 */
function verifyApiKey(req: NextRequest): boolean {
  // Get API key from Authorization header
  const authHeader = req.headers.get('authorization')

  if (!authHeader) {
    return false
  }

  // Support both "Bearer TOKEN" and just "TOKEN"
  const token = authHeader.replace('Bearer ', '').trim()

  // Get expected key from environment
  const validKey = process.env.CLEANUP_API_KEY

  if (!validKey) {
    console.error('[CLEANUP] CLEANUP_API_KEY not set in environment!')
    return false
  }

  return token === validKey
}

/**
 * POST /api/cleanup-expired-sessions
 *
 * Cleans up expired sessions across all courses based on retention policies
 *
 * AUTHENTICATION REQUIRED: Set CLEANUP_API_KEY in .env
 * Send key in Authorization header: "Bearer YOUR_API_KEY"
 */
export async function POST(req: NextRequest) {
  try {
    // Verify API key
    if (!verifyApiKey(req)) {
      console.warn('[CLEANUP] Unauthorized cleanup attempt')
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Valid API key required'
        },
        { status: 401 }
      )
    }

    console.log('[CLEANUP] Starting expired sessions cleanup...')

    // Get all courses with their retention policies
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        sessionRetentionPolicy: true,
        sessionRetentionDays: true,
        sessionRetentionHours: true
      }
    })

    let totalDeleted = 0
    const results: any[] = []

    for (const course of courses) {
      console.log(`[CLEANUP] Processing course: ${course.code} (${course.name})`)
      console.log(`[CLEANUP] Retention policy: ${course.sessionRetentionPolicy}`)

      let deleted = 0

      if (course.sessionRetentionPolicy === 'never') {
        // Delete ALL sessions for this course
        const deleteResult = await prisma.chatSession.deleteMany({
          where: {
            courseId: course.id
          }
        })
        deleted = deleteResult.count
        console.log(`[CLEANUP] Deleted ${deleted} sessions (never policy)`)
      } else if (course.sessionRetentionPolicy === 'custom') {
        // Calculate cutoff date
        const retentionDays = course.sessionRetentionDays || 0
        const retentionHours = course.sessionRetentionHours || 0
        const totalHours = retentionDays * 24 + retentionHours

        if (totalHours === 0) {
          // Delete all sessions if retention is 0
          const deleteResult = await prisma.chatSession.deleteMany({
            where: {
              courseId: course.id
            }
          })
          deleted = deleteResult.count
          console.log(`[CLEANUP] Deleted ${deleted} sessions (0 hour retention)`)
        } else if (totalHours > 0) {
          const cutoffDate = new Date()
          cutoffDate.setHours(cutoffDate.getHours() - totalHours)

          console.log(`[CLEANUP] Cutoff date: ${cutoffDate.toISOString()}`)

          // Delete sessions older than cutoff date
          const deleteResult = await prisma.chatSession.deleteMany({
            where: {
              courseId: course.id,
              updatedAt: {
                lt: cutoffDate
              }
            }
          })
          deleted = deleteResult.count
          console.log(`[CLEANUP] Deleted ${deleted} expired sessions`)
        }
      } else {
        // "forever" policy - no cleanup needed
        console.log(`[CLEANUP] Skipping (forever policy)`)
      }

      totalDeleted += deleted

      results.push({
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code,
        policy: course.sessionRetentionPolicy,
        retentionDays: course.sessionRetentionDays,
        retentionHours: course.sessionRetentionHours,
        deletedCount: deleted
      })
    }

    console.log(`[CLEANUP] Total sessions deleted: ${totalDeleted}`)

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. ${totalDeleted} sessions deleted.`,
      totalDeleted,
      results
    })
  } catch (error) {
    console.error('[CLEANUP] Error during cleanup:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cleanup-expired-sessions
 *
 * Preview what would be deleted without actually deleting
 *
 * AUTHENTICATION REQUIRED: Set CLEANUP_API_KEY in .env
 * Send key in Authorization header: "Bearer YOUR_API_KEY"
 */
export async function GET(req: NextRequest) {
  try {
    // Verify API key
    if (!verifyApiKey(req)) {
      console.warn('[CLEANUP] Unauthorized preview attempt')
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Valid API key required'
        },
        { status: 401 }
      )
    }

    console.log('[CLEANUP] Preview mode - no deletions will occur')

    // Get all courses with their retention policies
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        sessionRetentionPolicy: true,
        sessionRetentionDays: true,
        sessionRetentionHours: true
      }
    })

    let totalToDelete = 0
    const preview: any[] = []

    for (const course of courses) {
      let countToDelete = 0

      if (course.sessionRetentionPolicy === 'never') {
        // Count ALL sessions for this course
        countToDelete = await prisma.chatSession.count({
          where: {
            courseId: course.id
          }
        })
      } else if (course.sessionRetentionPolicy === 'custom') {
        // Calculate cutoff date
        const retentionDays = course.sessionRetentionDays || 0
        const retentionHours = course.sessionRetentionHours || 0
        const totalHours = retentionDays * 24 + retentionHours

        if (totalHours === 0) {
          // Count all sessions
          countToDelete = await prisma.chatSession.count({
            where: {
              courseId: course.id
            }
          })
        } else if (totalHours > 0) {
          const cutoffDate = new Date()
          cutoffDate.setHours(cutoffDate.getHours() - totalHours)

          // Count sessions older than cutoff date
          countToDelete = await prisma.chatSession.count({
            where: {
              courseId: course.id,
              updatedAt: {
                lt: cutoffDate
              }
            }
          })
        }
      }

      totalToDelete += countToDelete

      preview.push({
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code,
        policy: course.sessionRetentionPolicy,
        retentionDays: course.sessionRetentionDays,
        retentionHours: course.sessionRetentionHours,
        sessionsToDelete: countToDelete
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Preview mode - no sessions were deleted',
      totalToDelete,
      preview
    })
  } catch (error) {
    console.error('[CLEANUP] Error during preview:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Preview failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

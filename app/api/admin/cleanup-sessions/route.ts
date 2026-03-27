/**
 * Session Cleanup API Route
 *
 * Automatically cleans up old chat sessions based on course retention policies.
 * Can be triggered by Heroku Scheduler or other cron-like services.
 *
 * Authentication: Requires a secret token or admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Storage } from '@google-cloud/storage'

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  ...(process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY
    ? {
        credentials: {
          client_email: process.env.GCS_CLIENT_EMAIL,
          private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
      }
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
    : {}),
})
const bucketName = process.env.GCS_BUCKET_NAME

/**
 * Calculate the cutoff date for a retention policy
 */
function calculateCutoffDate(
  policy: string,
  days: number | null,
  hours: number | null
): Date | null {
  const now = new Date()

  if (policy === 'never') {
    // For "never" policy, delete all sessions (use future date as cutoff so everything qualifies)
    const cutoff = new Date(now)
    cutoff.setFullYear(cutoff.getFullYear() + 100)
    return cutoff
  }

  if (policy === 'custom') {
    const totalHours = (days || 0) * 24 + (hours || 0)
    const cutoff = new Date(now)
    cutoff.setHours(cutoff.getHours() - totalHours)
    return cutoff
  }

  return null // No cutoff for "forever"
}

/**
 * Clean up sessions for a specific course
 */
async function cleanupCourseSessions(course: {
  id: string
  code: string
  sessionRetentionPolicy: string
  sessionRetentionDays: number | null
  sessionRetentionHours: number | null
}) {
  const { id, code, sessionRetentionPolicy, sessionRetentionDays, sessionRetentionHours } = course

  // Skip courses with "forever" retention
  if (sessionRetentionPolicy === 'forever') {
    return { deleted: 0, skipped: true, reason: 'forever policy' }
  }

  // Calculate cutoff date
  const cutoffDate = calculateCutoffDate(
    sessionRetentionPolicy,
    sessionRetentionDays,
    sessionRetentionHours
  )

  if (!cutoffDate) {
    return { deleted: 0, skipped: true, reason: 'invalid configuration' }
  }

  // Find sessions to delete
  const sessionsToDelete = await prisma.chatSession.findMany({
    where: {
      courseId: id,
      updatedAt: {
        lt: cutoffDate
      }
    },
    include: {
      messages: {
        include: {
          fileUploads: {
            select: {
              filename: true
            }
          }
        }
      }
    }
  })

  if (sessionsToDelete.length === 0) {
    return { deleted: 0, skipped: false, reason: 'no old sessions' }
  }

  // Collect all file uploads from sessions
  const filesToDelete: string[] = []
  for (const session of sessionsToDelete) {
    for (const message of session.messages) {
      for (const file of message.fileUploads) {
        filesToDelete.push(file.filename)
      }
    }
  }

  // Delete files from Google Cloud Storage first
  let deletedFiles = 0
  if (filesToDelete.length > 0 && bucketName) {
    const bucket = storage.bucket(bucketName)

    for (const filename of filesToDelete) {
      try {
        await bucket.file(filename).delete()
        deletedFiles++
      } catch (error) {
        console.warn(`[${code}] Failed to delete file ${filename} from GCS:`, (error as Error).message)
      }
    }
  }

  // Delete sessions (cascade will delete messages and file upload records)
  const result = await prisma.chatSession.deleteMany({
    where: {
      id: {
        in: sessionsToDelete.map(s => s.id)
      }
    }
  })

  return {
    deleted: result.count,
    skipped: false,
    filesDeleted: deletedFiles,
    reason: `deleted ${result.count} sessions, ${deletedFiles} files`
  }
}

/**
 * POST /api/admin/cleanup-sessions
 *
 * Run the cleanup process
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate using secret token from environment
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CLEANUP_SECRET_TOKEN

    if (!expectedToken) {
      console.error('[CLEANUP] CLEANUP_SECRET_TOKEN not set in environment!')
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      )
    }

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const startTime = new Date()

    // Get all courses
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        code: true,
        sessionRetentionPolicy: true,
        sessionRetentionDays: true,
        sessionRetentionHours: true
      }
    })

    const results = []
    let totalDeleted = 0
    let totalFilesDeleted = 0

    // Process each course
    for (const course of courses) {
      const result = await cleanupCourseSessions(course)

      results.push({
        course: course.code,
        ...result
      })

      totalDeleted += result.deleted || 0
      totalFilesDeleted += result.filesDeleted || 0
    }

    const endTime = new Date()
    const duration = endTime.getTime() - startTime.getTime()

    return NextResponse.json({
      success: true,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: `${duration}ms`,
      coursesProcessed: courses.length,
      totalSessionsDeleted: totalDeleted,
      totalFilesDeleted,
      results
    })
  } catch (error) {
    console.error('Error during cleanup:', error)
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        message: (error as Error).message
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/cleanup-sessions
 *
 * Preview what would be cleaned up (dry run)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate using secret token from environment
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CLEANUP_SECRET_TOKEN

    if (!expectedToken) {
      console.error('[CLEANUP] CLEANUP_SECRET_TOKEN not set in environment!')
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      )
    }

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all courses
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        sessionRetentionPolicy: true,
        sessionRetentionDays: true,
        sessionRetentionHours: true
      }
    })

    const preview = []

    // Check each course
    for (const course of courses) {
      if (course.sessionRetentionPolicy === 'forever') {
        preview.push({
          course: course.code,
          name: course.name,
          policy: 'forever',
          sessionsToDelete: 0,
          reason: 'retention policy is forever'
        })
        continue
      }

      const cutoffDate = calculateCutoffDate(
        course.sessionRetentionPolicy,
        course.sessionRetentionDays,
        course.sessionRetentionHours
      )

      if (!cutoffDate) {
        preview.push({
          course: course.code,
          name: course.name,
          policy: course.sessionRetentionPolicy,
          sessionsToDelete: 0,
          reason: 'invalid configuration'
        })
        continue
      }

      const oldSessions = await prisma.chatSession.count({
        where: {
          courseId: course.id,
          updatedAt: { lt: cutoffDate }
        }
      })

      preview.push({
        course: course.code,
        name: course.name,
        policy: course.sessionRetentionPolicy,
        retentionDays: course.sessionRetentionDays || 0,
        retentionHours: course.sessionRetentionHours || 0,
        cutoffDate: cutoffDate.toISOString(),
        sessionsToDelete: oldSessions
      })
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      preview
    })
  } catch (error) {
    console.error('Error during cleanup preview:', error)
    return NextResponse.json(
      {
        error: 'Preview failed',
        message: (error as Error).message
      },
      { status: 500 }
    )
  }
}

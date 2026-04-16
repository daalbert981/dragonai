/**
 * Course Analytics API
 *
 * CRITICAL: All queries are scoped to the specific courseId to ensure
 * metrics reflect only the activity within THIS course, not across
 * multiple courses or all users.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify instructor access to this course
    const isInstructor = await prisma.courseInstructor.findFirst({
      where: {
        courseId: params.courseId,
        userId: parseInt(session.user.id),
      },
    })

    if (!isInstructor && (session.user as any).role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Time-window for date-bucketed series (defaults to 30 days)
    const url = new URL(req.url)
    const requestedDays = parseInt(url.searchParams.get('days') || '30', 10)
    const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      select: { timezone: true },
    })
    const timezone = course?.timezone || 'America/New_York'

    const windowStart = new Date()
    windowStart.setUTCHours(0, 0, 0, 0)
    windowStart.setUTCDate(windowStart.getUTCDate() - (days - 1))

    // CRITICAL: All queries below filter by courseId through ChatSession
    // to ensure we only get data for THIS specific course

    // 1. Total enrolled students
    const totalEnrolled = await prisma.courseEnrollment.count({
      where: { courseId: params.courseId },
    })

    // 2. Total chat sessions for THIS course
    const totalSessions = await prisma.chatSession.count({
      where: { courseId: params.courseId },
    })

    // 3. Total messages from students in THIS course
    // MUST join through ChatSession to filter by courseId
    const totalMessages = await prisma.chatMessage.count({
      where: {
        role: 'USER',
        session: {
          courseId: params.courseId, // CRITICAL: Filter by course
        },
      },
    })

    // 4. Active students (students in THIS course who have sent at least one message)
    // Get distinct userIds from ChatSessions for this course that have messages
    const activeSessions = await prisma.chatSession.findMany({
      where: {
        courseId: params.courseId, // CRITICAL: Filter by course
        messages: {
          some: {
            role: 'USER',
          },
        },
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    })
    const activeStudents = activeSessions.length

    // 5. Messages in last 7 days for THIS course
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentMessages = await prisma.chatMessage.count({
      where: {
        role: 'USER',
        createdAt: { gte: sevenDaysAgo },
        session: {
          courseId: params.courseId, // CRITICAL: Filter by course
        },
      },
    })

    // 6. Top 5 most active students in THIS course
    const messagesByUser = await prisma.chatMessage.groupBy({
      by: ['userId'],
      where: {
        role: 'USER',
        session: {
          courseId: params.courseId, // CRITICAL: Filter by course
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    })

    // Get user details for top students
    const topStudentIds = messagesByUser.map((m) => m.userId)
    const topStudentDetails = await prisma.user.findMany({
      where: { id: { in: topStudentIds } },
      select: { id: true, username: true, email: true },
    })

    const topStudents = messagesByUser.map((m) => {
      const user = topStudentDetails.find((u) => u.id === m.userId)
      return {
        userId: m.userId,
        username: user?.username || 'Unknown',
        email: user?.email || 'N/A',
        messageCount: m._count.id,
      }
    })

    // 7. Activity by day of week for THIS course
    // We'll do this in-memory since Prisma doesn't have great date extraction
    const allMessages = await prisma.chatMessage.findMany({
      where: {
        role: 'USER',
        session: {
          courseId: params.courseId, // CRITICAL: Filter by course
        },
      },
      select: {
        createdAt: true,
      },
    })

    const activityByDay = Array(7).fill(0)
    allMessages.forEach((msg) => {
      const day = msg.createdAt.getDay() // 0 = Sunday, 6 = Saturday
      activityByDay[day]++
    })

    // 8. Activity by hour of day for THIS course
    const activityByHour = Array(24).fill(0)
    allMessages.forEach((msg) => {
      const hour = msg.createdAt.getHours()
      activityByHour[hour]++
    })

    // 9. File uploads in THIS course (chat attachments by students)
    const fileUploads = await prisma.fileUpload.count({
      where: {
        message: {
          session: {
            courseId: params.courseId, // CRITICAL: Filter by course
          },
        },
      },
    })

    // 9a. Course materials uploaded by instructor(s) in THIS course
    const materialsTotal = await prisma.courseMaterial.count({
      where: { courseId: params.courseId },
    })
    const materialsRecent = await prisma.courseMaterial.count({
      where: {
        courseId: params.courseId,
        uploadedAt: { gte: windowStart },
      },
    })
    const recentMaterialsList = await prisma.courseMaterial.findMany({
      where: { courseId: params.courseId, uploadedAt: { gte: windowStart } },
      select: { uploadedAt: true },
    })

    // 9b. Material downloads (best-effort — table may not yet exist)
    let downloadsTotal = 0
    let downloadsRecent = 0
    let recentDownloadsList: { downloadedAt: Date }[] = []
    let topDownloadedRaw: { materialId: string; _count: { id: number } }[] = []
    try {
      downloadsTotal = await (prisma as any).materialDownload.count({
        where: { courseId: params.courseId },
      })
      downloadsRecent = await (prisma as any).materialDownload.count({
        where: { courseId: params.courseId, downloadedAt: { gte: windowStart } },
      })
      recentDownloadsList = await (prisma as any).materialDownload.findMany({
        where: { courseId: params.courseId, downloadedAt: { gte: windowStart } },
        select: { downloadedAt: true },
      })
      topDownloadedRaw = await (prisma as any).materialDownload.groupBy({
        by: ['materialId'],
        where: { courseId: params.courseId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      })
    } catch (err) {
      console.warn('[ANALYTICS] MaterialDownload not available yet:', err instanceof Error ? err.message : err)
    }

    // Resolve top-downloaded material names
    const topDownloadedIds = topDownloadedRaw.map((m) => m.materialId)
    const topDownloadedDetails =
      topDownloadedIds.length > 0
        ? await prisma.courseMaterial.findMany({
            where: { id: { in: topDownloadedIds } },
            select: { id: true, originalName: true },
          })
        : []
    const topDownloaded = topDownloadedRaw.map((m) => {
      const details = topDownloadedDetails.find((d) => d.id === m.materialId)
      return {
        materialId: m.materialId,
        originalName: details?.originalName || 'Unknown',
        downloadCount: m._count.id,
      }
    })

    // 9c. Recent chat attachments (per-date series within window)
    const recentAttachmentsList = await prisma.fileUpload.findMany({
      where: {
        uploadedAt: { gte: windowStart },
        message: {
          session: { courseId: params.courseId },
        },
      },
      select: { uploadedAt: true },
    })

    // 9d. Per-calendar-date activity series for the window (in course timezone)
    const recentMessagesList = await prisma.chatMessage.findMany({
      where: {
        role: 'USER',
        createdAt: { gte: windowStart },
        session: { courseId: params.courseId },
      },
      select: { createdAt: true, userId: true, sessionId: true },
    })
    const recentSessionsList = await prisma.chatSession.findMany({
      where: {
        courseId: params.courseId,
        createdAt: { gte: windowStart },
      },
      select: { createdAt: true },
    })

    // Build the date-keyed buckets
    const dateLabels: string[] = []
    const cursor = new Date(windowStart)
    for (let i = 0; i < days; i++) {
      dateLabels.push(formatDate(cursor, timezone))
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    const emptyBuckets = (): Record<string, number> =>
      Object.fromEntries(dateLabels.map((d) => [d, 0]))

    const messagesByDate = emptyBuckets()
    const sessionsByDate = emptyBuckets()
    const attachmentsByDate = emptyBuckets()
    const materialsByDate = emptyBuckets()
    const downloadsByDate = emptyBuckets()
    const activeStudentsByDate: Record<string, Set<number>> = Object.fromEntries(
      dateLabels.map((d) => [d, new Set<number>()])
    )

    for (const m of recentMessagesList) {
      const k = formatDate(m.createdAt, timezone)
      if (k in messagesByDate) {
        messagesByDate[k]++
        activeStudentsByDate[k].add(m.userId)
      }
    }
    for (const s of recentSessionsList) {
      const k = formatDate(s.createdAt, timezone)
      if (k in sessionsByDate) sessionsByDate[k]++
    }
    for (const a of recentAttachmentsList) {
      const k = formatDate(a.uploadedAt, timezone)
      if (k in attachmentsByDate) attachmentsByDate[k]++
    }
    for (const m of recentMaterialsList) {
      const k = formatDate(m.uploadedAt, timezone)
      if (k in materialsByDate) materialsByDate[k]++
    }
    for (const d of recentDownloadsList) {
      const k = formatDate(d.downloadedAt, timezone)
      if (k in downloadsByDate) downloadsByDate[k]++
    }

    const activityByDate = {
      labels: dateLabels,
      messages: dateLabels.map((d) => messagesByDate[d]),
      sessions: dateLabels.map((d) => sessionsByDate[d]),
      activeStudents: dateLabels.map((d) => activeStudentsByDate[d].size),
      attachments: dateLabels.map((d) => attachmentsByDate[d]),
      materialsUploaded: dateLabels.map((d) => materialsByDate[d]),
      materialsDownloaded: dateLabels.map((d) => downloadsByDate[d]),
    }

    // 10. Average messages per session for THIS course
    const sessionsWithCounts = await prisma.chatSession.findMany({
      where: {
        courseId: params.courseId, // CRITICAL: Filter by course
      },
      select: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    })

    const avgMessagesPerSession =
      sessionsWithCounts.length > 0
        ? sessionsWithCounts.reduce((sum, s) => sum + s._count.messages, 0) /
          sessionsWithCounts.length
        : 0

    // 11. Engagement rate (active students / total enrolled)
    const engagementRate =
      totalEnrolled > 0 ? (activeStudents / totalEnrolled) * 100 : 0

    // Return all analytics
    return NextResponse.json({
      overview: {
        totalEnrolled,
        activeStudents,
        engagementRate: Math.round(engagementRate * 10) / 10, // Round to 1 decimal
        totalSessions,
        totalMessages,
        recentMessages, // Last 7 days
        fileUploads,
        avgMessagesPerSession: Math.round(avgMessagesPerSession * 10) / 10,
        materialsTotal,
        materialsRecent,
        downloadsTotal,
        downloadsRecent,
      },
      topStudents,
      activityByDay: {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        data: activityByDay,
      },
      activityByHour: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        data: activityByHour,
      },
      activityByDate,
      topDownloaded,
      window: { days, timezone },
    })
  } catch (error) {
    console.error('[ANALYTICS] Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

/**
 * Format a Date as YYYY-MM-DD in the given IANA timezone.
 * Uses Intl.DateTimeFormat — no extra deps.
 */
function formatDate(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return `${y}-${m}-${day}`
}

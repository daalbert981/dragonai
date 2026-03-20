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

    if (!isInstructor && session.user.classId !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    // 9. File uploads in THIS course
    const fileUploads = await prisma.fileUpload.count({
      where: {
        message: {
          session: {
            courseId: params.courseId, // CRITICAL: Filter by course
          },
        },
      },
    })

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
    })
  } catch (error) {
    console.error('[ANALYTICS] Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

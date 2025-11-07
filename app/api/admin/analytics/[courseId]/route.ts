import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper function to calculate engagement score
function calculateEngagementScore(messageCount: number, avgMessageLength: number, daysActive: number): number {
  // Engagement score formula (0-100)
  const messageScore = Math.min(messageCount * 2, 40) // Max 40 points for messages
  const lengthScore = Math.min(avgMessageLength / 10, 30) // Max 30 points for message length
  const consistencyScore = Math.min(daysActive * 3, 30) // Max 30 points for consistency

  return Math.round(messageScore + lengthScore + consistencyScore)
}

// Helper function to extract keywords from messages
function extractKeywords(text: string): string[] {
  // Simple keyword extraction - remove common words and get meaningful terms
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'what', 'how', 'when', 'where', 'why',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
  ])

  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word))

  return words
}

// Helper function to find common question patterns
function analyzeCommonQuestions(messages: { message: string }[]) {
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should']
  const questions: { text: string; count: number; keywords: string[] }[] = []
  const keywordFrequency: Record<string, number> = {}

  messages.forEach(({ message }) => {
    const lowerMessage = message.toLowerCase()
    const isQuestion = questionWords.some(word => lowerMessage.includes(word)) ||
                      lowerMessage.includes('?')

    if (isQuestion) {
      // Extract keywords from this question
      const keywords = extractKeywords(message)
      keywords.forEach(keyword => {
        keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1
      })

      // Check if we've seen a similar question
      const existing = questions.find(q =>
        q.text.toLowerCase() === lowerMessage ||
        q.keywords.some(k => keywords.includes(k))
      )

      if (existing) {
        existing.count++
      } else if (message.length < 200) { // Only store reasonably short questions
        questions.push({ text: message, count: 1, keywords })
      }
    }
  })

  // Sort by frequency
  questions.sort((a, b) => b.count - a.count)

  // Get top keywords
  const topKeywords = Object.entries(keywordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([keyword, count]) => ({ keyword, count }))

  return {
    commonQuestions: questions.slice(0, 10),
    topKeywords
  }
}

// GET: Fetch analytics for a course
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') // 'json' or 'csv'

    // Fetch course with instructor verification
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: true,
        enrollments: {
          include: {
            user: true
          }
        },
        chatMessages: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Calculate analytics
    const totalStudents = course.enrollments.length
    const totalMessages = course.chatMessages.length
    const uniqueActiveStudents = new Set(course.chatMessages.map(m => m.userId)).size

    // Calculate date range
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const recentMessages = course.chatMessages.filter(m => m.createdAt >= thirtyDaysAgo)
    const weekMessages = course.chatMessages.filter(m => m.createdAt >= sevenDaysAgo)

    // Student engagement metrics
    const studentMetrics = course.enrollments.map(enrollment => {
      const studentMessages = course.chatMessages.filter(m => m.userId === enrollment.userId)
      const messageCount = studentMessages.length
      const avgMessageLength = messageCount > 0
        ? studentMessages.reduce((sum, m) => sum + m.message.length, 0) / messageCount
        : 0

      // Calculate unique days active
      const activeDays = new Set(
        studentMessages.map(m => m.createdAt.toISOString().split('T')[0])
      ).size

      const lastActive = studentMessages.length > 0
        ? studentMessages[0].createdAt
        : null

      const engagementScore = calculateEngagementScore(messageCount, avgMessageLength, activeDays)

      return {
        studentId: enrollment.user.id,
        studentName: enrollment.user.name || 'Unknown',
        studentEmail: enrollment.user.email,
        messageCount,
        avgMessageLength: Math.round(avgMessageLength),
        daysActive: activeDays,
        lastActive,
        engagementScore,
        enrolledAt: enrollment.enrolledAt
      }
    })

    // Sort by engagement score
    studentMetrics.sort((a, b) => b.engagementScore - a.engagementScore)

    // Activity timeline (messages per day for last 30 days)
    const activityTimeline: { date: string; messageCount: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      const count = course.chatMessages.filter(m =>
        m.createdAt.toISOString().split('T')[0] === dateStr
      ).length
      activityTimeline.push({ date: dateStr, messageCount: count })
    }

    // Peak activity hours (0-23)
    const hourlyActivity = new Array(24).fill(0)
    course.chatMessages.forEach(m => {
      const hour = m.createdAt.getHours()
      hourlyActivity[hour]++
    })
    const peakHours = hourlyActivity
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Analyze common questions
    const questionAnalysis = analyzeCommonQuestions(course.chatMessages)

    // Response rate (messages with responses)
    const messagesWithResponses = course.chatMessages.filter(m => m.response).length
    const responseRate = totalMessages > 0
      ? Math.round((messagesWithResponses / totalMessages) * 100)
      : 0

    // Average response length
    const avgResponseLength = messagesWithResponses > 0
      ? Math.round(
          course.chatMessages
            .filter(m => m.response)
            .reduce((sum, m) => sum + (m.response?.length || 0), 0) / messagesWithResponses
        )
      : 0

    const analyticsData = {
      course: {
        id: course.id,
        name: course.name,
        code: course.code,
        instructor: course.instructor.name || course.instructor.email,
        createdAt: course.createdAt
      },
      summary: {
        totalStudents,
        totalMessages,
        uniqueActiveStudents,
        participationRate: totalStudents > 0
          ? Math.round((uniqueActiveStudents / totalStudents) * 100)
          : 0,
        messagesLast30Days: recentMessages.length,
        messagesLast7Days: weekMessages.length,
        avgMessagesPerStudent: totalStudents > 0
          ? Math.round((totalMessages / totalStudents) * 10) / 10
          : 0,
        responseRate,
        avgResponseLength
      },
      studentMetrics,
      activityTimeline,
      peakActivityHours: peakHours,
      commonQuestions: questionAnalysis.commonQuestions,
      topKeywords: questionAnalysis.topKeywords,
      engagementDistribution: {
        high: studentMetrics.filter(s => s.engagementScore >= 70).length,
        medium: studentMetrics.filter(s => s.engagementScore >= 40 && s.engagementScore < 70).length,
        low: studentMetrics.filter(s => s.engagementScore < 40).length
      }
    }

    // Return CSV format if requested
    if (format === 'csv') {
      const csv = generateCSV(analyticsData)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${course.code}-${now.toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Return JSON format (default)
    return NextResponse.json(analyticsData)

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to generate analytics' },
      { status: 500 }
    )
  }
}

// Helper function to generate CSV export
function generateCSV(data: any): string {
  const lines: string[] = []

  // Course summary
  lines.push('COURSE ANALYTICS REPORT')
  lines.push('')
  lines.push('Course Information')
  lines.push(`Course Name,${data.course.name}`)
  lines.push(`Course Code,${data.course.code}`)
  lines.push(`Instructor,${data.course.instructor}`)
  lines.push(`Report Generated,${new Date().toISOString()}`)
  lines.push('')

  // Summary metrics
  lines.push('Summary Metrics')
  lines.push('Metric,Value')
  lines.push(`Total Students,${data.summary.totalStudents}`)
  lines.push(`Total Messages,${data.summary.totalMessages}`)
  lines.push(`Active Students,${data.summary.uniqueActiveStudents}`)
  lines.push(`Participation Rate,${data.summary.participationRate}%`)
  lines.push(`Messages (Last 30 Days),${data.summary.messagesLast30Days}`)
  lines.push(`Messages (Last 7 Days),${data.summary.messagesLast7Days}`)
  lines.push(`Avg Messages per Student,${data.summary.avgMessagesPerStudent}`)
  lines.push(`Response Rate,${data.summary.responseRate}%`)
  lines.push(`Avg Response Length,${data.summary.avgResponseLength}`)
  lines.push('')

  // Student engagement
  lines.push('Student Engagement Metrics')
  lines.push('Student Name,Email,Messages,Avg Message Length,Days Active,Engagement Score,Last Active')
  data.studentMetrics.forEach((student: any) => {
    lines.push(
      `"${student.studentName}",${student.studentEmail},${student.messageCount},${student.avgMessageLength},${student.daysActive},${student.engagementScore},${student.lastActive || 'Never'}`
    )
  })
  lines.push('')

  // Activity timeline
  lines.push('Activity Timeline (Last 30 Days)')
  lines.push('Date,Message Count')
  data.activityTimeline.forEach((day: any) => {
    lines.push(`${day.date},${day.messageCount}`)
  })
  lines.push('')

  // Common questions
  lines.push('Common Questions')
  lines.push('Question,Frequency')
  data.commonQuestions.forEach((q: any) => {
    lines.push(`"${q.text.replace(/"/g, '""')}",${q.count}`)
  })
  lines.push('')

  // Top keywords
  lines.push('Top Keywords')
  lines.push('Keyword,Frequency')
  data.topKeywords.forEach((k: any) => {
    lines.push(`${k.keyword},${k.count}`)
  })
  lines.push('')

  // Engagement distribution
  lines.push('Engagement Distribution')
  lines.push('Level,Student Count')
  lines.push(`High (70-100),${data.engagementDistribution.high}`)
  lines.push(`Medium (40-69),${data.engagementDistribution.medium}`)
  lines.push(`Low (0-39),${data.engagementDistribution.low}`)

  return lines.join('\n')
}

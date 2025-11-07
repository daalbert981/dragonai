// Global type definitions for Dragon AI

export type UserRole = 'STUDENT' | 'ADMIN' | 'SUPERADMIN'

export interface User {
  id: string
  name: string | null
  email: string
  emailVerified: Date | null
  image: string | null
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

// Course types
export interface Course {
  id: string
  name: string
  description: string | null
  code: string
  instructorId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Analytics types
export interface StudentEngagementMetric {
  studentId: string
  studentName: string
  studentEmail: string
  messageCount: number
  avgMessageLength: number
  daysActive: number
  lastActive: Date | null
  engagementScore: number
  enrolledAt: Date
}

export interface ActivityDataPoint {
  date: string
  messageCount: number
}

export interface PeakActivityHour {
  hour: number
  count: number
}

export interface CommonQuestion {
  text: string
  count: number
  keywords: string[]
}

export interface TopKeyword {
  keyword: string
  count: number
}

export interface EngagementDistribution {
  high: number
  medium: number
  low: number
}

export interface CourseAnalytics {
  course: {
    id: string
    name: string
    code: string
    instructor: string
    createdAt: Date
  }
  summary: {
    totalStudents: number
    totalMessages: number
    uniqueActiveStudents: number
    participationRate: number
    messagesLast30Days: number
    messagesLast7Days: number
    avgMessagesPerStudent: number
    responseRate: number
    avgResponseLength: number
  }
  studentMetrics: StudentEngagementMetric[]
  activityTimeline: ActivityDataPoint[]
  peakActivityHours: PeakActivityHour[]
  commonQuestions: CommonQuestion[]
  topKeywords: TopKeyword[]
  engagementDistribution: EngagementDistribution
}

// Add more type definitions as the project grows

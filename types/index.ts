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

export interface Course {
  id: string
  title: string
  description: string | null
  code: string
  semester: string | null
  year: number | null
  isActive: boolean
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export interface Enrollment {
  id: string
  studentId: string
  courseId: string
  enrolledAt: Date
}

export interface CourseWithEnrollment extends Course {
  enrolledAt: Date
}

// Add more type definitions as the project grows

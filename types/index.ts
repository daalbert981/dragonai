// Global type definitions for Dragon AI
import { z } from 'zod'
import type { UserRole, CourseRole, MessageRole, UploadStatus } from '@prisma/client'

// Re-export Prisma types
export type { UserRole, CourseRole, MessageRole, UploadStatus }

// NextAuth type extensions
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      role: UserRole
      image?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name: string | null
    role: UserRole
    image?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
  }
}

// Database models as TypeScript interfaces
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
  name: string
  code: string
  description: string | null
  instructorId: string
  systemPrompt: string
  modelConfig: any // JSON
  syllabusInfo: string | null
  timezone: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CourseEnrollment {
  id: string
  userId: string
  courseId: string
  role: CourseRole
  enrolledAt: Date
  user?: User
  course?: Course
}

export interface CourseMaterial {
  id: string
  courseId: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  instructorDescription: string
  aiGeneratedSummary: string | null
  isProcessed: boolean
  uploadedAt: Date
  course?: Course
}

export interface ChatSession {
  id: string
  userId: string
  courseId: string
  title: string | null
  createdAt: Date
  updatedAt: Date
  user?: User
  course?: Course
  messages?: ChatMessage[]
}

export interface ChatMessage {
  id: string
  sessionId: string
  userId: string
  role: MessageRole
  content: string
  metadata?: any // JSON
  isStreaming: boolean
  error: string | null
  tokenCount: number | null
  createdAt: Date
  updatedAt: Date
  session?: ChatSession
  user?: User
  fileUploads?: FileUpload[]
}

export interface FileUpload {
  id: string
  messageId: string
  userId: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  status: UploadStatus
  uploadedAt: Date
  message?: ChatMessage
  user?: User
}

export interface ClassSchedule {
  id: string
  courseId: string
  title: string
  description: string | null
  sessionDate: Date
  sessionType: 'UPCOMING' | 'PAST' | 'CANCELLED'
  createdAt: Date
  updatedAt: Date
  course?: Course
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ChatMessageRequest {
  content: string
  sessionId?: string
  fileIds?: string[]
}

export interface ChatMessageResponse {
  message: ChatMessage
  sessionId: string
}

export interface FileUploadResponse {
  fileUpload: FileUpload
  uploadUrl?: string // Pre-signed URL for direct upload
}

export interface StreamChunk {
  delta: string
  done: boolean
  error?: string
}

// Client-side message state (for optimistic updates)
export interface ClientMessage extends Omit<ChatMessage, 'id' | 'createdAt' | 'updatedAt'> {
  id: string
  createdAt: Date
  updatedAt: Date
  isOptimistic?: boolean // Flag for optimistic messages
  retryCount?: number // For retry logic
}

// File upload progress tracking
export interface UploadProgress {
  fileId: string
  filename: string
  progress: number // 0-100
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

// Zod validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

// Password strength levels
export enum PasswordStrength {
  WEAK = 'weak',
  FAIR = 'fair',
  GOOD = 'good',
  STRONG = 'strong',
}

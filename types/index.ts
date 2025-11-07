// Global type definitions for Dragon AI

export type UserRole = 'STUDENT' | 'ADMIN' | 'SUPERADMIN'
export type CourseRole = 'STUDENT' | 'TA' | 'INSTRUCTOR'
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM'
export type UploadStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

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

export interface ChatSession {
  id: string
  userId: string
  courseId: string
  title: string | null
  createdAt: Date
  updatedAt: Date
  user?: User
  course?: Course
  messages?: Message[]
}

export interface Message {
  id: string
  sessionId: string
  userId: string
  role: MessageRole
  content: string
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
  message?: Message
  user?: User
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
  message: Message
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
export interface ClientMessage extends Omit<Message, 'id' | 'createdAt' | 'updatedAt'> {
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

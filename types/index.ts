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

// Add more type definitions as the project grows

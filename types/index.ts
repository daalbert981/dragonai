// Global type definitions for Dragon AI
import { z } from 'zod'
import { UserRole } from '@prisma/client'

export type { UserRole }

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

// Add more type definitions as the project grows

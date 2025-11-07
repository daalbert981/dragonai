/**
 * Security Utilities
 *
 * Provides security-related functions including:
 * - Input sanitization
 * - Access control validation
 * - Content Security Policy helpers
 */

import { prisma } from '@/lib/prisma'
import { CourseRole } from '@/types'

/**
 * Sanitize user input to prevent XSS attacks
 *
 * @param input - User input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Sanitize HTML content while preserving safe formatting
 *
 * @param html - HTML string
 * @returns Sanitized HTML with only safe tags
 */
export function sanitizeHtml(html: string): string {
  // Allow only safe tags for formatting
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li']

  let sanitized = html

  // Remove all script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove potentially dangerous attributes
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '')
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, '')

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '')

  return sanitized
}

/**
 * Validate user has access to a specific course
 *
 * @param userId - User ID
 * @param courseId - Course ID
 * @param requiredRole - Minimum required role (optional)
 * @returns True if user has access, false otherwise
 */
export async function validateCourseAccess(
  userId: string,
  courseId: string,
  requiredRole?: CourseRole
): Promise<boolean> {
  try {
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      include: {
        course: true
      }
    })

    if (!enrollment) {
      return false
    }

    // Check if course is active
    if (!enrollment.course.isActive) {
      return false
    }

    // If no specific role required, any enrollment is sufficient
    if (!requiredRole) {
      return true
    }

    // Check role hierarchy: INSTRUCTOR > TA > STUDENT
    const roleHierarchy: Record<CourseRole, number> = {
      STUDENT: 1,
      TA: 2,
      INSTRUCTOR: 3
    }

    return roleHierarchy[enrollment.role] >= roleHierarchy[requiredRole]
  } catch (error) {
    console.error('Error validating course access:', error)
    return false
  }
}

/**
 * Get user's course enrollment details
 *
 * @param userId - User ID
 * @param courseId - Course ID
 * @returns Enrollment details or null
 */
export async function getCourseEnrollment(userId: string, courseId: string) {
  try {
    return await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      include: {
        course: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })
  } catch (error) {
    console.error('Error getting course enrollment:', error)
    return null
  }
}

/**
 * Validate that a chat session belongs to a user
 *
 * @param sessionId - Chat session ID
 * @param userId - User ID
 * @returns True if session belongs to user
 */
export async function validateSessionOwnership(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true }
    })

    return session?.userId === userId
  } catch (error) {
    console.error('Error validating session ownership:', error)
    return false
  }
}

/**
 * Validate that a message belongs to a user
 *
 * @param messageId - Message ID
 * @param userId - User ID
 * @returns True if message belongs to user
 */
export async function validateMessageOwnership(
  messageId: string,
  userId: string
): Promise<boolean> {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { userId: true }
    })

    return message?.userId === userId
  } catch (error) {
    console.error('Error validating message ownership:', error)
    return false
  }
}

/**
 * Generate a cryptographically secure random token
 *
 * @param length - Token length in bytes (default: 32)
 * @returns Hex-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash sensitive data (one-way)
 *
 * @param data - Data to hash
 * @returns Hashed data as hex string
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Content Security Policy (CSP) headers for enhanced security
 */
export const CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openai.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}

/**
 * Extract user ID from request headers or session
 * This is a placeholder - implement based on your auth strategy
 *
 * @param request - Request object
 * @returns User ID or null
 */
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  try {
    // TODO: Implement based on your NextAuth.js configuration
    // This is a placeholder implementation
    // You would typically get this from the session:
    // const session = await getServerSession()
    // return session?.user?.id ?? null

    // For now, we'll extract from a custom header (update this)
    const userId = request.headers.get('x-user-id')
    return userId
  } catch (error) {
    console.error('Error extracting user ID:', error)
    return null
  }
}

/**
 * Validate and parse JSON safely
 *
 * @param json - JSON string
 * @returns Parsed object or null if invalid
 */
export function safeJsonParse<T = any>(json: string): T | null {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * Truncate string to prevent log injection or overflow
 *
 * @param str - String to truncate
 * @param maxLength - Maximum length (default: 1000)
 * @returns Truncated string
 */
export function truncateString(str: string, maxLength: number = 1000): string {
  if (str.length <= maxLength) {
    return str
  }
  return str.substring(0, maxLength) + '...'
}

/**
 * Check if a string contains only alphanumeric characters and safe symbols
 *
 * @param str - String to validate
 * @returns True if string is safe
 */
export function isAlphanumericSafe(str: string): boolean {
  return /^[a-zA-Z0-9_\-. ]+$/.test(str)
}

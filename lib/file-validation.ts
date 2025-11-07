/**
 * File Validation and Sanitization Utilities
 *
 * Provides comprehensive file validation including:
 * - File size limits
 * - MIME type validation
 * - Extension whitelist
 * - Content validation
 * - Malicious file detection
 */

import { ReadableStream } from 'stream/web'

/**
 * Maximum file sizes by category (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  // Images: 5MB
  IMAGE: 5 * 1024 * 1024,

  // Documents: 10MB
  DOCUMENT: 10 * 1024 * 1024,

  // Code files: 1MB
  CODE: 1024 * 1024,

  // General: 10MB
  DEFAULT: 10 * 1024 * 1024
} as const

/**
 * Allowed MIME types by category
 */
export const ALLOWED_MIME_TYPES = {
  IMAGE: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],

  DOCUMENT: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain',
    'text/csv',
    'application/json',
    'text/markdown'
  ],

  CODE: [
    'text/plain',
    'text/javascript',
    'application/javascript',
    'text/typescript',
    'text/x-python',
    'text/x-java',
    'text/x-c',
    'text/x-c++',
    'text/html',
    'text/css',
    'application/json',
    'text/markdown'
  ]
} as const

/**
 * File extension to MIME type mapping for validation
 */
const EXTENSION_TO_MIME: Record<string, string[]> = {
  // Images
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.svg': ['image/svg+xml'],

  // Documents
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.txt': ['text/plain'],
  '.csv': ['text/csv'],
  '.json': ['application/json'],
  '.md': ['text/markdown', 'text/plain'],

  // Code
  '.js': ['text/javascript', 'application/javascript'],
  '.ts': ['text/typescript', 'text/plain'],
  '.jsx': ['text/javascript', 'application/javascript'],
  '.tsx': ['text/typescript', 'text/plain'],
  '.py': ['text/x-python', 'text/plain'],
  '.java': ['text/x-java', 'text/plain'],
  '.c': ['text/x-c', 'text/plain'],
  '.cpp': ['text/x-c++', 'text/plain'],
  '.html': ['text/html'],
  '.css': ['text/css']
}

/**
 * Dangerous file extensions that should always be blocked
 */
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.jar',
  '.app', '.deb', '.rpm', '.dmg', '.pkg', '.msi',
  '.scr', '.com', '.pif', '.application', '.gadget',
  '.dll', '.so', '.dylib'
]

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean
  error?: string
  sanitizedFilename?: string
  detectedMimeType?: string
}

/**
 * Sanitize filename to prevent directory traversal and other attacks
 *
 * @param filename - Original filename
 * @returns Sanitized filename safe for storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove any directory path components
  let sanitized = filename.replace(/^.*[\\\/]/, '')

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Replace potentially dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_')

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '')

  // Ensure the filename isn't empty
  if (!sanitized) {
    sanitized = 'unnamed_file'
  }

  // Limit filename length (preserve extension)
  const maxLength = 255
  if (sanitized.length > maxLength) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'))
    const name = sanitized.substring(0, maxLength - ext.length)
    sanitized = name + ext
  }

  return sanitized
}

/**
 * Validate file extension against whitelist
 *
 * @param filename - File name to validate
 * @returns True if extension is allowed
 */
export function validateExtension(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))

  // Block dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return false
  }

  // Check if extension is in whitelist
  return Object.keys(EXTENSION_TO_MIME).includes(ext)
}

/**
 * Validate MIME type and extension match
 *
 * @param filename - File name
 * @param mimeType - Detected MIME type
 * @returns True if MIME type matches extension
 */
export function validateMimeType(filename: string, mimeType: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  const allowedMimes = EXTENSION_TO_MIME[ext]

  if (!allowedMimes) {
    return false
  }

  // Check if the provided MIME type is in the allowed list for this extension
  return allowedMimes.some(allowed =>
    mimeType.toLowerCase().includes(allowed.toLowerCase())
  )
}

/**
 * Validate file size
 *
 * @param size - File size in bytes
 * @param filename - File name (used to determine category)
 * @returns True if size is within limits
 */
export function validateFileSize(size: number, filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))

  // Determine size limit based on file type
  let limit = FILE_SIZE_LIMITS.DEFAULT

  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
    limit = FILE_SIZE_LIMITS.IMAGE
  } else if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp'].includes(ext)) {
    limit = FILE_SIZE_LIMITS.CODE
  } else {
    limit = FILE_SIZE_LIMITS.DOCUMENT
  }

  return size <= limit
}

/**
 * Check file content for malicious patterns
 * This performs basic checks - for production, consider using a dedicated
 * antivirus/malware scanning service
 *
 * @param content - File content as string or buffer
 * @returns True if content appears safe
 */
export function scanFileContent(content: string | Buffer): boolean {
  const contentStr = typeof content === 'string' ? content : content.toString('utf-8', 0, Math.min(content.length, 10000))

  // Check for common malicious patterns
  const maliciousPatterns = [
    /<script[\s\S]*?>/i, // Script tags (for HTML/SVG)
    /javascript:/i, // JavaScript protocol
    /on\w+\s*=/i, // Event handlers (onclick, onerror, etc.)
    /eval\s*\(/i, // eval calls
    /exec\s*\(/i, // exec calls
    /<iframe/i, // iframes
    /<object/i, // object tags
    /<embed/i // embed tags
  ]

  return !maliciousPatterns.some(pattern => pattern.test(contentStr))
}

/**
 * Comprehensive file validation
 *
 * @param file - File object to validate
 * @returns Validation result with error details if invalid
 */
export async function validateFile(file: File): Promise<FileValidationResult> {
  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(file.name)

  // Validate extension
  if (!validateExtension(sanitizedFilename)) {
    return {
      valid: false,
      error: 'File type not allowed. Please upload images, documents, or code files only.'
    }
  }

  // Validate file size
  if (!validateFileSize(file.size, sanitizedFilename)) {
    const maxSizeMB = Math.floor(FILE_SIZE_LIMITS.DEFAULT / (1024 * 1024))
    return {
      valid: false,
      error: `File size exceeds the maximum limit of ${maxSizeMB}MB.`
    }
  }

  // Validate MIME type matches extension
  if (!validateMimeType(sanitizedFilename, file.type)) {
    return {
      valid: false,
      error: 'File type does not match its extension. This may indicate a security risk.',
      sanitizedFilename
    }
  }

  // For text-based files, scan content
  const textExtensions = ['.txt', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.html', '.css', '.json', '.md', '.csv']
  const ext = sanitizedFilename.toLowerCase().substring(sanitizedFilename.lastIndexOf('.'))

  if (textExtensions.includes(ext)) {
    try {
      const content = await file.text()
      if (!scanFileContent(content)) {
        return {
          valid: false,
          error: 'File contains potentially malicious content.',
          sanitizedFilename
        }
      }
    } catch (error) {
      // If we can't read the file, it's suspicious
      return {
        valid: false,
        error: 'Unable to validate file content.',
        sanitizedFilename
      }
    }
  }

  return {
    valid: true,
    sanitizedFilename,
    detectedMimeType: file.type
  }
}

/**
 * Get a safe unique filename with timestamp
 *
 * @param originalFilename - Original filename
 * @param userId - User ID for namespacing
 * @returns Unique filename with timestamp
 */
export function generateUniqueFilename(originalFilename: string, userId: string): string {
  const sanitized = sanitizeFilename(originalFilename)
  const ext = sanitized.substring(sanitized.lastIndexOf('.'))
  const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'))
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)

  return `${userId}_${nameWithoutExt}_${timestamp}_${randomStr}${ext}`
}

/**
 * Format file size for display
 *
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

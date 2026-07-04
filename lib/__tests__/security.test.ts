import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    courseEnrollment: { findUnique: vi.fn() },
    chatSession: { findUnique: vi.fn() },
    chatMessage: { findUnique: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  sanitizeInput,
  sanitizeHtml,
  generateSecureToken,
  constantTimeEqual,
  getClientIp,
  truncateString,
  isAlphanumericSafe,
  safeJsonParse,
  validateCourseAccess,
  validateSessionOwnership,
} from '@/lib/security'

describe('sanitizeInput', () => {
  it('strips angle brackets, javascript: protocol, and event handlers', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).not.toContain('<')
    expect(sanitizeInput('javascript:alert(1)')).not.toMatch(/javascript:/i)
    expect(sanitizeInput('x onclick=steal()')).not.toMatch(/on\w+=/i)
  })

  it('preserves normal text', () => {
    expect(sanitizeInput('  What is the syllabus policy?  ')).toBe('What is the syllabus policy?')
  })
})

describe('sanitizeHtml', () => {
  it('removes script tags and their content', () => {
    expect(sanitizeHtml('<p>hi</p><script>evil()</script>')).toBe('<p>hi</p>')
  })

  it('removes inline event handlers and javascript: urls', () => {
    expect(sanitizeHtml('<p onclick="evil()">x</p>')).not.toContain('onclick')
    expect(sanitizeHtml('<a href="javascript:evil()">x</a>')).not.toMatch(/javascript:/i)
  })
})

describe('generateSecureToken', () => {
  it('produces hex tokens of the requested byte length', () => {
    const token = generateSecureToken(16)
    expect(token).toMatch(/^[0-9a-f]{32}$/)
    expect(generateSecureToken()).toHaveLength(64)
  })

  it('produces unique tokens', () => {
    expect(generateSecureToken()).not.toBe(generateSecureToken())
  })
})

describe('constantTimeEqual', () => {
  it('compares strings correctly', () => {
    expect(constantTimeEqual('secret-key', 'secret-key')).toBe(true)
    expect(constantTimeEqual('secret-key', 'secret-kez')).toBe(false)
    expect(constantTimeEqual('short', 'longer-string')).toBe(false)
  })
})

describe('getClientIp', () => {
  it('takes the first x-forwarded-for entry', () => {
    const req = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip, then unknown', () => {
    expect(getClientIp(new Request('http://x', { headers: { 'x-real-ip': '9.9.9.9' } }))).toBe('9.9.9.9')
    expect(getClientIp(new Request('http://x'))).toBe('unknown')
  })
})

describe('small helpers', () => {
  it('truncateString caps length with ellipsis', () => {
    expect(truncateString('abcdef', 3)).toBe('abc...')
    expect(truncateString('abc', 10)).toBe('abc')
  })

  it('isAlphanumericSafe accepts safe names and rejects injection characters', () => {
    expect(isAlphanumericSafe('notes-week_1.pdf')).toBe(true)
    expect(isAlphanumericSafe('x; DROP TABLE')).toBe(false)
  })

  it('safeJsonParse returns null on invalid JSON', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 })
    expect(safeJsonParse('{oops')).toBeNull()
  })
})

describe('validateCourseAccess', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects non-numeric user ids without querying', async () => {
    expect(await validateCourseAccess('abc', 'course-1')).toBe(false)
    expect(prisma.courseEnrollment.findUnique).not.toHaveBeenCalled()
  })

  it('rejects when not enrolled', async () => {
    vi.mocked(prisma.courseEnrollment.findUnique).mockResolvedValue(null as any)
    expect(await validateCourseAccess('7', 'course-1')).toBe(false)
  })

  it('rejects when course is inactive', async () => {
    vi.mocked(prisma.courseEnrollment.findUnique).mockResolvedValue({ course: { isActive: false } } as any)
    expect(await validateCourseAccess('7', 'course-1')).toBe(false)
  })

  it('allows active enrollment', async () => {
    vi.mocked(prisma.courseEnrollment.findUnique).mockResolvedValue({ course: { isActive: true } } as any)
    expect(await validateCourseAccess('7', 'course-1')).toBe(true)
  })

  it('fails closed on database errors', async () => {
    vi.mocked(prisma.courseEnrollment.findUnique).mockRejectedValue(new Error('db down'))
    expect(await validateCourseAccess('7', 'course-1')).toBe(false)
  })
})

describe('validateSessionOwnership', () => {
  beforeEach(() => vi.clearAllMocks())

  it('matches only the owning user', async () => {
    vi.mocked(prisma.chatSession.findUnique).mockResolvedValue({ userId: 7 } as any)
    expect(await validateSessionOwnership('s1', '7')).toBe(true)
    expect(await validateSessionOwnership('s1', '8')).toBe(false)
  })

  it('fails closed when the session does not exist', async () => {
    vi.mocked(prisma.chatSession.findUnique).mockResolvedValue(null as any)
    expect(await validateSessionOwnership('s1', '7')).toBe(false)
  })
})

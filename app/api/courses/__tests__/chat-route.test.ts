import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth-options', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    chatSession: { findUnique: vi.fn(), create: vi.fn() },
    chatMessage: { create: vi.fn() },
    fileUpload: { findMany: vi.fn(), updateMany: vi.fn() },
    course: { findUnique: vi.fn() },
  },
}))
vi.mock('@/lib/security', () => ({
  validateCourseAccess: vi.fn(),
  sanitizeInput: (s: string) => s,
}))
vi.mock('@/lib/rate-limit', () => ({
  rateLimiter: vi.fn(),
  RATE_LIMITS: { CHAT_MESSAGE: { maxRequests: 20, windowSeconds: 60 } },
}))

import { getServerSession } from 'next-auth'
import { validateCourseAccess } from '@/lib/security'
import { rateLimiter } from '@/lib/rate-limit'
import { POST } from '@/app/api/courses/[courseId]/chat/route'

function chatRequest(body: unknown = { content: 'hello' }) {
  return new NextRequest('http://localhost:5782/api/courses/c1/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const routeParams = { params: { courseId: 'c1' } }

describe('POST /api/courses/[courseId]/chat', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when there is no session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const res = await POST(chatRequest(), routeParams)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('returns 403 when the user is not enrolled in the course', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: '7' } } as any)
    vi.mocked(validateCourseAccess).mockResolvedValue(false)

    const res = await POST(chatRequest(), routeParams)
    expect(res.status).toBe(403)
  })

  it('returns 429 with rate-limit headers when over the limit', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: '7' } } as any)
    vi.mocked(validateCourseAccess).mockResolvedValue(true)
    vi.mocked(rateLimiter).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetIn: 42,
      limit: 20,
    })

    const res = await POST(chatRequest(), routeParams)
    expect(res.status).toBe(429)
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(res.headers.get('X-RateLimit-Reset')).toBe('42')
  })
})

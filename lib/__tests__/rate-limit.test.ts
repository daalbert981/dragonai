import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    rateLimitEntry: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { checkRateLimit, getRateLimitStatus, RATE_LIMITS } from '@/lib/rate-limit'

const config = { maxRequests: 3, windowSeconds: 60, identifier: 'user-1', endpoint: 'test' }

function upsertReturns(count: number, resetInMs = 60_000) {
  vi.mocked(prisma.$queryRaw).mockResolvedValue([
    { count, reset_time: new Date(Date.now() + resetInMs) },
  ] as any)
}

describe('checkRateLimit (Postgres-backed)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows requests under the limit and counts down remaining', async () => {
    upsertReturns(1)
    const first = await checkRateLimit(config)
    expect(first.allowed).toBe(true)
    expect(first.remaining).toBe(2)
    expect(first.limit).toBe(3)

    upsertReturns(2)
    const second = await checkRateLimit(config)
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(1)
  })

  it('blocks requests over the limit with zero remaining', async () => {
    upsertReturns(4, 42_000)
    const blocked = await checkRateLimit(config)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.resetIn).toBeGreaterThan(0)
    expect(blocked.resetIn).toBeLessThanOrEqual(60)
  })

  it('allows exactly maxRequests requests', async () => {
    upsertReturns(3)
    expect((await checkRateLimit(config)).allowed).toBe(true)
    upsertReturns(4)
    expect((await checkRateLimit(config)).allowed).toBe(false)
  })

  it('fails OPEN when the database is unreachable', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('connection refused'))
    const result = await checkRateLimit(config)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(config.maxRequests)
  })

  it('keys the upsert by identifier and endpoint', async () => {
    upsertReturns(1)
    await checkRateLimit(config)
    const call = vi.mocked(prisma.$queryRaw).mock.calls[0][0] as any
    expect(JSON.stringify(call.values ?? call)).toContain('user-1:test')
  })
})

describe('getRateLimitStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reports remaining without incrementing', async () => {
    vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue({
      key: 'user-3:status',
      count: 1,
      resetTime: new Date(Date.now() + 60_000),
    } as any)

    const status = await getRateLimitStatus('user-3', 'status', 5, 60)
    expect(status.remaining).toBe(4)
    expect(prisma.$queryRaw).not.toHaveBeenCalled()
  })

  it('treats a missing or expired entry as a fresh window', async () => {
    vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue(null as any)
    const fresh = await getRateLimitStatus('user-3', 'status', 5, 60)
    expect(fresh.allowed).toBe(true)
    expect(fresh.remaining).toBe(5)

    vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue({
      count: 5,
      resetTime: new Date(Date.now() - 1000),
    } as any)
    const expired = await getRateLimitStatus('user-3', 'status', 5, 60)
    expect(expired.allowed).toBe(true)
  })
})

describe('RATE_LIMITS presets', () => {
  it('defines the presets used across routes', () => {
    expect(RATE_LIMITS.CHAT_MESSAGE.maxRequests).toBeGreaterThan(0)
    expect(RATE_LIMITS.AUTH.windowSeconds).toBe(15 * 60)
    expect(RATE_LIMITS.FILE_UPLOAD.maxRequests).toBeGreaterThan(0)
  })
})

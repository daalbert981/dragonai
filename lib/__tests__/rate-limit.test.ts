import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { checkRateLimit, resetRateLimit, getRateLimitStatus, RATE_LIMITS } from '@/lib/rate-limit'

// These tests lock in the checkRateLimit contract before the storage backend
// is swapped from in-memory Map to Postgres (Phase 3).

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetRateLimit('user-1', 'test')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const config = { maxRequests: 3, windowSeconds: 60, identifier: 'user-1', endpoint: 'test' }

  it('allows requests under the limit and counts down remaining', async () => {
    const first = await checkRateLimit(config)
    expect(first.allowed).toBe(true)
    expect(first.remaining).toBe(2)
    expect(first.limit).toBe(3)

    const second = await checkRateLimit(config)
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(1)
  })

  it('blocks requests over the limit with zero remaining', async () => {
    await checkRateLimit(config)
    await checkRateLimit(config)
    await checkRateLimit(config)

    const blocked = await checkRateLimit(config)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.resetIn).toBeGreaterThan(0)
    expect(blocked.resetIn).toBeLessThanOrEqual(60)
  })

  it('resets the window after windowSeconds elapse', async () => {
    await checkRateLimit(config)
    await checkRateLimit(config)
    await checkRateLimit(config)
    expect((await checkRateLimit(config)).allowed).toBe(false)

    vi.advanceTimersByTime(61 * 1000)

    const afterReset = await checkRateLimit(config)
    expect(afterReset.allowed).toBe(true)
    expect(afterReset.remaining).toBe(2)
  })

  it('tracks identifiers and endpoints independently', async () => {
    await checkRateLimit(config)
    await checkRateLimit(config)
    await checkRateLimit(config)

    const otherUser = await checkRateLimit({ ...config, identifier: 'user-2' })
    expect(otherUser.allowed).toBe(true)

    const otherEndpoint = await checkRateLimit({ ...config, endpoint: 'other' })
    expect(otherEndpoint.allowed).toBe(true)

    resetRateLimit('user-2', 'test')
    resetRateLimit('user-1', 'other')
  })
})

describe('getRateLimitStatus', () => {
  it('reports status without consuming a request', async () => {
    resetRateLimit('user-3', 'status')
    await checkRateLimit({ maxRequests: 5, windowSeconds: 60, identifier: 'user-3', endpoint: 'status' })

    const status1 = getRateLimitStatus('user-3', 'status', 5, 60)
    const status2 = getRateLimitStatus('user-3', 'status', 5, 60)
    expect(status1.remaining).toBe(4)
    expect(status2.remaining).toBe(4)
    resetRateLimit('user-3', 'status')
  })
})

describe('RATE_LIMITS presets', () => {
  it('defines the presets used across routes', () => {
    expect(RATE_LIMITS.CHAT_MESSAGE.maxRequests).toBeGreaterThan(0)
    expect(RATE_LIMITS.AUTH.windowSeconds).toBe(15 * 60)
    expect(RATE_LIMITS.FILE_UPLOAD.maxRequests).toBeGreaterThan(0)
  })
})

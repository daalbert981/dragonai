/**
 * Rate Limiting Utility
 *
 * Sliding-window rate limiter backed by Postgres (rate_limit table) so
 * limits survive dyno restarts and apply across dynos. A single atomic
 * upsert per check handles new windows, expired windows, and increments.
 *
 * Fails OPEN: if the database is unreachable the request is allowed —
 * rate limiting must never take the app down.
 */

import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed within the window
   */
  maxRequests: number

  /**
   * Time window in seconds
   */
  windowSeconds: number

  /**
   * Unique identifier for the requester (e.g., userId, IP address)
   */
  identifier: string

  /**
   * Endpoint identifier (e.g., 'chat', 'upload')
   */
  endpoint: string
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean

  /**
   * Remaining requests in the current window
   */
  remaining: number

  /**
   * Time in seconds until the rate limit resets
   */
  resetIn: number

  /**
   * Total limit for this endpoint
   */
  limit: number
}

/**
 * Check if a request should be rate limited
 *
 * @param config - Rate limit configuration
 * @returns Rate limit result with status and metadata
 *
 * @example
 * ```typescript
 * const result = await checkRateLimit({
 *   maxRequests: 10,
 *   windowSeconds: 60,
 *   identifier: userId,
 *   endpoint: 'chat'
 * })
 *
 * if (!result.allowed) {
 *   return new Response('Too many requests', { status: 429 })
 * }
 * ```
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const { maxRequests, windowSeconds, identifier, endpoint } = config
  const key = `${identifier}:${endpoint}`

  try {
    // Atomic: insert a fresh window, or — if the key exists — either
    // increment within the live window or start a new one if expired.
    // reset_time is a naive TIMESTAMP that Prisma interprets as UTC, so all
    // SQL arithmetic must be pinned to UTC too (server TZ must not matter)
    const rows = await prisma.$queryRaw<Array<{ count: number; reset_time: Date }>>(
      Prisma.sql`
        INSERT INTO "rate_limit" ("id", "key", "count", "reset_time")
        VALUES (${randomUUID()}, ${key}, 1, (now() AT TIME ZONE 'UTC') + make_interval(secs => ${windowSeconds}))
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE
            WHEN "rate_limit"."reset_time" <= (now() AT TIME ZONE 'UTC') THEN 1
            ELSE "rate_limit"."count" + 1
          END,
          "reset_time" = CASE
            WHEN "rate_limit"."reset_time" <= (now() AT TIME ZONE 'UTC') THEN EXCLUDED."reset_time"
            ELSE "rate_limit"."reset_time"
          END
        RETURNING "count", "reset_time"
      `
    )

    const { count, reset_time } = rows[0]
    const resetIn = Math.max(1, Math.ceil((reset_time.getTime() - Date.now()) / 1000))

    // Opportunistically clean up expired rows (~1% of checks)
    if (Math.random() < 0.01) {
      prisma.rateLimitEntry
        .deleteMany({ where: { resetTime: { lt: new Date() } } })
        .catch(() => {})
    }

    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetIn,
      limit: maxRequests,
    }
  } catch (error) {
    console.error('[RATE-LIMIT] Check failed, failing open:', error)
    return {
      allowed: true,
      remaining: maxRequests,
      resetIn: windowSeconds,
      limit: maxRequests,
    }
  }
}

/**
 * Reset rate limit for a specific identifier and endpoint
 * Useful for testing or manual intervention
 *
 * @param identifier - User or client identifier
 * @param endpoint - Endpoint identifier
 */
export async function resetRateLimit(identifier: string, endpoint: string): Promise<void> {
  const key = `${identifier}:${endpoint}`
  try {
    await prisma.rateLimitEntry.deleteMany({ where: { key } })
  } catch (error) {
    console.error('[RATE-LIMIT] Reset failed:', error)
  }
}

/**
 * Get current rate limit status without incrementing the counter
 *
 * @param identifier - User or client identifier
 * @param endpoint - Endpoint identifier
 * @param maxRequests - Maximum requests allowed
 * @param windowSeconds - Time window in seconds
 * @returns Current rate limit status
 */
export async function getRateLimitStatus(
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const key = `${identifier}:${endpoint}`

  try {
    const entry = await prisma.rateLimitEntry.findUnique({ where: { key } })
    const now = Date.now()

    if (!entry || entry.resetTime.getTime() <= now) {
      return {
        allowed: true,
        remaining: maxRequests,
        resetIn: windowSeconds,
        limit: maxRequests,
      }
    }

    const resetIn = Math.ceil((entry.resetTime.getTime() - now) / 1000)
    const remaining = Math.max(0, maxRequests - entry.count)

    return {
      allowed: entry.count < maxRequests,
      remaining,
      resetIn,
      limit: maxRequests,
    }
  } catch (error) {
    console.error('[RATE-LIMIT] Status check failed, failing open:', error)
    return {
      allowed: true,
      remaining: maxRequests,
      resetIn: windowSeconds,
      limit: maxRequests,
    }
  }
}

/**
 * Middleware-style rate limiter for Next.js API routes
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const userId = await getUserId(request)
 *
 *   const rateLimit = await rateLimiter(userId, 'chat', {
 *     maxRequests: 20,
 *     windowSeconds: 60
 *   })
 *
 *   if (!rateLimit.allowed) {
 *     return NextResponse.json(
 *       { error: 'Too many requests' },
 *       {
 *         status: 429,
 *         headers: {
 *           'X-RateLimit-Limit': rateLimit.limit.toString(),
 *           'X-RateLimit-Remaining': rateLimit.remaining.toString(),
 *           'X-RateLimit-Reset': rateLimit.resetIn.toString()
 *         }
 *       }
 *     )
 *   }
 *
 *   // Process request...
 * }
 * ```
 */
export async function rateLimiter(
  identifier: string,
  endpoint: string,
  config: Omit<RateLimitConfig, 'identifier' | 'endpoint'>
): Promise<RateLimitResult> {
  return checkRateLimit({
    ...config,
    identifier,
    endpoint
  })
}

/**
 * Preset rate limit configurations for common use cases
 */
export const RATE_LIMITS = {
  // Chat message sending: 20 messages per minute
  CHAT_MESSAGE: {
    maxRequests: 20,
    windowSeconds: 60
  },

  // File upload: 5 uploads per minute
  FILE_UPLOAD: {
    maxRequests: 5,
    windowSeconds: 60
  },

  // API calls: 100 requests per minute
  API_GENERAL: {
    maxRequests: 100,
    windowSeconds: 60
  },

  // Authentication: 5 attempts per 15 minutes
  AUTH: {
    maxRequests: 5,
    windowSeconds: 15 * 60
  },

  // Public registration: 5 attempts per 15 minutes per IP
  REGISTRATION: {
    maxRequests: 5,
    windowSeconds: 15 * 60
  },

  // Authenticated course enrollment with token: 10 attempts per 15 minutes
  TOKEN_ENROLL: {
    maxRequests: 10,
    windowSeconds: 15 * 60
  }
} as const

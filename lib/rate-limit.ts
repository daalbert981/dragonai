/**
 * Rate Limiting Utility
 *
 * Implements a sliding window rate limiter to prevent API abuse.
 * Uses an in-memory Map for simplicity. For production at scale,
 * consider using Redis for distributed rate limiting.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// Key format: "identifier:endpoint"
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 10 * 60 * 1000)

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
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  // Get or create entry
  let entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired one
    entry = {
      count: 1,
      resetTime: now + windowMs
    }
    rateLimitStore.set(key, entry)

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetIn: windowSeconds,
      limit: maxRequests
    }
  }

  // Check if limit is exceeded
  if (entry.count >= maxRequests) {
    const resetIn = Math.ceil((entry.resetTime - now) / 1000)

    return {
      allowed: false,
      remaining: 0,
      resetIn,
      limit: maxRequests
    }
  }

  // Increment count
  entry.count++
  const resetIn = Math.ceil((entry.resetTime - now) / 1000)

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetIn,
    limit: maxRequests
  }
}

/**
 * Reset rate limit for a specific identifier and endpoint
 * Useful for testing or manual intervention
 *
 * @param identifier - User or client identifier
 * @param endpoint - Endpoint identifier
 */
export function resetRateLimit(identifier: string, endpoint: string): void {
  const key = `${identifier}:${endpoint}`
  rateLimitStore.delete(key)
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
export function getRateLimitStatus(
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowSeconds: number
): RateLimitResult {
  const key = `${identifier}:${endpoint}`
  const entry = rateLimitStore.get(key)
  const now = Date.now()

  if (!entry || entry.resetTime < now) {
    return {
      allowed: true,
      remaining: maxRequests,
      resetIn: windowSeconds,
      limit: maxRequests
    }
  }

  const resetIn = Math.ceil((entry.resetTime - now) / 1000)
  const remaining = Math.max(0, maxRequests - entry.count)

  return {
    allowed: entry.count < maxRequests,
    remaining,
    resetIn,
    limit: maxRequests
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
  }
} as const

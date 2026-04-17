// /lib/rateLimit.ts
// Migrated from express-rate-limit for Next.js using lru-cache

import { LRUCache } from 'lru-cache'

type Options = { uniqueTokenPerInterval?: number; interval?: number }

export function rateLimit(options: Options) {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000
  })

  return {
    check: (limit: number, token: string) => {
      const tokenCount = (tokenCache.get(token) as number[]) || [0]
      if (tokenCount[0] === 0) tokenCache.set(token, tokenCount)
      tokenCount[0] += 1
      const currentUsage = tokenCount[0]
      const isRateLimited = currentUsage >= limit
      return { isRateLimited, currentUsage }
    }
  }
}

// ─── Rate limiters for different route types ──────────────────────────────

// Global limit (all routes)
export const globalLimiter = rateLimit({
  uniqueTokenPerInterval: 500,
  interval: 15 * 60 * 1000
})

// Contact form limit
export const contactLimiter = rateLimit({
  uniqueTokenPerInterval: 100,
  interval: 60 * 60 * 1000
})

// Booking limit
export const bookingLimiter = rateLimit({
  uniqueTokenPerInterval: 100,
  interval: 60 * 60 * 1000
})

// Admin limit (higher limit for internal operations)
export const adminLimiter = rateLimit({
  uniqueTokenPerInterval: 500,
  interval: 15 * 60 * 1000
})

// Helper to get client IP for rate limiting
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  return ip.trim()
}

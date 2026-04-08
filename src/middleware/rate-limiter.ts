// @mostajs/cloud-middleware — Rate limiter
// Author: Dr Hamid MADANI drmdh@msn.com

interface RateEntry {
  count: number
  resetAt: number
}

export class RateLimiter {
  private store = new Map<string, RateEntry>()
  private windowMs: number
  private maxRequests: number

  constructor(opts: { windowMs?: number; maxRequests?: number } = {}) {
    this.windowMs = opts.windowMs ?? 60_000  // 1 minute
    this.maxRequests = opts.maxRequests ?? 100
  }

  check(key: string, limit?: number): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now()
    const max = limit ?? this.maxRequests
    let entry = this.store.get(key)

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs }
      this.store.set(key, entry)
    }

    entry.count++
    const allowed = entry.count <= max
    const remaining = Math.max(0, max - entry.count)

    return { allowed, remaining, resetAt: entry.resetAt }
  }

  reset(key: string): void {
    this.store.delete(key)
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now >= entry.resetAt) this.store.delete(key)
    }
  }

  get size(): number { return this.store.size }
}

interface CacheEntry<TValue> {
  value: TValue
  createdAt: number
  expiresAt: number
}

class MemoryQueryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>()

  get<TValue>(key: string): TValue | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return undefined
    }

    return entry.value as TValue
  }

  set<TValue>(key: string, value: TValue, ttlMs: number): void {
    const now = Date.now()
    this.store.set(key, {
      value,
      createdAt: now,
      expiresAt: now + Math.max(0, ttlMs),
    })
  }

  invalidate(key: string): void {
    this.store.delete(key)
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key)
      }
    }
  }

  clear(): void {
    this.store.clear()
  }
}

export const memoryQueryCache = new MemoryQueryCache()

import type { Middleware } from "openapi-fetch"

import { apiClient } from "@/shared/api/client"

import { fireAuthFailure } from "./token-storage"

const NO_RETRY_ON_401 = new Set(["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"])

const requestClones = new WeakMap<Request, Request>()

let isRefreshing = false
let refreshQueue: Array<{
  resolve: () => void
  reject: (error: Error) => void
}> = []

function processQueue(error: Error | null): void {
  for (const { resolve, reject } of refreshQueue) {
    if (error) {
      reject(error)
    } else {
      resolve()
    }
  }
  refreshQueue = []
}

const authMiddleware: Middleware = {
  onRequest({ request }) {
    requestClones.set(request, request.clone())
    return undefined
  },

  async onResponse({ request, response, schemaPath }) {
    if (response.status !== 401 || NO_RETRY_ON_401.has(schemaPath)) return undefined

    if (isRefreshing) {
      try {
        await new Promise<void>((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        })
        const clone = requestClones.get(request)
        if (!clone) return undefined
        clone.headers.delete("Authorization")
        return fetch(clone)
      } catch {
        return undefined
      }
    }

    isRefreshing = true

    try {
      const { data, error } = await apiClient.POST("/auth/refresh")

      if (error || !data) {
        processQueue(new Error("Refresh failed"))
        fireAuthFailure()
        return undefined
      }

      processQueue(null)

      const clone = requestClones.get(request)
      if (!clone) return undefined
      clone.headers.delete("Authorization")
      return fetch(clone)
    } catch (err) {
      processQueue(err instanceof Error ? err : new Error("Refresh failed"))
      fireAuthFailure()
      return undefined
    } finally {
      isRefreshing = false
    }
  },
}

export function installAuthMiddleware(): void {
  apiClient.use(authMiddleware)
}

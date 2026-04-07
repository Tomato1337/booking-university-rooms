import type { Middleware } from "openapi-fetch"

import { apiClient } from "@/shared/api/client"

import {
  clearAccessToken,
  fireAuthFailure,
  getAccessToken,
  setAccessToken,
} from "./token-storage"

const NO_AUTH_HEADER = new Set(["/auth/login", "/auth/register", "/auth/refresh"])
const NO_RETRY_ON_401 = new Set(["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"])

const requestClones = new WeakMap<Request, Request>()

let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (error: Error) => void
}> = []

function processQueue(token: string | null, error: Error | null): void {
  for (const { resolve, reject } of refreshQueue) {
    if (error) {
      reject(error)
    } else {
      resolve(token!)
    }
  }
  refreshQueue = []
}

const authMiddleware: Middleware = {
  onRequest({ request, schemaPath }) {
    requestClones.set(request, request.clone())

    if (NO_AUTH_HEADER.has(schemaPath)) return undefined

    const token = getAccessToken()
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`)
    }
    return undefined
  },

  async onResponse({ request, response, schemaPath }) {
    if (response.status !== 401 || NO_RETRY_ON_401.has(schemaPath)) return undefined

    if (isRefreshing) {
      try {
        const newToken = await new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        })
        const clone = requestClones.get(request)
        if (!clone) return undefined
        clone.headers.set("Authorization", `Bearer ${newToken}`)
        return fetch(clone)
      } catch {
        return undefined
      }
    }

    isRefreshing = true

    try {
      const { data, error } = await apiClient.POST("/auth/refresh")

      if (error || !data) {
        clearAccessToken()
        processQueue(null, new Error("Refresh failed"))
        fireAuthFailure()
        return undefined
      }

      const newToken = data.data.accessToken
      setAccessToken(newToken)
      processQueue(newToken, null)

      const clone = requestClones.get(request)
      if (!clone) return undefined
      clone.headers.set("Authorization", `Bearer ${newToken}`)
      return fetch(clone)
    } catch (err) {
      clearAccessToken()
      processQueue(null, err instanceof Error ? err : new Error("Refresh failed"))
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

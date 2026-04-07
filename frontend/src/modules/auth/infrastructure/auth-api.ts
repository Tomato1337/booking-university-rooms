import type { components } from "@/shared/api/schema"

import { apiClient } from "@/shared/api/client"

export function login(body: components["schemas"]["LoginRequest"]) {
  return apiClient.POST("/auth/login", { body })
}

export function register(body: components["schemas"]["RegisterRequest"]) {
  return apiClient.POST("/auth/register", { body })
}

export function refreshToken() {
  return apiClient.POST("/auth/refresh")
}

export function logout() {
  return apiClient.POST("/auth/logout")
}

export function getMe() {
  return apiClient.GET("/auth/me")
}

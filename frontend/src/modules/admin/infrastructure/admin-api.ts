import { apiClient } from "@/shared/api/client"

export interface ListPendingQuery {
  search?: string
  limit?: number
  cursor?: string
}

export interface AdminStatsQuery {
  period?: string
}

export function listPending(query?: ListPendingQuery) {
  return apiClient.GET("/admin/bookings/pending", { params: { query } })
}

export function listHistory(query?: ListPendingQuery) {
  return apiClient.GET("/admin/bookings/history", { params: { query } })
}

export function approve(bookingId: string) {
  return apiClient.PATCH("/admin/bookings/{bookingId}/approve", {
    params: { path: { bookingId } },
  })
}

export function reject(bookingId: string, reason?: string) {
  return apiClient.PATCH("/admin/bookings/{bookingId}/reject", {
    params: { path: { bookingId } },
    body: reason ? { reason } : undefined,
  })
}

export function getStats(query?: AdminStatsQuery) {
  return apiClient.GET("/admin/stats", {
    params: {
      query: query as never,
    },
  })
}

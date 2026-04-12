import { apiClient } from "@/shared/api/client"
import type { CreateBookingRequest } from "../domain/types"

export function createBooking(body: CreateBookingRequest) {
  return apiClient.POST("/bookings", { body })
}

export function getMyBookings(query?: { search?: string; limit?: number; cursor?: string }) {
  return apiClient.GET("/bookings/my", { params: { query } })
}

export function getMyBookingHistory(query?: {
  search?: string
  limit?: number
  cursor?: string
}) {
  return apiClient.GET("/bookings/my/history", { params: { query } })
}

export function cancelBooking(bookingId: string) {
  return apiClient.PATCH("/bookings/{bookingId}/cancel", {
    params: { path: { bookingId } },
  })
}

import { apiClient } from "@/shared/api/client"
import type { CreateBookingRequest } from "../domain/types"

export function createBooking(body: CreateBookingRequest) {
  return apiClient.POST("/bookings", { body })
}

import type { components } from "@/shared/api/schema"

export type Booking = components["schemas"]["Booking"]
export type MyBooking = components["schemas"]["MyBooking"]
export type BookingStatus = components["schemas"]["BookingStatus"]
export type BookingPurpose = string
export type CreateBookingRequest = components["schemas"]["CreateBookingRequest"]
export type ApiErrorResponse = components["schemas"]["ErrorResponse"]

export type TimeSlotStatus = components["schemas"]["TimeSlotStatus"]
export type TimeSlotFromApi = components["schemas"]["TimeSlot"]
export type UserBookingSummary = components["schemas"]["UserBookingSummary"]

export interface CancelBookingResult {
  id: string
  status: "cancelled"
  updatedAt: string
}

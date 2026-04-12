import type { components } from "@/shared/api/schema"

export type Booking = components["schemas"]["Booking"]
export type BookingPurpose = components["schemas"]["BookingPurpose"]
export type CreateBookingRequest = components["schemas"]["CreateBookingRequest"]
export type ApiErrorResponse = components["schemas"]["ErrorResponse"]

export type TimeSlotStatus = components["schemas"]["TimeSlotStatus"]
export type TimeSlotFromApi = components["schemas"]["TimeSlot"]
export type UserBookingSummary = components["schemas"]["UserBookingSummary"]

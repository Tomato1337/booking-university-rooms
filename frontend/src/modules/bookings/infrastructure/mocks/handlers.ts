import { http } from "@/shared/mocks/http"

import type { components } from "@/shared/api/schema"
import {
  createMockBooking,
  hasBookingConflict,
  validateBookingPayload,
} from "./data"

type CreateBookingRequest = components["schemas"]["CreateBookingRequest"]

export const createBooking = {
  default: http.post("/bookings", async ({ request, response }) => {
    const body = (await request.json()) as CreateBookingRequest

    const validationError = validateBookingPayload(body)
    if (validationError) {
      const status = validationError.code === "BOOKING_IN_PAST" ? 422 : 400

      return response(status).json({
        error: {
          code: validationError.code,
          message: validationError.message,
        },
      })
    }

    if (hasBookingConflict(body)) {
      return response(409).json({
        error: {
          code: "BOOKING_CONFLICT",
          message: "Requested time slot overlaps with a confirmed booking",
        },
      })
    }

    const booking = createMockBooking(body)

    return response(201).json({ data: booking })
  }),
}

export const bookingsMockHandlers = [createBooking.default]

import { http } from "@/shared/mocks/http"
import { http as mswHttp, HttpResponse } from "msw"

import type { components } from "@/shared/api/schema"
import {
  cancelMockBooking,
  createMockBooking,
  getMyBookingHistory,
  getMyBookings,
  hasBookingConflict,
  ensureRoomBookingsProviderRegistered,
  seedRoomBookingsForDetailDate,
  validateBookingPayload,
} from "./data"

type CreateBookingRequest = components["schemas"]["CreateBookingRequest"]

const mockBookingPurposes = [
  { code: "academic_lecture", label: "Академическая лекция" },
  { code: "research_workshop", label: "Исследовательский семинар" },
  { code: "collaborative_study", label: "Совместное обучение" },
  { code: "technical_assessment", label: "Техническая оценка" },
]

export const createBooking = {
  default: http.post("/bookings", async ({ request, response }) => {
    ensureRoomBookingsProviderRegistered()

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

    seedRoomBookingsForDetailDate(body.roomId, body.bookingDate)

    return response(201).json({ data: booking })
  }),
}

export const myBookings = {
  default: http.get("/bookings/my", ({ request, response }) => {
    ensureRoomBookingsProviderRegistered()

    const url = new URL(request.url)
    const search = url.searchParams.get("search") ?? undefined
    const data = getMyBookings(search)

    return response(200).json({
      data,
      meta: {
        hasMore: false,
        nextCursor: null,
      },
    })
  }),
}

export const myBookingHistory = {
  default: http.get("/bookings/my/history", ({ request, response }) => {
    ensureRoomBookingsProviderRegistered()

    const url = new URL(request.url)
    const search = url.searchParams.get("search") ?? undefined
    const data = getMyBookingHistory(search)

    return response(200).json({
      data,
      meta: {
        hasMore: false,
        nextCursor: null,
      },
    })
  }),
}

export const cancelBooking = {
  default: http.patch("/bookings/{bookingId}/cancel", ({ params, response }) => {
    ensureRoomBookingsProviderRegistered()

    const bookingId = String(params.bookingId)
    const result = cancelMockBooking(bookingId)

    if (result.error) {
      if (result.error.status === 404) {
        return response(404).json({
          error: {
            code: result.error.code,
            message: result.error.message,
          },
        })
      }

      if (result.error.status === 409) {
        return response(409).json({
          error: {
            code: result.error.code,
            message: result.error.message,
          },
        })
      }

      return response(422).json({
        error: {
          code: result.error.code,
          message: result.error.message,
        },
      })
    }

    if (!result.result) {
      return response(404).json({
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Booking not found",
        },
      })
    }

    return response(200).json({ data: result.result })
  }),
}

export const bookingsMockHandlers = [
  mswHttp.get("/api/booking-purposes", () => HttpResponse.json({ data: mockBookingPurposes })),
  createBooking.default,
  myBookings.default,
  myBookingHistory.default,
  cancelBooking.default,
]

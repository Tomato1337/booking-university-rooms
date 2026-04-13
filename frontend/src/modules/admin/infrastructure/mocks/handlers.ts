import { HttpResponse } from "msw"

import { http } from "@/shared/mocks/http"

import type { components } from "@/shared/api/schema"
import {
  adminMockState,
  approvePendingBooking,
  createEquipmentItem,
  createRoomItem,
  deleteEquipmentItem,
  deleteRoomItem,
  listPendingBookings,
  listHistoryBookings,
  rejectPendingBooking,
  updateEquipmentItem,
  updateRoomItem,
} from "./data"

type RejectBookingRequest = components["schemas"]["RejectBookingRequest"]
type CreateRoomRequest = components["schemas"]["CreateRoomRequest"]
type UpdateRoomRequest = components["schemas"]["UpdateRoomRequest"]
type EquipmentPayload = { name: string; icon: string }

export const getAdminPendingBookings = {
  default: http.get("/admin/bookings/pending", ({ request, response }) => {
    const url = new URL(request.url)
    const payload = listPendingBookings({
      search: url.searchParams.get("search"),
      limit: url.searchParams.get("limit"),
      cursor: url.searchParams.get("cursor"),
    })

    return response(200).json(payload)
  }),
}

export const getAdminHistoryBookings = {
  default: http.get("/admin/bookings/history", ({ request, response }) => {
    const url = new URL(request.url)
    const payload = listHistoryBookings({
      search: url.searchParams.get("search"),
      limit: url.searchParams.get("limit"),
      cursor: url.searchParams.get("cursor"),
    })

    return response(200).json(payload)
  }),
}

export const approveAdminBooking = {
  default: http.patch("/admin/bookings/{bookingId}/approve", ({ params, response }) => {
    const bookingId = String(params.bookingId)
    const result = approvePendingBooking(bookingId)

    if (!result) {
      return response(404).json({
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Booking not found or already processed",
        },
      })
    }

    return response(200).json({ data: result })
  }),
}

export const rejectAdminBooking = {
  default: http.patch(
    "/admin/bookings/{bookingId}/reject",
    async ({ params, request, response }) => {
      const bookingId = String(params.bookingId)
      const rawBody = await request.text()
      const body = rawBody ? (JSON.parse(rawBody) as RejectBookingRequest) : null

      const result = rejectPendingBooking(bookingId, body?.reason)

      if (!result) {
        return response(404).json({
          error: {
            code: "BOOKING_NOT_FOUND",
            message: "Booking not found or already processed",
          },
        })
      }

      return response(200).json({ data: result })
    },
  ),
}

export const getAdminStats = {
  default: http.get("/admin/stats", ({ response }) => {
    return response(200).json({ data: adminMockState.stats })
  }),
}

export const createAdminRoom = {
  default: http.post("/rooms", async ({ request, response }) => {
    const body = (await request.json()) as CreateRoomRequest
    const room = createRoomItem(body)

    return response(201).json({ data: room })
  }),
}

export const updateAdminRoom = {
  default: http.put("/rooms/{roomId}", async ({ params, request, response }) => {
    const roomId = String(params.roomId)
    const body = (await request.json()) as UpdateRoomRequest
    const updated = updateRoomItem(roomId, body)

    if (!updated) {
      return response(404).json({
        error: {
          code: "ROOM_NOT_FOUND",
          message: "Room not found",
        },
      })
    }

    return response(200).json({ data: updated })
  }),
}

export const deleteAdminRoom = {
  default: http.delete("/rooms/{roomId}", ({ params }) => {
    const roomId = String(params.roomId)
    const deleted = deleteRoomItem(roomId)

    if (!deleted) {
      return HttpResponse.json(
        {
          error: {
            code: "ROOM_NOT_FOUND",
            message: "Room not found",
          },
        },
        { status: 404 },
      )
    }

    return new HttpResponse(null, { status: 204 })
  }),
}

export const listAdminEquipment = {
  default: http.get("/equipment", ({ response }) => {
    return response(200).json({ data: adminMockState.equipment })
  }),
}

export const createAdminEquipment = {
  default: http.post("/admin/equipment", async ({ request, response }) => {
    const body = (await request.json()) as EquipmentPayload
    const created = createEquipmentItem(body)

    return response(201).json({ data: created })
  }),
}

export const updateAdminEquipment = {
  default: http.put("/admin/equipment/{equipmentId}", async ({ params, request, response }) => {
    const equipmentId = String(params.equipmentId)
    const body = (await request.json()) as EquipmentPayload
    const updated = updateEquipmentItem(equipmentId, body)

    if (!updated) {
      return response(404).json({
        error: {
          code: "EQUIPMENT_NOT_FOUND",
          message: "Equipment not found",
        },
      })
    }

    return response(200).json({ data: updated })
  }),
}

export const deleteAdminEquipment = {
  default: http.delete("/admin/equipment/{equipmentId}", ({ params, response }) => {
    const equipmentId = String(params.equipmentId)
    const deleted = deleteEquipmentItem(equipmentId, adminMockState.rooms)

    if (!deleted.result) {
      return HttpResponse.json(
        {
          error: {
            code: "EQUIPMENT_NOT_FOUND",
            message: "Equipment not found",
          },
        },
        { status: 404 },
      )
    }

    return response(204).empty()
  }),
}

export const adminMockHandlers = [
  getAdminPendingBookings.default,
  getAdminHistoryBookings.default,
  approveAdminBooking.default,
  rejectAdminBooking.default,
  getAdminStats.default,
  createAdminRoom.default,
  updateAdminRoom.default,
  deleteAdminRoom.default,
  listAdminEquipment.default,
  createAdminEquipment.default,
  updateAdminEquipment.default,
  deleteAdminEquipment.default,
]

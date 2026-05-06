import { http as mswHttp, HttpResponse } from "msw"

import { http } from "@/shared/mocks/http"

import type { components } from "@/shared/api/schema"
import { mockBuildings } from "@/modules/rooms/infrastructure/mocks/data"
import {
  adminMockState,
  approvePendingBooking,
  createEquipmentItem,
  createRoomItem,
  deactivateEquipmentItem,
  deleteEquipmentItem,
  deleteRoomItem,
  listPendingBookings,
  listHistoryBookings,
  reactivateEquipmentItem,
  rejectPendingBooking,
  updateEquipmentItem,
  updateRoomItem,
} from "./data"

type RejectBookingRequest = components["schemas"]["RejectBookingRequest"]
type CreateRoomRequest = components["schemas"]["CreateRoomRequest"]
type UpdateRoomRequest = components["schemas"]["UpdateRoomRequest"]
type EquipmentPayload = { code: string; labelRu: string; labelEn: string; icon: string; isActive?: boolean; sortOrder: number }

const mockAdminBookingPurposes = [
  {
    code: "academic_lecture",
    labelRu: "Академическая лекция",
    labelEn: "Academic lecture",
    isActive: true,
    sortOrder: 10,
  },
  {
    code: "research_workshop",
    labelRu: "Исследовательский семинар",
    labelEn: "Research workshop",
    isActive: true,
    sortOrder: 20,
  },
]

const mockAdminBuildings = [
  {
    code: "aviamotornaya",
    labelRu: "Авиамоторная",
    labelEn: "Aviamotornaya",
    isActive: true,
    sortOrder: 10,
  },
  {
    code: "narod-opolchenie",
    labelRu: "Народное Ополчение",
    labelEn: "Narodnoye Opolcheniye",
    isActive: true,
    sortOrder: 20,
  },
]

const mockAdminRoomTypes = [
  { code: "lab", labelRu: "Лаборатория", labelEn: "Lab", isActive: true, sortOrder: 10 },
  { code: "auditorium", labelRu: "Аудитория", labelEn: "Auditorium", isActive: true, sortOrder: 20 },
  { code: "seminar", labelRu: "Семинарская", labelEn: "Seminar room", isActive: true, sortOrder: 30 },
  { code: "conference", labelRu: "Конференц-зал", labelEn: "Conference room", isActive: true, sortOrder: 40 },
  { code: "studio", labelRu: "Студия", labelEn: "Studio", isActive: true, sortOrder: 50 },
  { code: "lecture_hall", labelRu: "Лекционный зал", labelEn: "Lecture hall", isActive: true, sortOrder: 60 },
]

function syncPublicMockBuildings() {
  mockBuildings.splice(
    0,
    mockBuildings.length,
    ...mockAdminBuildings
      .filter((building) => building.isActive)
      .toSorted((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
      .map((building) => ({ code: building.code, label: building.labelRu })),
  )
}

const FIVE_MINUTE_HM_REGEX = /^([01]\d|2[0-3]):([0-5][05])$/

function roomHoursError(body: { openTime?: string; closeTime?: string }) {
  const openTime = body.openTime ?? "08:00"
  const closeTime = body.closeTime ?? "20:00"

  if (!FIVE_MINUTE_HM_REGEX.test(openTime) || !FIVE_MINUTE_HM_REGEX.test(closeTime) || openTime >= closeTime) {
    return {
      error: {
        code: "VALIDATION_ERROR" as const,
        message: "Invalid room hours: must be HH:mm (5-minute aligned), openTime < closeTime",
        details: {
          fields: [
            {
              field: "openTime",
              message: "Room hours must be HH:mm in 5-minute steps and openTime must be before closeTime",
              code: "invalid_time_range",
            },
          ],
        },
      },
    }
  }

  return null
}

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ""
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return `data:${file.type};base64,${btoa(binary)}`
}

async function parseRoomRequest(request: Request): Promise<CreateRoomRequest | UpdateRoomRequest> {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    return (await request.json()) as CreateRoomRequest | UpdateRoomRequest
  }

  const formData = await request.formData()
  const photo = formData.get("photo")
  const removePhoto = formData.get("removePhoto") === "true"
  const photos =
    photo instanceof File && photo.size > 0
      ? [await fileToDataUrl(photo)]
      : removePhoto
        ? []
        : undefined

  return {
    name: String(formData.get("name") ?? ""),
    description: formData.get("description") ? String(formData.get("description")) : undefined,
    roomType: String(formData.get("roomType") ?? "lab") as CreateRoomRequest["roomType"],
    capacity: Number(formData.get("capacity") ?? 1),
    building: String(formData.get("building") ?? ""),
    floor: Number(formData.get("floor") ?? 0),
    openTime: String(formData.get("openTime") ?? "08:00"),
    closeTime: String(formData.get("closeTime") ?? "20:00"),
    equipmentIds: formData.getAll("equipmentIds").map(String),
    ...(photos !== undefined ? { photos } : {}),
  }
}

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
    const body = (await parseRoomRequest(request)) as CreateRoomRequest
    const error = roomHoursError(body)
    if (error) return response(400).json(error)

    const room = createRoomItem(body)

    return response(201).json({ data: room })
  }),
}

export const updateAdminRoom = {
  default: http.put("/rooms/{roomId}", async ({ params, request, response }) => {
    const roomId = String(params.roomId)
    const body = (await parseRoomRequest(request)) as UpdateRoomRequest
    const error = roomHoursError(body)
    if (error) return response(400).json(error)

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
  default: http.get("/admin/equipment", ({ response }) => {
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
    const deleted = deactivateEquipmentItem(equipmentId)

    if (!deleted) {
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

export const reactivateAdminEquipment = {
  default: mswHttp.patch("/api/admin/equipment/:equipmentId/reactivate", ({ params }) => {
    const equipmentId = String(params.equipmentId)
    const item = reactivateEquipmentItem(equipmentId)
    if (!item) {
      return HttpResponse.json({ error: { code: "EQUIPMENT_NOT_FOUND", message: "Equipment not found" } }, { status: 404 })
    }
    return HttpResponse.json({ data: item })
  }),
}

export const hardDeleteAdminEquipment = {
  default: mswHttp.delete("/api/admin/equipment/:equipmentId/hard", ({ params }) => {
    const equipmentId = String(params.equipmentId)
    const deleted = deleteEquipmentItem(equipmentId, adminMockState.rooms)
    if (!deleted.result) {
      return HttpResponse.json({ error: { code: "EQUIPMENT_NOT_FOUND", message: "Equipment not found" } }, { status: 404 })
    }
    return HttpResponse.json({ data: deleted.result })
  }),
}

export const listAdminRooms = {
  default: http.get("/admin/rooms", ({ request, response }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get("search")?.toLowerCase() || ""
    const status = url.searchParams.get("status") || "all"
    const limitStr = url.searchParams.get("limit")
    const limit = limitStr ? parseInt(limitStr, 10) : 20
    const cursorStr = url.searchParams.get("cursor")
    const cursor = cursorStr ? parseInt(cursorStr, 10) : 0

    let filtered = adminMockState.rooms

    if (status === "active") {
      filtered = filtered.filter(r => r.isActive !== false)
    } else if (status === "inactive") {
      filtered = filtered.filter(r => r.isActive === false)
    }

    if (search) {
      filtered = filtered.filter(r => r.name.toLowerCase().includes(search) || r.building.toLowerCase().includes(search))
    }

    const data = filtered.slice(cursor, cursor + limit).map(room => {
      // Map to RoomCard format
      return {
        id: room.id,
        name: room.name,
        description: room.description,
        roomType: room.roomType,
        capacity: room.capacity,
        building: room.building,
        floor: room.floor,
        photos: room.photos || [],
        equipment: room.equipment,
        availability: {
          isAvailable: room.isActive !== false,
          label: room.isActive !== false ? "AVAILABLE" : "INACTIVE"
        },
        isActive: room.isActive !== false
      }
    })

    const nextCursor = cursor + limit < filtered.length ? String(cursor + limit) : null

    return response(200).json({
      data,
      meta: {
        hasMore: nextCursor !== null,
        nextCursor
      }
    })
  }),
}

export const reactivateAdminRoom = {
  default: http.patch("/admin/rooms/{roomId}/reactivate", ({ params, response }) => {
    const roomId = String(params.roomId)
    const room = adminMockState.rooms.find(r => r.id === roomId)
    if (!room) {
      return response(404).json({ error: { code: "ROOM_NOT_FOUND", message: "Not found" } })
    }
    room.isActive = true
    return response(200).json({ data: room })
  }),
}

export const hardDeleteAdminRoom = {
  default: http.delete("/admin/rooms/{roomId}", ({ params, response }) => {
    const roomId = String(params.roomId)
    const index = adminMockState.rooms.findIndex((room) => room.id === roomId)
    if (index < 0) {
      return response(404).json({ error: { code: "ROOM_NOT_FOUND", message: "Not found" } })
    }
    adminMockState.rooms.splice(index, 1)
    return response(204).empty()
  }),
}

export const listAdminBookingPurposes = {
  default: mswHttp.get("/api/admin/booking-purposes", () => {
    return HttpResponse.json({ data: mockAdminBookingPurposes })
  }),
}

export const listAdminBuildings = {
  default: mswHttp.get("/api/admin/buildings", () => {
    return HttpResponse.json({ data: mockAdminBuildings })
  }),
}

export const createAdminBuilding = {
  default: mswHttp.post("/api/admin/buildings", async ({ request }) => {
    const body = (await request.json()) as unknown as (typeof mockAdminBuildings)[number]
    const item = {
      code: body.code,
      labelRu: body.labelRu,
      labelEn: body.labelEn,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    }
    mockAdminBuildings.push(item)
    syncPublicMockBuildings()
    return HttpResponse.json({ data: item }, { status: 201 })
  }),
}

export const updateAdminBuilding = {
  default: mswHttp.put("/api/admin/buildings/:code", async ({ params, request }) => {
    const code = String(params.code)
    const body = (await request.json()) as unknown as (typeof mockAdminBuildings)[number]
    const item = mockAdminBuildings.find((building) => building.code === code)
    if (!item) return HttpResponse.json({ error: { code: "BUILDING_NOT_FOUND", message: "Not found" } }, { status: 404 })
    item.labelRu = body.labelRu
    item.labelEn = body.labelEn
    item.isActive = body.isActive ?? item.isActive
    item.sortOrder = body.sortOrder ?? item.sortOrder
    syncPublicMockBuildings()
    return HttpResponse.json({ data: item })
  }),
}

export const deactivateAdminBuilding = {
  default: mswHttp.delete("/api/admin/buildings/:code", ({ params }) => {
    const item = mockAdminBuildings.find((building) => building.code === String(params.code))
    if (!item) return HttpResponse.json({ error: { code: "BUILDING_NOT_FOUND", message: "Not found" } }, { status: 404 })
    item.isActive = false
    syncPublicMockBuildings()
    return new HttpResponse(null, { status: 204 })
  }),
}

export const reactivateAdminBuilding = {
  default: mswHttp.patch("/api/admin/buildings/:code/reactivate", ({ params }) => {
    const item = mockAdminBuildings.find((building) => building.code === String(params.code))
    if (!item) return HttpResponse.json({ error: { code: "BUILDING_NOT_FOUND", message: "Not found" } }, { status: 404 })
    item.isActive = true
    syncPublicMockBuildings()
    return HttpResponse.json({ data: item })
  }),
}

export const hardDeleteAdminBuilding = {
  default: mswHttp.delete("/api/admin/buildings/:code/hard", ({ params }) => {
    const code = String(params.code)
    const index = mockAdminBuildings.findIndex((building) => building.code === code)
    if (index < 0) return HttpResponse.json({ error: { code: "BUILDING_NOT_FOUND", message: "Not found" } }, { status: 404 })
    adminMockState.pendingBookings = adminMockState.pendingBookings.filter((booking) => booking.room.building !== code)
    adminMockState.rooms = adminMockState.rooms.filter((room) => room.building !== code)
    mockAdminBuildings.splice(index, 1)
    syncPublicMockBuildings()
    return new HttpResponse(null, { status: 204 })
  }),
}

export const listAdminRoomTypes = {
  default: mswHttp.get("/api/admin/room-types", () => {
    return HttpResponse.json({ data: mockAdminRoomTypes })
  }),
}

export const createAdminRoomType = {
  default: mswHttp.post("/api/admin/room-types", async ({ request }) => {
    const body = (await request.json()) as unknown as (typeof mockAdminRoomTypes)[number]
    const item = {
      code: body.code,
      labelRu: body.labelRu,
      labelEn: body.labelEn,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    }
    mockAdminRoomTypes.push(item)
    return HttpResponse.json({ data: item }, { status: 201 })
  }),
}

export const updateAdminRoomType = {
  default: mswHttp.put("/api/admin/room-types/:code", async ({ params, request }) => {
    const code = String(params.code)
    const body = (await request.json()) as unknown as (typeof mockAdminRoomTypes)[number]
    const item = mockAdminRoomTypes.find((roomType) => roomType.code === code)
    if (!item) return HttpResponse.json({ error: { code: "ROOM_TYPE_NOT_FOUND", message: "Not found" } }, { status: 404 })
    item.labelRu = body.labelRu
    item.labelEn = body.labelEn
    item.isActive = body.isActive ?? item.isActive
    item.sortOrder = body.sortOrder ?? item.sortOrder
    return HttpResponse.json({ data: item })
  }),
}

export const deactivateAdminRoomType = {
  default: mswHttp.delete("/api/admin/room-types/:code", ({ params }) => {
    const item = mockAdminRoomTypes.find((roomType) => roomType.code === String(params.code))
    if (!item) return HttpResponse.json({ error: { code: "ROOM_TYPE_NOT_FOUND", message: "Not found" } }, { status: 404 })
    item.isActive = false
    return new HttpResponse(null, { status: 204 })
  }),
}

export const reactivateAdminRoomType = {
  default: mswHttp.patch("/api/admin/room-types/:code/reactivate", ({ params }) => {
    const item = mockAdminRoomTypes.find((roomType) => roomType.code === String(params.code))
    if (!item) return HttpResponse.json({ error: { code: "ROOM_TYPE_NOT_FOUND", message: "Not found" } }, { status: 404 })
    item.isActive = true
    return HttpResponse.json({ data: item })
  }),
}

export const hardDeleteAdminRoomType = {
  default: mswHttp.delete("/api/admin/room-types/:code/hard", ({ params }) => {
    const code = String(params.code)
    const index = mockAdminRoomTypes.findIndex((roomType) => roomType.code === code)
    if (index < 0) return HttpResponse.json({ error: { code: "ROOM_TYPE_NOT_FOUND", message: "Not found" } }, { status: 404 })
    adminMockState.pendingBookings = adminMockState.pendingBookings.filter((booking) => {
      const room = adminMockState.rooms.find((item) => item.id === booking.room.id)
      return room?.roomType !== code
    })
    adminMockState.rooms = adminMockState.rooms.filter((room) => room.roomType !== code)
    mockAdminRoomTypes.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
}

export const createAdminBookingPurpose = {
  default: mswHttp.post("/api/admin/booking-purposes", async ({ request }) => {
    const body = (await request.json()) as unknown as (typeof mockAdminBookingPurposes)[number]
    const item = {
      code: body.code,
      labelRu: body.labelRu,
      labelEn: body.labelEn,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    }
    mockAdminBookingPurposes.push(item)
    return HttpResponse.json({ data: item }, { status: 201 })
  }),
}

export const updateAdminBookingPurpose = {
  default: mswHttp.put("/api/admin/booking-purposes/:code", async ({ params, request }) => {
    const code = String(params.code)
    const body = (await request.json()) as unknown as (typeof mockAdminBookingPurposes)[number]
    const item = mockAdminBookingPurposes.find((purpose) => purpose.code === code)
    if (!item) return HttpResponse.json({ error: { code: "BOOKING_PURPOSE_NOT_FOUND", message: "Not found" } }, { status: 404 })
    item.labelRu = body.labelRu
    item.labelEn = body.labelEn
    item.isActive = body.isActive ?? item.isActive
    item.sortOrder = body.sortOrder ?? item.sortOrder
    return HttpResponse.json({ data: item })
  }),
}

export const deactivateAdminBookingPurpose = {
  default: mswHttp.delete("/api/admin/booking-purposes/:code", ({ params }) => {
    const item = mockAdminBookingPurposes.find((purpose) => purpose.code === String(params.code))
    if (!item) return HttpResponse.json({ error: { code: "BOOKING_PURPOSE_NOT_FOUND", message: "Not found" } }, { status: 404 })
    item.isActive = false
    return new HttpResponse(null, { status: 204 })
  }),
}

export const reactivateAdminBookingPurpose = {
  default: mswHttp.patch("/api/admin/booking-purposes/:code/reactivate", ({ params }) => {
    const item = mockAdminBookingPurposes.find((purpose) => purpose.code === String(params.code))
    if (!item) return HttpResponse.json({ error: { code: "BOOKING_PURPOSE_NOT_FOUND", message: "Not found" } }, { status: 404 })
    item.isActive = true
    return HttpResponse.json({ data: item })
  }),
}

export const hardDeleteAdminBookingPurpose = {
  default: mswHttp.delete("/api/admin/booking-purposes/:code/hard", ({ params }) => {
    const code = String(params.code)
    const index = mockAdminBookingPurposes.findIndex((purpose) => purpose.code === code)
    if (index < 0) return HttpResponse.json({ error: { code: "BOOKING_PURPOSE_NOT_FOUND", message: "Not found" } }, { status: 404 })
    adminMockState.pendingBookings = adminMockState.pendingBookings.filter((booking) => booking.purpose !== code)
    adminMockState.stats.pendingCount = adminMockState.pendingBookings.filter((booking) => booking.status === "pending").length
    mockAdminBookingPurposes.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
}

export const adminMockHandlers = [
  listAdminBuildings.default,
  createAdminBuilding.default,
  updateAdminBuilding.default,
  deactivateAdminBuilding.default,
  reactivateAdminBuilding.default,
  hardDeleteAdminBuilding.default,
  listAdminRoomTypes.default,
  createAdminRoomType.default,
  updateAdminRoomType.default,
  deactivateAdminRoomType.default,
  reactivateAdminRoomType.default,
  hardDeleteAdminRoomType.default,
  listAdminBookingPurposes.default,
  createAdminBookingPurpose.default,
  updateAdminBookingPurpose.default,
  deactivateAdminBookingPurpose.default,
  reactivateAdminBookingPurpose.default,
  hardDeleteAdminBookingPurpose.default,
  listAdminRooms.default,
  reactivateAdminRoom.default,
  hardDeleteAdminRoom.default,
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
  reactivateAdminEquipment.default,
  hardDeleteAdminEquipment.default,
]

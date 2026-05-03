import { http } from "@/shared/mocks/http"
import { http as mswHttp, HttpResponse } from "msw"

import { getMockRoomDetail, mockBuildings, mockEquipment, mockRooms, paginateRooms } from "./data"
import { ensureRoomBookingsProviderRegistered } from "@/modules/bookings/infrastructure/mocks/data"

const FIVE_MINUTE_HM_REGEX = /^([01]\d|2[0-3]):([0-5][05])$/

export const listEquipment = {
  default: http.get("/equipment", ({ response }) => {
    return response(200).json({ data: mockEquipment })
  }),
}

export const listBuildings = {
  default: mswHttp.get("/api/buildings", () => {
    return HttpResponse.json({ data: mockBuildings })
  }),
}

export const searchRooms = {
  default: http.get("/rooms", ({ request, response }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get("search")
    const building = url.searchParams.get("building") || "aviamotornaya"
    const timeFrom = url.searchParams.get("timeFrom")
    const timeTo = url.searchParams.get("timeTo")
    const equipment = url.searchParams.get("equipment")
    const minCapacity = url.searchParams.get("minCapacity")
    const cursor = url.searchParams.get("cursor") ?? undefined
    const limit = Number(url.searchParams.get("limit") ?? "6")

    if (
      (timeFrom && !FIVE_MINUTE_HM_REGEX.test(timeFrom)) ||
      (timeTo && !FIVE_MINUTE_HM_REGEX.test(timeTo)) ||
      (timeFrom && timeTo && timeFrom >= timeTo)
    ) {
      return response(400).json({
        error: {
          code: "INVALID_TIME_RANGE",
          message: "Invalid time range: must be HH:mm (5-minute aligned), startTime < endTime",
        },
      })
    }

    let filtered = [...mockRooms]
    filtered = filtered.filter((r) => r.building === building)

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(q))
    }

    if (equipment) {
      const requiredIds = equipment.split(",").map((s) => s.trim())
      filtered = filtered.filter((room) => {
        const roomEquipIds = new Set(room.equipment.map((e) => e.id))
        return requiredIds.every((id) => roomEquipIds.has(id))
      })
    }

    if (minCapacity) {
      const cap = Number(minCapacity)
      if (!Number.isNaN(cap)) {
        filtered = filtered.filter((r) => r.capacity >= cap)
      }
    }

    if (timeFrom || timeTo) {
      filtered = filtered.filter((room) => {
        const range = room.availability.availableTimeRange

        if (!range) {
          return false
        }

        const [from, to] = range.split(" — ")
        const parseHm = (value: string) => {
          const [h, m] = value.split(":").map(Number)
          return h * 60 + m
        }

        const roomFrom = parseHm(from)
        const roomTo = parseHm(to)
        const queryFrom = timeFrom ? parseHm(timeFrom) : roomFrom
        const queryTo = timeTo ? parseHm(timeTo) : roomTo

        return queryFrom >= roomFrom && queryTo <= roomTo && queryFrom < queryTo
      })
    }

    const result = paginateRooms(filtered, cursor, limit)
    return response(200).json(result)
  }),
}

export const roomsMockHandlers = [
  listBuildings.default,
  listEquipment.default,
  searchRooms.default,
  http.get("/rooms/{roomId}", ({ params, request, response }) => {
    ensureRoomBookingsProviderRegistered()

    const url = new URL(request.url)
    const date = url.searchParams.get("date")
    const roomId = String(params.roomId)
    const base = getMockRoomDetail(roomId, date)
    if (!base) {
      return response(404).json({
        error: { code: "ROOM_NOT_FOUND", message: "Room not found" },
      })
    }

    return response(200).json({
      data: base,
    })
  }),
]

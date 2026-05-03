import type { components } from "@/shared/api/schema"

type RoomCard = components["schemas"]["RoomCard"]
type EquipmentItem = components["schemas"]["EquipmentItem"]
type RoomDetail = components["schemas"]["RoomDetail"]
type TimeSlot = components["schemas"]["TimeSlot"]
type UserBookingSummary = components["schemas"]["UserBookingSummary"]

export interface MockRoomUserBooking {
  id: string
  title: string
  startTime: string
  endTime: string
  status: components["schemas"]["BookingStatus"]
}

type RoomUserBookingsProvider = (roomId: string, date: string) => MockRoomUserBooking[]

export const mockEquipment: EquipmentItem[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Projector", icon: "IconVideo" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Whiteboard", icon: "IconPresentation" },
  { id: "33333333-3333-4333-8333-333333333333", name: "Broadcast", icon: "IconBroadcast" },
  { id: "44444444-4444-4444-8444-444444444444", name: "Multi-Media", icon: "IconDeviceDesktop" },
  { id: "55555555-5555-4555-8555-555555555555", name: "Microphone", icon: "IconMicrophone" },
  { id: "66666666-6666-4666-8666-666666666666", name: "Wi-Fi", icon: "IconWifi" },
  { id: "77777777-7777-4777-8777-777777777777", name: "Sound System", icon: "IconVolume" },
  { id: "88888888-8888-4888-8888-888888888888", name: "Linux Nodes", icon: "IconTerminal2" },
  { id: "99999999-9999-4999-8999-999999999999", name: "Smart Board", icon: "IconChalkboard" },
]

export const mockBuildings = [
  { code: "aviamotornaya", label: "Авиамоторная" },
  { code: "narod-opolchenie", label: "Народное Ополчение" },
]

function equipmentByIds(ids: string[]) {
  const idsSet = new Set(ids)

  return mockEquipment.filter((item) => idsSet.has(item.id))
}

export const mockRooms: RoomCard[] = [
  {
    id: "a6cbfd0e-f586-4baf-a79d-47dff5cb4d0a",
    name: "LAB_402B",
    roomType: "lab",
    capacity: 45,
    building: "aviamotornaya",
    buildingLabel: "Авиамоторная",
    floor: 4,
    equipment: equipmentByIds([
      "44444444-4444-4444-8444-444444444444",
      "66666666-6666-4666-8666-666666666666",
      "88888888-8888-4888-8888-888888888888",
    ]),
    availability: {
      isAvailable: true,
      label: "AVAILABLE NOW",
      availableTimeRange: "09:00 — 18:00",
    },
  },
  {
    id: "6c4ef49e-7db2-4fc7-a7d1-8d31bfcac264",
    name: "AUD_01",
    roomType: "lecture_hall",
    capacity: 180,
    building: "aviamotornaya",
    buildingLabel: "Авиамоторная",
    floor: 1,
    equipment: equipmentByIds([
      "11111111-1111-4111-8111-111111111111",
      "33333333-3333-4333-8333-333333333333",
      "77777777-7777-4777-8777-777777777777",
    ]),
    availability: {
      isAvailable: true,
      label: "AVAILABLE NOW",
      availableTimeRange: "10:30 — 12:00",
    },
  },
  {
    id: "d10f97fc-615e-4eb4-84c3-560e827ab913",
    name: "SEM_12",
    roomType: "seminar",
    capacity: 24,
    building: "narod-opolchenie",
    buildingLabel: "Народное Ополчение",
    floor: 2,
    equipment: equipmentByIds([
      "22222222-2222-4222-8222-222222222222",
      "66666666-6666-4666-8666-666666666666",
    ]),
    availability: {
      isAvailable: false,
      label: "BOOKED UNTIL 16:00",
      availableTimeRange: null,
    },
  },
  {
    id: "ba4d6de2-5866-4d89-882d-a8a53d6fce48",
    name: "STUDIO_04",
    roomType: "studio",
    capacity: 16,
    building: "narod-opolchenie",
    buildingLabel: "Народное Ополчение",
    floor: 1,
    equipment: equipmentByIds([
      "55555555-5555-4555-8555-555555555555",
      "77777777-7777-4777-8777-777777777777",
      "66666666-6666-4666-8666-666666666666",
    ]),
    availability: {
      isAvailable: true,
      label: "AVAILABLE NOW",
      availableTimeRange: "08:00 — 22:00",
    },
  },
  {
    id: "8d7ab653-f0ce-4d82-89bc-0c4f84b5b748",
    name: "CONF_301",
    roomType: "conference",
    capacity: 32,
    building: "aviamotornaya",
    buildingLabel: "Авиамоторная",
    floor: 3,
    equipment: equipmentByIds([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "66666666-6666-4666-8666-666666666666",
      "99999999-9999-4999-8999-999999999999",
    ]),
    availability: {
      isAvailable: true,
      label: "AVAILABLE NOW",
      availableTimeRange: "13:00 — 17:00",
    },
  },
  {
    id: "f628bf26-d7a9-4fcc-8d0d-cde06db919e6",
    name: "LECTURE_05",
    roomType: "lecture_hall",
    capacity: 220,
    building: "aviamotornaya",
    buildingLabel: "Авиамоторная",
    floor: 5,
    equipment: equipmentByIds([
      "11111111-1111-4111-8111-111111111111",
      "33333333-3333-4333-8333-333333333333",
      "77777777-7777-4777-8777-777777777777",
      "55555555-5555-4555-8555-555555555555",
    ]),
    availability: {
      isAvailable: false,
      label: "BOOKED UNTIL 18:00",
      availableTimeRange: null,
    },
  },
  {
    id: "16f1e33d-73c0-4433-a0d8-3b2d7d0f9245",
    name: "LAB_210",
    roomType: "lab",
    capacity: 36,
    building: "narod-opolchenie",
    buildingLabel: "Народное Ополчение",
    floor: 2,
    equipment: equipmentByIds([
      "44444444-4444-4444-8444-444444444444",
      "88888888-8888-4888-8888-888888888888",
      "66666666-6666-4666-8666-666666666666",
    ]),
    availability: {
      isAvailable: true,
      label: "AVAILABLE NOW",
      availableTimeRange: "11:00 — 19:00",
    },
  },
  {
    id: "f0b6c57d-7caa-4f13-915e-6952b95f5c13",
    name: "SEM_08",
    roomType: "seminar",
    capacity: 28,
    building: "aviamotornaya",
    buildingLabel: "Авиамоторная",
    floor: 2,
    equipment: equipmentByIds([
      "22222222-2222-4222-8222-222222222222",
      "66666666-6666-4666-8666-666666666666",
      "99999999-9999-4999-8999-999999999999",
    ]),
    availability: {
      isAvailable: true,
      label: "AVAILABLE NOW",
      availableTimeRange: "09:30 — 15:30",
    },
  },
  {
    id: "e168feb8-08a0-4e89-8d14-0a2f9e31ff22",
    name: "CONF_118",
    roomType: "conference",
    capacity: 18,
    building: "narod-opolchenie",
    buildingLabel: "Народное Ополчение",
    floor: 1,
    equipment: equipmentByIds([
      "11111111-1111-4111-8111-111111111111",
      "66666666-6666-4666-8666-666666666666",
    ]),
    availability: {
      isAvailable: true,
      label: "AVAILABLE",
      availableTimeRange: "14:00 — 20:00",
    },
  },
  {
    id: "9358ce86-a282-4b42-a4b4-11d84f4fb145",
    name: "STUDIO_11",
    roomType: "studio",
    capacity: 14,
    building: "narod-opolchenie",
    buildingLabel: "Народное Ополчение",
    floor: 3,
    equipment: equipmentByIds([
      "55555555-5555-4555-8555-555555555555",
      "77777777-7777-4777-8777-777777777777",
      "99999999-9999-4999-8999-999999999999",
    ]),
    availability: {
      isAvailable: false,
      label: "FULLY BOOKED",
      availableTimeRange: null,
    },
  },
  {
    id: "0c7db341-a0a7-4aa5-8f9f-d94cc327f3a6",
    name: "LAB_115",
    roomType: "lab",
    capacity: 30,
    building: "aviamotornaya",
    buildingLabel: "Авиамоторная",
    floor: 1,
    equipment: equipmentByIds([
      "44444444-4444-4444-8444-444444444444",
      "88888888-8888-4888-8888-888888888888",
      "55555555-5555-4555-8555-555555555555",
    ]),
    availability: {
      isAvailable: true,
      label: "AVAILABLE NOW",
      availableTimeRange: "08:30 — 13:30",
    },
  },
  {
    id: "6d8da4c7-41d5-40a5-a95b-349f8c867e8a",
    name: "SEM_21",
    roomType: "seminar",
    capacity: 22,
    building: "narod-opolchenie",
    buildingLabel: "Народное Ополчение",
    floor: 4,
    equipment: equipmentByIds([
      "22222222-2222-4222-8222-222222222222",
      "66666666-6666-4666-8666-666666666666",
      "77777777-7777-4777-8777-777777777777",
    ]),
    availability: {
      isAvailable: true,
      label: "AVAILABLE NOW",
      availableTimeRange: "10:00 — 18:30",
    },
  },
  {
    id: "77fce2a3-4f95-4bc8-8270-ae265f4e8e9a",
    name: "AUD_03",
    roomType: "lecture_hall",
    capacity: 120,
    building: "narod-opolchenie",
    buildingLabel: "Народное Ополчение",
    floor: 2,
    equipment: equipmentByIds([
      "11111111-1111-4111-8111-111111111111",
      "33333333-3333-4333-8333-333333333333",
      "66666666-6666-4666-8666-666666666666",
    ]),
    availability: {
      isAvailable: false,
      label: "BOOKED UNTIL 20:00",
      availableTimeRange: null,
    },
  },
]

export const mockRoomMetaById: Record<
  string,
  Pick<RoomDetail, "id" | "name" | "description" | "roomType" | "capacity" | "building" | "floor" | "photos" | "equipment" | "openTime" | "closeTime">
> = Object.fromEntries(
  mockRooms.map((room) => {
    const meta = {
      id: room.id,
      name: room.name,
      description: "High-security learning space. No shadows. Only focus.",
      roomType: room.roomType,
      capacity: room.capacity,
      building: room.building,
      floor: room.floor,
      photos: [],
      equipment: room.equipment,
      openTime: "08:00",
      closeTime: "20:00",
    }
    return [room.id, meta]
  }),
)

const mockRoomDetailsByDate = new Map<string, RoomDetail>()
let roomUserBookingsProvider: RoomUserBookingsProvider | null = null

function roomDateKey(roomId: string, date: string): string {
  return `${roomId}|${date}`
}

function cloneRoomDetail(detail: RoomDetail): RoomDetail {
  return {
    ...detail,
    equipment: detail.equipment.map((item) => ({ ...item })),
    timeSlots: detail.timeSlots.map((slot) => ({
      ...slot,
      booking: slot.booking ? { ...slot.booking } : null,
    })),
    userBookingsToday: detail.userBookingsToday.map((booking) => ({ ...booking })),
  }
}

function ensureRoomDetailForDate(roomId: string, date: string): RoomDetail | null {
  const base = mockRoomMetaById[roomId]
  if (!base) return null

  const key = roomDateKey(roomId, date)
  const existing = mockRoomDetailsByDate.get(key)
  if (existing) return existing

  const next: RoomDetail = {
    ...base,
    photos: [...(base.photos ?? [])],
    equipment: base.equipment.map((item) => ({ ...item })),
    timeSlots: [],
    userBookingsToday: [],
  }

  mockRoomDetailsByDate.set(key, next)
  return next
}

function parseHmToMinutes(value: string): number | null {
  const matched = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!matched) return null

  return Number(matched[1]) * 60 + Number(matched[2])
}

function toHm(minutes: number): string {
  const hh = Math.floor(minutes / 60)
  const mm = minutes % 60
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

function getWorkingRange(roomId: string): { start: number; end: number } {
  const meta = mockRoomMetaById[roomId]

  if (!meta) {
    return { start: 8 * 60, end: 20 * 60 }
  }

  const start = parseHmToMinutes(meta.openTime)
  const end = parseHmToMinutes(meta.closeTime)

  if (start === null || end === null || end <= start) {
    return { start: 8 * 60, end: 20 * 60 }
  }

  return { start, end }
}

function sortByStartThenEnd<T extends { startTime: string; endTime: string }>(items: T[]): T[] {
  return items.toSorted((a, b) => {
    const aStart = parseHmToMinutes(a.startTime) ?? 0
    const bStart = parseHmToMinutes(b.startTime) ?? 0
    if (aStart !== bStart) return aStart - bStart

    const aEnd = parseHmToMinutes(a.endTime) ?? aStart
    const bEnd = parseHmToMinutes(b.endTime) ?? bStart
    return aEnd - bEnd
  })
}

function buildTimeSlotsForRoomDate(
  roomId: string,
  date: string,
  bookings: MockRoomUserBooking[],
): { timeSlots: TimeSlot[]; userBookingsToday: UserBookingSummary[] } {
  const { start: dayStart, end: dayEnd } = getWorkingRange(roomId)
  const sortedBookings = sortByStartThenEnd(bookings)

  const boundaries = new Set<number>([dayStart, dayEnd])

  sortedBookings.forEach((booking) => {
    const start = parseHmToMinutes(booking.startTime)
    const end = parseHmToMinutes(booking.endTime)

    if (start === null || end === null) return
    if (end <= dayStart || start >= dayEnd) return

    boundaries.add(Math.max(dayStart, start))
    boundaries.add(Math.min(dayEnd, end))
  })

  const sortedBoundaries = Array.from(boundaries).toSorted((a, b) => a - b)
  const timeSlots: TimeSlot[] = []

  for (let i = 0; i < sortedBoundaries.length - 1; i += 1) {
    const segmentStart = sortedBoundaries[i]
    const segmentEnd = sortedBoundaries[i + 1]
    if (segmentEnd <= segmentStart) continue

    const activeBooking = sortedBookings.find((booking) => {
      const bookingStart = parseHmToMinutes(booking.startTime)
      const bookingEnd = parseHmToMinutes(booking.endTime)
      if (bookingStart === null || bookingEnd === null) return false

      return bookingStart <= segmentStart && bookingEnd >= segmentEnd
    })

    const slotStatus = activeBooking
      ? activeBooking.status === "pending" ? "yours_pending" : "yours"
      : "available"

    timeSlots.push({
      startTime: toHm(segmentStart),
      endTime: toHm(segmentEnd),
      status: slotStatus,
      booking: activeBooking
        ? {
            id: activeBooking.id,
            title: activeBooking.title,
            userId: "me",
          }
        : null,
    })
  }

  if (timeSlots.length === 0) {
    timeSlots.push({
      startTime: toHm(dayStart),
      endTime: toHm(dayEnd),
      status: "available",
      booking: null,
    })
  }

  const userBookingsToday: UserBookingSummary[] = sortedBookings.map((booking) => ({
    id: booking.id,
    title: booking.title,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
  }))

  if (date.endsWith("-01") && userBookingsToday.length === 0) {
    const pendingStart = dayStart + 2 * 60
    const pendingEnd = dayStart + 4 * 60

    if (pendingEnd <= dayEnd) {
      const pendingSlotId = `mock-pending-${roomId}-${date}`
      const pendingBooking: MockRoomUserBooking = {
        id: pendingSlotId,
        title: "Seminar",
        startTime: toHm(pendingStart),
        endTime: toHm(pendingEnd),
        status: "pending",
      }

      const seeded = buildTimeSlotsForRoomDate(roomId, date, [pendingBooking])

      return {
        timeSlots: seeded.timeSlots.map((slot) => {
          if (slot.booking?.id !== pendingSlotId) return slot
          return {
            ...slot,
            status: "pending",
          }
        }),
        userBookingsToday: [],
      }
    }
  }

  return { timeSlots, userBookingsToday }
}

export function registerMockRoomBookingsProvider(provider: RoomUserBookingsProvider) {
  roomUserBookingsProvider = provider
}

function syncUserBookingsForRoomDate(roomId: string, date: string) {
  const detail = ensureRoomDetailForDate(roomId, date)
  if (!detail) return

  const bookings = roomUserBookingsProvider?.(roomId, date) ?? []
  const built = buildTimeSlotsForRoomDate(roomId, date, bookings)

  detail.timeSlots = built.timeSlots
  detail.userBookingsToday = built.userBookingsToday
}

export function invalidateMockRoomDetail(params: { roomId: string; date: string }) {
  const key = roomDateKey(params.roomId, params.date)
  mockRoomDetailsByDate.delete(key)
}

export function invalidateAllMockRoomDetails(roomId: string) {
  for (const key of mockRoomDetailsByDate.keys()) {
    if (key.startsWith(`${roomId}|`)) {
      mockRoomDetailsByDate.delete(key)
    }
  }
}

export function getMockRoomDetail(roomId: string, date?: string | null): RoomDetail | null {
  const normalizedDate = date ?? "2026-04-12"

  syncUserBookingsForRoomDate(roomId, normalizedDate)

  const detail = ensureRoomDetailForDate(roomId, normalizedDate)
  if (!detail) return null

  return cloneRoomDetail(detail)
}

function encodeCursor(index: number) {
  return btoa(String(index))
}

function decodeCursor(cursor: string | undefined) {
  if (!cursor) {
    return 0
  }

  try {
    const decoded = Number.parseInt(atob(cursor), 10)

    if (Number.isInteger(decoded) && decoded >= 0) {
      return decoded
    }

    return 0
  } catch {
    return 0
  }
}

export function paginateRooms(
  rooms: RoomCard[],
  cursor: string | undefined,
  limit: number,
): { data: RoomCard[]; meta: { hasMore: boolean; nextCursor: string | null } } {
  const startIndex = decodeCursor(cursor)
  const pageSize = limit > 0 ? limit : 10
  const endIndex = Math.min(startIndex + pageSize, rooms.length)
  const data = rooms.slice(startIndex, endIndex)
  const hasMore = endIndex < rooms.length

  return {
    data,
    meta: {
      hasMore,
      nextCursor: hasMore ? encodeCursor(endIndex) : null,
    },
  }
}

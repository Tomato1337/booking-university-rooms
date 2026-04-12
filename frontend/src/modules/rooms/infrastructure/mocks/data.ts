import type { components } from "@/shared/api/schema"

type RoomCard = components["schemas"]["RoomCard"]
type EquipmentItem = components["schemas"]["EquipmentItem"]
type RoomDetail = components["schemas"]["RoomDetail"]
type TimeSlot = components["schemas"]["TimeSlot"]
type UserBookingSummary = components["schemas"]["UserBookingSummary"]

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
    building: "Building A",
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
    building: "Building C",
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
    building: "Building B",
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
    building: "Building D",
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
    building: "Building C",
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
    building: "Building A",
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
    building: "Building B",
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
    building: "Building A",
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
    building: "Building E",
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
    building: "Building D",
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
    building: "Building C",
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
    building: "Building B",
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
    building: "Building E",
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

const mockRoomDetailsBase: Record<string, RoomDetail> = Object.fromEntries(
  mockRooms.map((room) => {
    const detail: RoomDetail = {
      id: room.id,
      name: room.name,
      description: "High-security learning space. No shadows. Only focus.",
      roomType: room.roomType,
      capacity: room.capacity,
      building: room.building,
      floor: room.floor,
      photos: [],
      equipment: room.equipment,
      timeSlots: [
        { startTime: "08:00", endTime: "10:00", status: "available", booking: null },
        {
          startTime: "10:00",
          endTime: "12:00",
          status: "occupied",
          booking: { id: "b-1", title: "Math", userId: "u-1" },
        },
        { startTime: "12:00", endTime: "14:00", status: "available", booking: null },
        {
          startTime: "14:00",
          endTime: "16:00",
          status: "pending",
          booking: { id: "b-2", title: "Seminar", userId: "u-2" },
        },
        { startTime: "16:00", endTime: "18:00", status: "available", booking: null },
        {
          startTime: "18:00",
          endTime: "20:00",
          status: "available",
          booking: null,
        },
      ],
      userBookingsToday: [],
    }
    return [room.id, detail]
  }),
)

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function makeDynamicUserBookings(timeSlots: TimeSlot[]): {
  timeSlots: TimeSlot[]
  userBookingsToday: UserBookingSummary[]
} {
  const slots = timeSlots.map((slot) => ({ ...slot }))
  const availableIndexes = slots
    .map((slot, idx) => ({ slot, idx }))
    .filter(({ slot }) => slot.status === "available")
    .map(({ idx }) => idx)

  const bookingsCount = Math.min(randomInt(0, 2), availableIndexes.length)
  const picked = new Set<number>()

  while (picked.size < bookingsCount) {
    const idx = availableIndexes[randomInt(0, availableIndexes.length - 1)]
    picked.add(idx)
  }

  const userBookingsToday: UserBookingSummary[] = []

  Array.from(picked)
    .sort((a, b) => a - b)
    .forEach((idx, order) => {
      const slot = slots[idx]
      const bookingId = `my-${crypto.randomUUID()}`
      const title = `Your Booking ${order + 1}`

      slots[idx] = {
        ...slot,
        status: "yours",
        booking: {
          id: bookingId,
          title,
          userId: "me",
        },
      }

      userBookingsToday.push({
        id: bookingId,
        title,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: "confirmed",
      })
    })

  return {
    timeSlots: slots,
    userBookingsToday,
  }
}

export function getMockRoomDetail(roomId: string, date?: string | null): RoomDetail | null {
  const base = mockRoomDetailsBase[roomId]
  if (!base) return null

  const timeSlots = base.timeSlots.map((slot) => ({ ...slot }))

  if (date?.endsWith("-01")) {
    const target = timeSlots[2]
    if (target && target.status === "available") {
      timeSlots[2] = {
        ...target,
        status: "pending",
      }
    }
  }

  const dynamic = makeDynamicUserBookings(timeSlots)

  return {
    ...base,
    timeSlots: dynamic.timeSlots,
    userBookingsToday: dynamic.userBookingsToday,
  }
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

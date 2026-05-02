import type { components, operations } from "@/shared/api/schema";
import { mockRooms, mockEquipment, mockRoomMetaById, invalidateAllMockRoomDetails } from "@/modules/rooms/infrastructure/mocks/data";

type AdminPendingBooking = components["schemas"]["AdminPendingBooking"];
type AdminStats = components["schemas"]["AdminStats"];
type EquipmentItem = components["schemas"]["EquipmentItem"];
type RoomFull = components["schemas"]["RoomFull"] & { isActive?: boolean };
type CreateRoomRequest = components["schemas"]["CreateRoomRequest"];
type UpdateRoomRequest = components["schemas"]["UpdateRoomRequest"];
type ApproveResponse =
  operations["approveBooking"]["responses"][200]["content"]["application/json"]["data"];

interface EquipmentPayload {
  name: string;
  icon: string;
}

const NOW = "2026-04-13T09:00:00.000Z";
const AUTO_REJECT_REASON = "Auto-rejected due to overlap with approved booking";

const initialPendingBookings: AdminPendingBooking[] = [
  {
    id: "f1b50922-4a90-4f5f-9b27-3ff5abcb0001",
    user: {
      id: "2f8f39a8-31ee-4d5b-a48a-8451d5000001",
      firstName: "Alex",
      lastName: "Rudin",
      initials: "AR",
      department: "Computer Science",
    },
    room: {
      id: "a6cbfd0e-f586-4baf-a79d-47dff5cb4d0a",
      name: "LAB_402B",
      building: "Building A",
    },
    title: "Distributed Systems Seminar",
    purpose: "academic_lecture",
    bookingDate: "2026-04-20",
    startTime: "10:00",
    endTime: "12:00",
    attendeeCount: 24,
    status: "pending",
    createdAt: NOW,
  },
  {
    id: "f1b50922-4a90-4f5f-9b27-3ff5abcb0002",
    user: {
      id: "2f8f39a8-31ee-4d5b-a48a-8451d5000002",
      firstName: "Maria",
      lastName: "Keller",
      initials: "MK",
      department: "Computer Science",
    },
    room: {
      id: "a6cbfd0e-f586-4baf-a79d-47dff5cb4d0a",
      name: "LAB_402B",
      building: "Building A",
    },
    title: "Compiler Lab",
    purpose: "collaborative_study",
    bookingDate: "2026-04-20",
    startTime: "11:00",
    endTime: "13:00",
    attendeeCount: 18,
    status: "pending",
    createdAt: NOW,
  },
  {
    id: "f1b50922-4a90-4f5f-9b27-3ff5abcb0003",
    user: {
      id: "2f8f39a8-31ee-4d5b-a48a-8451d5000003",
      firstName: "Ilya",
      lastName: "Voronov",
      initials: "IV",
      department: "Physics",
    },
    room: {
      id: "d10f97fc-615e-4eb4-84c3-560e827ab913",
      name: "SEM_12",
      building: "Building B",
    },
    title: "Quantum Computing Workshop",
    purpose: "research_workshop",
    bookingDate: "2026-04-20",
    startTime: "09:00",
    endTime: "10:30",
    attendeeCount: 14,
    status: "pending",
    createdAt: NOW,
  },
  {
    id: "f1b50922-4a90-4f5f-9b27-3ff5abcb0004",
    user: {
      id: "2f8f39a8-31ee-4d5b-a48a-8451d5000004",
      firstName: "Nina",
      lastName: "Sokol",
      initials: "NS",
      department: "Design",
    },
    room: {
      id: "ba4d6de2-5866-4d89-882d-a8a53d6fce48",
      name: "STUDIO_04",
      building: "Building D",
    },
    title: "Motion Graphics Review",
    purpose: "technical_assessment",
    bookingDate: "2026-04-21",
    startTime: "13:00",
    endTime: "15:00",
    attendeeCount: 12,
    status: "pending",
    createdAt: NOW,
  },
  {
    id: "f1b50922-4a90-4f5f-9b27-3ff5abcb0005",
    user: {
      id: "2f8f39a8-31ee-4d5b-a48a-8451d5000005",
      firstName: "John",
      lastName: "Adams",
      initials: "JA",
      department: "Mathematics",
    },
    room: {
      id: "8d7ab653-f0ce-4d82-89bc-0c4f84b5b748",
      name: "CONF_301",
      building: "Building C",
    },
    title: "Topology Group Session",
    purpose: "collaborative_study",
    bookingDate: "2026-04-22",
    startTime: "16:00",
    endTime: "18:00",
    attendeeCount: 16,
    status: "pending",
    createdAt: NOW,
  },
  {
    id: "f1b50922-4a90-4f5f-9b27-3ff5abcb0006",
    user: {
      id: "2f8f39a8-31ee-4d5b-a48a-8451d5000006",
      firstName: "Laura",
      lastName: "Kim",
      initials: "LK",
      department: "Biology",
    },
    room: {
      id: "6c4ef49e-7db2-4fc7-a7d1-8d31bfcac264",
      name: "AUD_01",
      building: "Building C",
    },
    title: "Bioinformatics Lecture",
    purpose: "academic_lecture",
    bookingDate: "2026-04-22",
    startTime: "10:00",
    endTime: "12:00",
    attendeeCount: 85,
    status: "pending",
    createdAt: NOW,
  },
  {
    id: "f1b50922-4a90-4f5f-9b27-3ff5abcb0007",
    user: {
      id: "2f8f39a8-31ee-4d5b-a48a-8451d5000007",
      firstName: "Oleg",
      lastName: "Fisher",
      initials: "OF",
      department: "Robotics",
    },
    room: {
      id: "16f1e33d-73c0-4433-a0d8-3b2d7d0f9245",
      name: "LAB_210",
      building: "Building B",
    },
    title: "Robot Control Lab",
    purpose: "research_workshop",
    bookingDate: "2026-04-23",
    startTime: "09:30",
    endTime: "11:30",
    attendeeCount: 20,
    status: "pending",
    createdAt: NOW,
  },
  {
    id: "f1b50922-4a90-4f5f-9b27-3ff5abcb0008",
    user: {
      id: "2f8f39a8-31ee-4d5b-a48a-8451d5000008",
      firstName: "Emma",
      lastName: "Ortiz",
      initials: "EO",
      department: "Economics",
    },
    room: {
      id: "77fce2a3-4f95-4bc8-8270-ae265f4e8e9a",
      name: "AUD_03",
      building: "Building E",
    },
    title: "Macroeconomics Colloquium",
    purpose: "academic_lecture",
    bookingDate: "2026-04-23",
    startTime: "14:00",
    endTime: "16:00",
    attendeeCount: 70,
    status: "pending",
    createdAt: NOW,
  },
  {
    id: "f1b50922-4a90-4f5f-9b27-3ff5abcb0009",
    user: {
      id: "2f8f39a8-31ee-4d5b-a48a-8451d5000009",
      firstName: "Dmitry",
      lastName: "Miller",
      initials: "DM",
      department: "Chemistry",
    },
    room: {
      id: "0c7db341-a0a7-4aa5-8f9f-d94cc327f3a6",
      name: "LAB_115",
      building: "Building C",
    },
    title: "Analytical Chemistry Lab",
    purpose: "technical_assessment",
    bookingDate: "2026-04-24",
    startTime: "10:00",
    endTime: "12:30",
    attendeeCount: 22,
    status: "pending",
    createdAt: NOW,
  },
  {
    id: "f1b50922-4a90-4f5f-9b27-3ff5abcb0010",
    user: {
      id: "2f8f39a8-31ee-4d5b-a48a-8451d5000010",
      firstName: "Sara",
      lastName: "Nguyen",
      initials: "SN",
      department: "Architecture",
    },
    room: {
      id: "e168feb8-08a0-4e89-8d14-0a2f9e31ff22",
      name: "CONF_118",
      building: "Building E",
    },
    title: "Urban Design Critique",
    purpose: "collaborative_study",
    bookingDate: "2026-04-24",
    startTime: "15:00",
    endTime: "17:00",
    attendeeCount: 10,
    status: "pending",
    createdAt: NOW,
  },
];

const initialEquipment: EquipmentItem[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Projector", icon: "IconVideo" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Whiteboard", icon: "IconPresentation" },
  { id: "33333333-3333-4333-8333-333333333333", name: "Broadcast", icon: "IconBroadcast" },
  { id: "44444444-4444-4444-8444-444444444444", name: "Multi-Media", icon: "IconDeviceDesktop" },
  { id: "55555555-5555-4555-8555-555555555555", name: "Microphone", icon: "IconMicrophone" },
  { id: "66666666-6666-4666-8666-666666666666", name: "Wi-Fi", icon: "IconWifi" },
];

const initialRooms: RoomFull[] = [
  {
    id: "a6cbfd0e-f586-4baf-a79d-47dff5cb4d0a",
    name: "LAB_402B",
    description: "Advanced computing lab",
    roomType: "lab",
    capacity: 45,
    building: "Building A",
    floor: 4,
    openTime: "08:00",
    closeTime: "20:00",
    photos: [],
    equipment: [initialEquipment[3], initialEquipment[5]],
    createdAt: NOW,
  },
  {
    id: "6c4ef49e-7db2-4fc7-a7d1-8d31bfcac264",
    name: "AUD_01",
    description: "Main auditorium",
    roomType: "lecture_hall",
    capacity: 180,
    building: "Building C",
    floor: 1,
    openTime: "08:00",
    closeTime: "20:00",
    photos: [],
    equipment: [initialEquipment[0], initialEquipment[2], initialEquipment[4]],
    createdAt: NOW,
  },
  {
    id: "d10f97fc-615e-4eb4-84c3-560e827ab913",
    name: "SEM_12",
    description: "Seminar room",
    roomType: "seminar",
    capacity: 24,
    building: "Building B",
    floor: 2,
    openTime: "08:00",
    closeTime: "20:00",
    photos: [],
    equipment: [initialEquipment[1], initialEquipment[5]],
    createdAt: NOW,
  },
];

const initialStats: AdminStats = {
  pendingCount: initialPendingBookings.length,
  occupancyRate: 68,
  todayBookingsCount: 21,
  totalRooms: initialRooms.length,
  totalActiveRooms: initialRooms.length,
  bookingsByStatus: [
    { status: "pending", count: initialPendingBookings.length },
    { status: "confirmed", count: 10 },
    { status: "rejected", count: 4 },
    { status: "cancelled", count: 2 },
  ],
  popularRooms: [
    {
      id: initialRooms[0].id,
      name: initialRooms[0].name,
      building: initialRooms[0].building,
      count: 18,
    },
    {
      id: initialRooms[1].id,
      name: initialRooms[1].name,
      building: initialRooms[1].building,
      count: 14,
    },
    {
      id: initialRooms[2].id,
      name: initialRooms[2].name,
      building: initialRooms[2].building,
      count: 11,
    },
  ],
  bookingsByDayOfWeek: [
    { day: "Sun", count: 5 },
    { day: "Mon", count: 14 },
    { day: "Tue", count: 18 },
    { day: "Wed", count: 20 },
    { day: "Thu", count: 17 },
    { day: "Fri", count: 12 },
    { day: "Sat", count: 6 },
  ],
  occupancyByBuilding: [
    { building: "Building A", occupancyRate: 72 },
    { building: "Building B", occupancyRate: 66 },
    { building: "Building C", occupancyRate: 79 },
    { building: "Building D", occupancyRate: 58 },
    { building: "Building E", occupancyRate: 64 },
  ],
};

export const adminMockState: {
  pendingBookings: AdminPendingBooking[];
  stats: AdminStats;
  equipment: EquipmentItem[];
  rooms: RoomFull[];
} = {
  pendingBookings: [...initialPendingBookings],
  stats: { ...initialStats },
  equipment: [...initialEquipment],
  rooms: [...initialRooms],
};

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
}

function refreshPendingCount() {
  adminMockState.stats.pendingCount = adminMockState.pendingBookings.filter(
    (booking) => booking.status === "pending",
  ).length;
}

function parseCursor(cursor: string | null): number {
  if (!cursor) return 0;

  const parsed = Number.parseInt(cursor, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function eqByIds(ids: string[]) {
  const idSet = new Set(ids);
  return mockEquipment.filter((item) => idSet.has(item.id));
}

export function listPendingBookings(params: {
  search?: string | null;
  limit?: string | null;
  cursor?: string | null;
}) {
  const search = params.search?.trim().toLowerCase() ?? "";
  const limit = Number(params.limit ?? "10");
  const normalizedLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
  const cursor = parseCursor(params.cursor ?? null);

  const pending = adminMockState.pendingBookings
    .filter((booking) => booking.status === "pending")
    .filter((booking) => {
      if (!search) return true;

      const fullName = `${booking.user.firstName} ${booking.user.lastName}`.toLowerCase();
      return (
        fullName.includes(search) ||
        booking.room.name.toLowerCase().includes(search) ||
        booking.room.building.toLowerCase().includes(search) ||
        booking.title.toLowerCase().includes(search)
      );
    });

  const data = pending.slice(cursor, cursor + normalizedLimit);
  const nextCursor = cursor + data.length;

  return {
    data,
    meta: {
      total: pending.length,
      hasMore: nextCursor < pending.length,
      nextCursor: nextCursor < pending.length ? String(nextCursor) : null,
    },
  };
}

export function listHistoryBookings(params: {
  search?: string | null;
  limit?: string | null;
  cursor?: string | null;
}) {
  const search = params.search?.trim().toLowerCase() ?? "";
  const limit = Number(params.limit ?? "10");
  const normalizedLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
  const cursor = parseCursor(params.cursor ?? null);

  const history = adminMockState.pendingBookings
    .filter((booking) => booking.status !== "pending")
    .filter((booking) => {
      if (!search) return true;

      const fullName = `${booking.user.firstName} ${booking.user.lastName}`.toLowerCase();
      return (
        fullName.includes(search) ||
        booking.room.name.toLowerCase().includes(search) ||
        booking.room.building.toLowerCase().includes(search) ||
        booking.title.toLowerCase().includes(search)
      );
    });

  const data = history.slice(cursor, cursor + normalizedLimit);
  const nextCursor = cursor + data.length;

  return {
    data,
    meta: {
      total: history.length,
      hasMore: nextCursor < history.length,
      nextCursor: nextCursor < history.length ? String(nextCursor) : null,
    },
  };
}

export function approvePendingBooking(bookingId: string): ApproveResponse | null {
  const target = adminMockState.pendingBookings.find((booking) => booking.id === bookingId);
  if (!target || target.status !== "pending") return null;

  target.status = "confirmed";

  const autoRejected: ApproveResponse["autoRejected"] = [];
  adminMockState.pendingBookings.forEach((booking) => {
    const hasConflict =
      booking.id !== target.id &&
      booking.status === "pending" &&
      booking.room.id === target.room.id &&
      booking.bookingDate === target.bookingDate &&
      overlaps(booking.startTime, booking.endTime, target.startTime, target.endTime);

    if (!hasConflict) return;

    booking.status = "rejected";
    autoRejected.push({
      id: booking.id,
      userId: booking.user.id,
      title: booking.title,
      startTime: booking.startTime,
      endTime: booking.endTime,
      reason: AUTO_REJECT_REASON,
    });
  });

  refreshPendingCount();

  return {
    booking: {
      id: target.id,
      status: "confirmed",
      updatedAt: new Date().toISOString(),
    },
    autoRejected,
  };
}

export function rejectPendingBooking(bookingId: string, reason?: string | null) {
  const target = adminMockState.pendingBookings.find((booking) => booking.id === bookingId);
  if (!target || target.status !== "pending") return null;

  target.status = "rejected";
  refreshPendingCount();

  return {
    id: target.id,
    status: "rejected" as const,
    statusReason: reason?.trim() ? reason : null,
    updatedAt: new Date().toISOString(),
  };
}

export function createRoomItem(body: CreateRoomRequest): RoomFull {
  const room: RoomFull = {
    id: crypto.randomUUID(),
    name: body.name,
    description: body.description,
    roomType: body.roomType,
    capacity: body.capacity,
    building: body.building,
    floor: body.floor,
    openTime: body.openTime ?? "08:00",
    closeTime: body.closeTime ?? "20:00",
    photos: body.photos,
    equipment: eqByIds(body.equipmentIds ?? []),
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  adminMockState.rooms.push(room);
  adminMockState.stats.totalRooms += 1;
  adminMockState.stats.totalActiveRooms += 1;

  mockRooms.push({
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
      isAvailable: true,
      label: "AVAILABLE NOW",
    },
  });

  mockRoomMetaById[room.id] = {
    id: room.id,
    name: room.name,
    description: room.description || "No description provided.",
    roomType: room.roomType,
    capacity: room.capacity,
    building: room.building,
    floor: room.floor,
    photos: room.photos || [],
    equipment: room.equipment,
    openTime: room.openTime,
    closeTime: room.closeTime,
  };

  return room;
}

export function updateRoomItem(roomId: string, body: UpdateRoomRequest): RoomFull | null {
  const target = adminMockState.rooms.find((room) => room.id === roomId);
  if (!target) return null;

  if (body.name !== undefined) target.name = body.name;
  if (body.description !== undefined) target.description = body.description;
  if (body.roomType !== undefined) target.roomType = body.roomType;
  if (body.capacity !== undefined) target.capacity = body.capacity;
  if (body.building !== undefined) target.building = body.building;
  if (body.floor !== undefined) target.floor = body.floor;
  if (body.openTime !== undefined) target.openTime = body.openTime;
  if (body.closeTime !== undefined) target.closeTime = body.closeTime;
  if (body.photos !== undefined) target.photos = body.photos;
  if (body.equipmentIds !== undefined) target.equipment = eqByIds(body.equipmentIds);

  const publicTarget = mockRooms.find((room) => room.id === roomId);
  if (publicTarget) {
    if (body.name !== undefined) publicTarget.name = body.name;
    if (body.description !== undefined) publicTarget.description = body.description;
    if (body.roomType !== undefined) publicTarget.roomType = body.roomType;
    if (body.capacity !== undefined) publicTarget.capacity = body.capacity;
    if (body.building !== undefined) publicTarget.building = body.building;
    if (body.floor !== undefined) publicTarget.floor = body.floor;
    if (body.photos !== undefined) publicTarget.photos = body.photos;
    publicTarget.equipment = target.equipment;
  }

  if (mockRoomMetaById[roomId]) {
    if (body.name !== undefined) mockRoomMetaById[roomId].name = body.name;
    if (body.description !== undefined) mockRoomMetaById[roomId].description = body.description;
    if (body.roomType !== undefined) mockRoomMetaById[roomId].roomType = body.roomType;
    if (body.capacity !== undefined) mockRoomMetaById[roomId].capacity = body.capacity;
    if (body.building !== undefined) mockRoomMetaById[roomId].building = body.building;
    if (body.floor !== undefined) mockRoomMetaById[roomId].floor = body.floor;
    if (body.openTime !== undefined) mockRoomMetaById[roomId].openTime = body.openTime;
    if (body.closeTime !== undefined) mockRoomMetaById[roomId].closeTime = body.closeTime;
    if (body.photos !== undefined) mockRoomMetaById[roomId].photos = body.photos;
    mockRoomMetaById[roomId].equipment = target.equipment;
  }

  invalidateAllMockRoomDetails(roomId);

  return target;
}

export function deleteRoomItem(roomId: string): boolean {
  const index = adminMockState.rooms.findIndex((room) => room.id === roomId);
  if (index < 0) return false;

  adminMockState.rooms[index].isActive = false;
  adminMockState.stats.totalActiveRooms = Math.max(0, adminMockState.stats.totalActiveRooms - 1);

  const publicIndex = mockRooms.findIndex((room) => room.id === roomId);
  if (publicIndex >= 0) {
    mockRooms.splice(publicIndex, 1);
  }

  invalidateAllMockRoomDetails(roomId);

  return true;
}

export function createEquipmentItem(payload: EquipmentPayload): EquipmentItem {
  const next: EquipmentItem = {
    id: crypto.randomUUID(),
    name: payload.name,
    icon: payload.icon,
  };

  adminMockState.equipment.push(next);
  mockEquipment.push(next);
  return next;
}

export function updateEquipmentItem(
  equipmentId: string,
  payload: EquipmentPayload,
): EquipmentItem | null {
  const target = adminMockState.equipment.find((equipment) => equipment.id === equipmentId);
  if (!target) return null;

  target.name = payload.name;
  target.icon = payload.icon;

  const publicTarget = mockEquipment.find((equipment) => equipment.id === equipmentId);
  if (publicTarget) {
    publicTarget.name = payload.name;
    publicTarget.icon = payload.icon;
  }
  return target;
}

export function deleteEquipmentItem(
  equipmentId: string,
  rooms: RoomFull[],
): {
  result: { equipment: EquipmentItem; usedInRooms: Array<{ id: string; name: string }> } | null;
} {
  const index = adminMockState.equipment.findIndex((equipment) => equipment.id === equipmentId);
  if (index < 0) return { result: null };

  const equipment = adminMockState.equipment[index];
  const usedInRooms = rooms
    .filter((room) => room.equipment.some((item) => item.id === equipmentId))
    .map((room) => ({ id: room.id, name: room.name }));

  rooms.forEach((room) => {
    room.equipment = room.equipment.filter((item) => item.id !== equipmentId);
  });
  mockRooms.forEach((room) => {
    room.equipment = room.equipment.filter((item) => item.id !== equipmentId);
  });
  Object.keys(mockRoomMetaById).forEach((roomId) => {
    const meta = mockRoomMetaById[roomId];
    if (meta.equipment.some((item) => item.id === equipmentId)) {
      meta.equipment = meta.equipment.filter((item) => item.id !== equipmentId);
      invalidateAllMockRoomDetails(roomId);
    }
  });

  adminMockState.equipment.splice(index, 1);
  const publicIndex = mockEquipment.findIndex((e) => e.id === equipmentId);
  if (publicIndex >= 0) {
    mockEquipment.splice(publicIndex, 1);
  }

  return {
    result: {
      equipment,
      usedInRooms,
    },
  };
}

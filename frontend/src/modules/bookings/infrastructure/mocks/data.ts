import type { components } from "@/shared/api/schema";

import {
  getMockRoomDetail,
  invalidateMockRoomDetail,
  registerMockRoomBookingsProvider,
} from "@/modules/rooms";

type Booking = components["schemas"]["Booking"];
type BookingStatus = components["schemas"]["BookingStatus"];
type CreateBookingRequest = components["schemas"]["CreateBookingRequest"];
type MyBooking = components["schemas"]["MyBooking"];

const FIVE_MINUTE_HM_REGEX = /^([01]\d|2[0-3]):([0-5][05])$/;

interface MockBookingStoreItem {
  id: string;
  bookingId: string;
  roomId: string;
  roomName: string;
  title: string;
  purpose: components["schemas"]["BookingPurpose"];
  bookingDate: string;
  startTime: string;
  endTime: string;
  building: string;
  attendeeCount?: number | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

const NOW_ISO = new Date("2026-04-12T10:00:00.000Z").toISOString();
const NOW_MINUTES = 10 * 60;
let roomBookingsProviderRegistered = false;

const mockPurposeLabels: Record<string, string> = {
  academic_lecture: "Лекция / занятие",
  research_workshop: "Исследовательский воркшоп",
  collaborative_study: "Групповая работа",
  technical_assessment: "Техническая аттестация",
};

const mockBookingsStore: MockBookingStoreItem[] = [
  {
    id: "bf8f9d2e-1000-4a09-9000-111111111111",
    bookingId: "#BK-24001-A",
    roomId: "a6cbfd0e-f586-4baf-a79d-47dff5cb4d0a",
    roomName: "LAB_402B",
    title: "AI Lab Practice",
    purpose: "academic_lecture",
    bookingDate: "2026-04-17",
    startTime: "12:00",
    endTime: "14:00",
    building: "Building A",
    attendeeCount: 24,
    status: "confirmed",
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: "bf8f9d2e-2000-4a09-9000-222222222222",
    bookingId: "#BK-24002-B",
    roomId: "6c4ef49e-7db2-4fc7-a7d1-8d31bfcac264",
    roomName: "AUD_01",
    title: "Robotics Lecture",
    purpose: "research_workshop",
    bookingDate: "2026-04-13",
    startTime: "14:00",
    endTime: "16:00",
    building: "Building C",
    attendeeCount: 90,
    status: "pending",
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: "bf8f9d2e-3000-4a09-9000-333333333333",
    bookingId: "#BK-24003-C",
    roomId: "d10f97fc-615e-4eb4-84c3-560e827ab913",
    roomName: "SEM_12",
    title: "Past Team Meeting",
    purpose: "collaborative_study",
    bookingDate: "2026-04-10",
    startTime: "08:00",
    endTime: "10:00",
    building: "Building B",
    attendeeCount: 10,
    status: "confirmed",
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: "bf8f9d2e-4000-4a09-9000-444444444444",
    bookingId: "#BK-24004-D",
    roomId: "ba4d6de2-5866-4d89-882d-a8a53d6fce48",
    roomName: "STUDIO_04",
    title: "Cancelled Visual Workshop",
    purpose: "technical_assessment",
    bookingDate: "2026-04-11",
    startTime: "14:00",
    endTime: "16:00",
    building: "Building D",
    attendeeCount: 12,
    status: "cancelled",
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

function parseHm(value: string): number | null {
  const matched = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!matched) return null;

  const hh = Number(matched[1]);
  const mm = Number(matched[2]);
  return hh * 60 + mm;
}

function isPastBooking(bookingDate: string, endTime: string): boolean {
  const dayDiff = bookingDate.localeCompare("2026-04-12");
  if (dayDiff < 0) return true;
  if (dayDiff > 0) return false;

  const endMinutes = parseHm(endTime);
  if (endMinutes === null) return false;

  return endMinutes <= NOW_MINUTES;
}

function isActiveBooking(booking: MockBookingStoreItem): boolean {
  if (booking.status !== "pending" && booking.status !== "confirmed") return false;

  return !isPastBooking(booking.bookingDate, booking.endTime);
}

function toMyBooking(booking: MockBookingStoreItem): MyBooking {
  return {
    id: booking.id,
    bookingId: booking.bookingId,
    roomId: booking.roomId,
    roomName: booking.roomName,
    title: booking.title,
    purpose: booking.purpose,
    purposeLabel: mockPurposeLabels[booking.purpose] ?? booking.purpose,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    building: booking.building,
    status: booking.status,
    createdAt: booking.createdAt,
  };
}

function toBooking(booking: MockBookingStoreItem): Booking {
  return {
    id: booking.id,
    roomId: booking.roomId,
    roomName: booking.roomName,
    title: booking.title,
    purpose: booking.purpose,
    purposeLabel: mockPurposeLabels[booking.purpose] ?? booking.purpose,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    attendeeCount: booking.attendeeCount ?? null,
    status: booking.status,
    createdAt: booking.createdAt,
  };
}

function normalizeSearch(search: string | null | undefined): string {
  return search?.trim().toLowerCase() ?? "";
}

function filterBySearch(bookings: MockBookingStoreItem[], search: string | null | undefined) {
  const q = normalizeSearch(search);
  if (!q) return bookings;

  return bookings.filter((booking) => {
    return (
      booking.roomName.toLowerCase().includes(q) ||
      booking.bookingId.toLowerCase().includes(q) ||
      booking.title.toLowerCase().includes(q) ||
      booking.building.toLowerCase().includes(q)
    );
  });
}

function byDateAsc(a: MockBookingStoreItem, b: MockBookingStoreItem): number {
  const keyA = `${a.bookingDate}T${a.startTime}`;
  const keyB = `${b.bookingDate}T${b.startTime}`;
  return keyA.localeCompare(keyB);
}

function byDateDesc(a: MockBookingStoreItem, b: MockBookingStoreItem): number {
  return byDateAsc(b, a);
}

function listActiveBookingsForRoomDate(roomId: string, date: string) {
  return mockBookingsStore
    .filter(
      (booking) =>
        booking.roomId === roomId &&
        booking.bookingDate === date &&
        (booking.status === "pending" || booking.status === "confirmed"),
    )
    .toSorted(byDateAsc);
}

export function ensureRoomBookingsProviderRegistered() {
  if (roomBookingsProviderRegistered) return;

  registerMockRoomBookingsProvider((roomId, date) => {
    return listActiveBookingsForRoomDate(roomId, date).map((booking) => ({
      id: booking.id,
      title: booking.title,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
    }));
  });

  roomBookingsProviderRegistered = true;
}

function nextBookingNumber(): string {
  const currentMax = mockBookingsStore.reduce((acc, booking) => {
    const num = Number(booking.bookingId.replace(/[^\d]/g, ""));
    return Number.isFinite(num) ? Math.max(acc, num) : acc;
  }, 24004);

  return String(currentMax + 1).padStart(5, "0");
}

function getRoomMeta(roomId: string): { roomName: string; building: string } | null {
  const room = getMockRoomDetail(roomId, "2026-04-12");
  if (!room) return null;

  return {
    roomName: room.name,
    building: room.building,
  };
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function validateBookingPayload(body: CreateBookingRequest): {
  code: string;
  message: string;
} | null {
  if (!body.title.trim()) {
    return {
      code: "VALIDATION_ERROR",
      message: "Title is required",
    };
  }

  if (!FIVE_MINUTE_HM_REGEX.test(body.startTime) || !FIVE_MINUTE_HM_REGEX.test(body.endTime)) {
    return {
      code: "VALIDATION_ERROR",
      message: "Time must be in HH:mm format with 5-minute granularity",
    };
  }

  if (body.endTime <= body.startTime) {
    return {
      code: "INVALID_TIME_RANGE",
      message: "End time must be after start time",
    };
  }

  if (body.bookingDate < "2026-04-12") {
    return {
      code: "BOOKING_IN_PAST",
      message: "Cannot create a booking in the past",
    };
  }

  if (typeof body.attendeeCount === "number" && body.attendeeCount < 1) {
    return {
      code: "VALIDATION_ERROR",
      message: "Attendee count must be at least 1",
    };
  }

  return null;
}

export function hasBookingConflict(body: CreateBookingRequest): boolean {
  const detail = getMockRoomDetail(body.roomId, body.bookingDate);
  if (!detail) return false;

  return detail.timeSlots.some((slot) => {
    if (slot.status !== "occupied") return false;
    return overlaps(body.startTime, body.endTime, slot.startTime, slot.endTime);
  });
}

export function getMyBookings(search?: string): MyBooking[] {
  return filterBySearch(mockBookingsStore, search)
    .filter((booking) => isActiveBooking(booking))
    .toSorted(byDateAsc)
    .map(toMyBooking);
}

export function getMyBookingHistory(search?: string): MyBooking[] {
  return filterBySearch(mockBookingsStore, search)
    .filter((booking) => !isActiveBooking(booking))
    .toSorted(byDateDesc)
    .map(toMyBooking);
}

export function createMockBooking(body: CreateBookingRequest): Booking {
  const roomMeta = getRoomMeta(body.roomId);

  const booking: MockBookingStoreItem = {
    id: crypto.randomUUID(),
    bookingId: `#BK-${nextBookingNumber()}-N`,
    roomId: body.roomId,
    roomName: roomMeta?.roomName ?? "ROOM",
    title: body.title,
    purpose: body.purpose,
    bookingDate: body.bookingDate,
    startTime: body.startTime,
    endTime: body.endTime,
    building: roomMeta?.building ?? "Building A",
    attendeeCount: body.attendeeCount ?? null,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockBookingsStore.push(booking);
  invalidateMockRoomDetail({ roomId: body.roomId, date: body.bookingDate });

  return toBooking(booking);
}

export function cancelMockBooking(bookingId: string): {
  result?: { id: string; status: "cancelled"; updatedAt: string };
  error?: { code: string; message: string; status: number };
} {
  const booking = mockBookingsStore.find((item) => item.id === bookingId);
  if (!booking) {
    return {
      error: {
        code: "BOOKING_NOT_FOUND",
        message: "Booking not found",
        status: 404,
      },
    };
  }

  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return {
      error: {
        code: "BOOKING_ALREADY_PROCESSED",
        message: "Booking has already been processed",
        status: 409,
      },
    };
  }

  if (isPastBooking(booking.bookingDate, booking.startTime)) {
    return {
      error: {
        code: "BOOKING_IN_PAST",
        message: "Cannot cancel a booking that has already started",
        status: 422,
      },
    };
  }

  booking.status = "cancelled";
  booking.updatedAt = new Date().toISOString();
  invalidateMockRoomDetail({ roomId: booking.roomId, date: booking.bookingDate });

  return {
    result: {
      id: booking.id,
      status: "cancelled",
      updatedAt: booking.updatedAt,
    },
  };
}

export function seedRoomBookingsForDetailDate(_roomId: string, _date: string) {
  ensureRoomBookingsProviderRegistered();
}

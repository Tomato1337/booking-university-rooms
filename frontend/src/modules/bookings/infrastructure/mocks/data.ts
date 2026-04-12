import type { components } from "@/shared/api/schema";

type Booking = components["schemas"]["Booking"];
type CreateBookingRequest = components["schemas"]["CreateBookingRequest"];
import { getMockRoomDetail } from "@/modules/rooms";

const HALF_HOUR_REGEX = /^([01]\d|2[0-3]):(00|30)$/;

export const mockCreatedBookings: Booking[] = [];

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

  if (!HALF_HOUR_REGEX.test(body.startTime) || !HALF_HOUR_REGEX.test(body.endTime)) {
    return {
      code: "VALIDATION_ERROR",
      message: "Time must be in HH:mm format with 30-minute granularity",
    };
  }

  if (body.endTime <= body.startTime) {
    return {
      code: "INVALID_TIME_RANGE",
      message: "End time must be after start time",
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

export function createMockBooking(body: CreateBookingRequest): Booking {
  const booking: Booking = {
    id: crypto.randomUUID(),
    roomId: body.roomId,
    roomName: "ROOM",
    title: body.title,
    purpose: body.purpose,
    bookingDate: body.bookingDate,
    startTime: body.startTime,
    endTime: body.endTime,
    attendeeCount: body.attendeeCount ?? null,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  mockCreatedBookings.push(booking);

  return booking;
}

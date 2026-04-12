import { action, atom, reatomForm, wrap } from "@reatom/core";

import { createBookingSchema } from "../domain/schemas";
import type {
  ApiErrorResponse,
  Booking,
  BookingPurpose,
  CreateBookingRequest,
} from "../domain/types";
import * as bookingsApi from "../infrastructure/bookings-api";
import { delay } from "@/shared/lib/utils";

export const createBookingStatusAtom = atom<"idle" | "submitting" | "success" | "error">(
  "idle",
  "bookings.create.status",
);
export const createBookingErrorAtom = atom<string | null>(null, "bookings.create.error");
export const lastCreatedBookingAtom = atom<Booking | null>(null, "bookings.create.last");

function toCreateBookingErrorMessage(error: unknown): string {
  const apiError = error as ApiErrorResponse | undefined;
  const code = apiError?.error?.code;
  const message = apiError?.error?.message;

  if (message) return message;

  if (code === "BOOKING_CONFLICT") return "Requested time overlaps a confirmed booking";
  if (code === "BOOKING_IN_PAST") return "Cannot create a booking in the past";
  if (code === "INVALID_TIME_RANGE") return "End time must be after start time";
  if (code === "CAPACITY_EXCEEDED") return "Attendee count exceeds room capacity";
  if (code === "VALIDATION_ERROR") return "Please check the form fields";
  if (code === "RATE_LIMIT_EXCEEDED") return "Too many requests, try again later";

  return "Booking failed";
}

export const createBookingAction = action(async (body: CreateBookingRequest) => {
  createBookingStatusAtom.set("submitting");
  createBookingErrorAtom.set(null);
  lastCreatedBookingAtom.set(null);

  await wrap(delay(1000)); // Simulate network delay
  const { data, error } = await wrap(bookingsApi.createBooking(body));

  if (error || !data) {
    createBookingStatusAtom.set("error");
    createBookingErrorAtom.set(toCreateBookingErrorMessage(error));
    return false;
  }

  lastCreatedBookingAtom.set(data.data);
  createBookingStatusAtom.set("success");
  return true;
}, "bookings.create");

export const setCreateBookingTimeRangeAction = action(
  ({ startTime, endTime }: { startTime: string; endTime: string }) => {
    createBookingForm.fields.startTime.set(startTime);
    createBookingForm.fields.endTime.set(endTime);
  },
  "bookings.create.setTimeRange",
);

export const createBookingForm = reatomForm(
  {
    title: "",
    purpose: "academic_lecture" as BookingPurpose,
    startTime: "",
    endTime: "",
    attendeeCount: undefined as number | undefined,
  },
  {
    name: "createBookingForm",
    validateOnBlur: true,
    schema: createBookingSchema,
  },
);

// Small helper for page-level manual validation.
export function validateCreateBooking(values: unknown) {
  return createBookingSchema.safeParse(values);
}

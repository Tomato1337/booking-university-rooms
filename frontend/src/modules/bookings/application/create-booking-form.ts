import { action, atom, reatomForm, withAbort, wrap } from "@reatom/core";

import { createBookingSchema } from "../domain/schemas";
import type {
  ApiErrorResponse,
  Booking,
  CancelBookingResult,
  BookingPurpose,
  CreateBookingRequest,
  MyBooking,
} from "../domain/types";
import * as bookingsApi from "../infrastructure/bookings-api";
import { delay } from "@/shared/lib/utils";

export const createBookingStatusAtom = atom<"idle" | "submitting" | "success" | "error">(
  "idle",
  "bookings.create.status",
);
export const createBookingErrorAtom = atom<string | null>(null, "bookings.create.error");
export const lastCreatedBookingAtom = atom<Booking | null>(null, "bookings.create.last");

export const myBookingsAtom = atom<MyBooking[]>([], "bookings.my.data");
export const myBookingsLoadingAtom = atom(false, "bookings.my.loading");
export const myBookingsErrorAtom = atom<string | null>(null, "bookings.my.error");
export const myBookingsSearchAtom = atom("", "bookings.my.search");

export const myBookingHistoryAtom = atom<MyBooking[]>([], "bookings.myHistory.data");
export const myBookingHistoryLoadingAtom = atom(false, "bookings.myHistory.loading");
export const myBookingHistoryErrorAtom = atom<string | null>(null, "bookings.myHistory.error");

export const cancelBookingStatusAtom = atom<"idle" | "submitting" | "success" | "error">(
  "idle",
  "bookings.cancel.status",
);
export const cancelBookingErrorAtom = atom<string | null>(null, "bookings.cancel.error");

function toApiErrorMessage(error: unknown, fallback: string): string {
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
  if (code === "BOOKING_ALREADY_PROCESSED") return "Booking has already been processed";
  if (code === "NOT_OWNER") return "You can only cancel your own bookings";
  if (code === "BOOKING_NOT_FOUND") return "Booking not found";

  return fallback;
}

export const createBookingAction = action(async (body: CreateBookingRequest) => {
  createBookingStatusAtom.set("submitting");
  createBookingErrorAtom.set(null);
  lastCreatedBookingAtom.set(null);

  await wrap(delay(1000)); // Simulate network delay
  const { data, error } = await wrap(bookingsApi.createBooking(body));

  if (error || !data) {
    createBookingStatusAtom.set("error");
    createBookingErrorAtom.set(toApiErrorMessage(error, "Booking failed"));
    return false;
  }

  lastCreatedBookingAtom.set(data.data);
  createBookingStatusAtom.set("success");
  return true;
}, "bookings.create");

export const fetchMyBookingsAction = action(async () => {
  await wrap(delay(300)); // Debounce search input

  myBookingsLoadingAtom.set(true);
  myBookingsErrorAtom.set(null);

  const { data, error } = await wrap(
    bookingsApi.getMyBookings({
      search: myBookingsSearchAtom() || undefined,
      limit: 50,
    }),
  );

  if (error || !data) {
    myBookingsAtom.set([]);
    myBookingsErrorAtom.set(toApiErrorMessage(error, "Failed to load bookings"));
    myBookingsLoadingAtom.set(false);
    return;
  }

  myBookingsAtom.set(data.data);
  myBookingsLoadingAtom.set(false);
}, "bookings.my.fetch").extend(withAbort());

export const fetchMyBookingHistoryAction = action(async () => {
  await wrap(delay(300)); // Debounce search input

  myBookingHistoryLoadingAtom.set(true);
  myBookingHistoryErrorAtom.set(null);

  const { data, error } = await wrap(
    bookingsApi.getMyBookingHistory({
      search: myBookingsSearchAtom() || undefined,
      limit: 50,
    }),
  );

  if (error || !data) {
    myBookingHistoryAtom.set([]);
    myBookingHistoryErrorAtom.set(toApiErrorMessage(error, "Failed to load booking history"));
    myBookingHistoryLoadingAtom.set(false);
    return;
  }

  myBookingHistoryAtom.set(data.data);
  myBookingHistoryLoadingAtom.set(false);
}, "bookings.myHistory.fetch").extend(withAbort());

export const cancelBookingAction = action(async (bookingId: string) => {
  cancelBookingStatusAtom.set("submitting");
  cancelBookingErrorAtom.set(null);

  const { data, error } = await wrap(bookingsApi.cancelBooking(bookingId));

  if (error || !data) {
    cancelBookingStatusAtom.set("error");
    cancelBookingErrorAtom.set(toApiErrorMessage(error, "Failed to cancel booking"));
    return null;
  }

  const result = data.data as CancelBookingResult;

  myBookingsAtom.set(myBookingsAtom().filter((booking) => booking.id !== bookingId));

  cancelBookingStatusAtom.set("success");
  return result;
}, "bookings.cancel");

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

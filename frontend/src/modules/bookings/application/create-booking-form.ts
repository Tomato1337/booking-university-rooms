import { action, atom, computed, reatomForm, withAsync, withAsyncData, wrap } from "@reatom/core"

import { createBookingSchema } from "../domain/schemas"
import type {
  ApiErrorResponse,
  Booking,
  BookingPurpose,
  CancelBookingResult,
  CreateBookingRequest,
  MyBooking,
} from "../domain/types"
import * as bookingsApi from "../infrastructure/bookings-api"

const BOOKINGS_TTL_MS = 2 * 60 * 1000

interface BookingsCacheEntry {
  data: MyBooking[]
  updatedAt: number
}

function isFresh(entry: BookingsCacheEntry): boolean {
  return Date.now() - entry.updatedAt < BOOKINGS_TTL_MS
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase()
}

function toApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorResponse | undefined
  const code = apiError?.error?.code
  const message = apiError?.error?.message

  if (message) return message

  if (code === "BOOKING_CONFLICT") return "Requested time overlaps a confirmed booking"
  if (code === "BOOKING_IN_PAST") return "Cannot create a booking in the past"
  if (code === "INVALID_TIME_RANGE") return "End time must be after start time"
  if (code === "CAPACITY_EXCEEDED") return "Attendee count exceeds room capacity"
  if (code === "VALIDATION_ERROR") return "Please check the form fields"
  if (code === "RATE_LIMIT_EXCEEDED") return "Too many requests, try again later"
  if (code === "BOOKING_ALREADY_PROCESSED") return "Booking has already been processed"
  if (code === "NOT_OWNER") return "You can only cancel your own bookings"
  if (code === "BOOKING_NOT_FOUND") return "Booking not found"

  return fallback
}

const bookingsCacheAtom = atom<Map<string, BookingsCacheEntry>>(new Map(), "bookings.cache")
const bookingsHistoryCacheAtom = atom<Map<string, BookingsCacheEntry>>(
  new Map(),
  "bookings.historyCache",
)

export const createBookingErrorAtom = atom<string | null>(null, "bookings.create.error")
export const lastCreatedBookingAtom = atom<Booking | null>(null, "bookings.create.last")

export const myBookingsSearchAtom = atom("", "bookings.my.search")
export const bookingsPageSearchAtom = atom("", "bookings.page.search")

const activeBookingsResource = computed(async () => {
  const search = normalizeSearch(myBookingsSearchAtom())
  const cached = bookingsCacheAtom().get(search)
  if (cached && isFresh(cached)) {
    return cached.data
  }

  const { data, error } = await wrap(
    bookingsApi.getMyBookings({
      search: search || undefined,
      limit: 50,
    }),
  )

  if (error || !data) {
    throw new Error(toApiErrorMessage(error, "Failed to load bookings"))
  }

  bookingsCacheAtom.set((cache) => {
    const next = new Map(cache)
    next.set(search, {
      data: data.data,
      updatedAt: Date.now(),
    })
    return next
  })

  return data.data
}, "bookings.my.resource").extend(
  withAsyncData({
    initState: [] as MyBooking[],
    status: true,
    resetError: "onCall",
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
)

const historyBookingsResource = computed(async () => {
  const search = normalizeSearch(myBookingsSearchAtom())
  const cached = bookingsHistoryCacheAtom().get(search)
  if (cached && isFresh(cached)) {
    return cached.data
  }

  const { data, error } = await wrap(
    bookingsApi.getMyBookingHistory({
      search: search || undefined,
      limit: 50,
    }),
  )

  if (error || !data) {
    throw new Error(toApiErrorMessage(error, "Failed to load booking history"))
  }

  bookingsHistoryCacheAtom.set((cache) => {
    const next = new Map(cache)
    next.set(search, {
      data: data.data,
      updatedAt: Date.now(),
    })
    return next
  })

  return data.data
}, "bookings.myHistory.resource").extend(
  withAsyncData({
    initState: [] as MyBooking[],
    status: true,
    resetError: "onCall",
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
)

export const myBookingsAtom = computed(() => activeBookingsResource.data(), "bookings.my.data")
export const myBookingsLoadingAtom = computed(
  () => !activeBookingsResource.ready(),
  "bookings.my.loading",
)
export const myBookingsErrorAtom = computed(() => {
  const error = activeBookingsResource.error()
  return error?.message ?? null
}, "bookings.my.error")

export const myBookingHistoryAtom = computed(
  () => historyBookingsResource.data(),
  "bookings.myHistory.data",
)
export const myBookingHistoryLoadingAtom = computed(
  () => !historyBookingsResource.ready(),
  "bookings.myHistory.loading",
)
export const myBookingHistoryErrorAtom = computed(() => {
  const error = historyBookingsResource.error()
  return error?.message ?? null
}, "bookings.myHistory.error")

export const createBookingAction = action(async (body: CreateBookingRequest) => {
  createBookingErrorAtom.set(null)
  lastCreatedBookingAtom.set(null)

  const { data, error } = await wrap(bookingsApi.createBooking(body))

  if (error || !data) {
    const message = toApiErrorMessage(error, "Booking failed")
    createBookingErrorAtom.set(message)
    throw new Error(message)
  }

  const created = data.data
  lastCreatedBookingAtom.set(created)

  bookingsCacheAtom.set(() => new Map())
  bookingsHistoryCacheAtom.set(() => new Map())

  void wrap(activeBookingsResource.retry()).catch(() => null)
  void wrap(historyBookingsResource.retry()).catch(() => null)

  return created
}, "bookings.create").extend(withAsync({ status: true }))

export const fetchMyBookingsAction = action(async () => {
  return await wrap(activeBookingsResource.retry())
}, "bookings.my.fetch").extend(withAsync({ status: true }))

export const fetchMyBookingHistoryAction = action(async () => {
  return await wrap(historyBookingsResource.retry())
}, "bookings.myHistory.fetch").extend(withAsync({ status: true }))

export const cancelBookingAction = action(async (bookingId: string) => {
  const { data, error } = await wrap(bookingsApi.cancelBooking(bookingId))

  if (error || !data) {
    throw new Error(toApiErrorMessage(error, "Failed to cancel booking"))
  }

  const result = data.data as CancelBookingResult

  bookingsCacheAtom.set(() => new Map())
  bookingsHistoryCacheAtom.set(() => new Map())

  void wrap(activeBookingsResource.retry()).catch(() => null)
  void wrap(historyBookingsResource.retry()).catch(() => null)

  return result
}, "bookings.cancel").extend(withAsync({ status: true }))

export const createBookingStatusAtom = computed(() => {
  const status = createBookingAction.status()
  if (status.isPending) return "submitting"
  if (status.isRejected) return "error"
  if (status.isFulfilled) return "success"
  return "idle"
}, "bookings.create.status")

export const cancelBookingStatusAtom = computed(() => {
  const status = cancelBookingAction.status()
  if (status.isPending) return "submitting"
  if (status.isRejected) return "error"
  if (status.isFulfilled) return "success"
  return "idle"
}, "bookings.cancel.status")

export const cancelBookingErrorAtom = computed(() => {
  const error = cancelBookingAction.error()
  return error instanceof Error ? error.message : null
}, "bookings.cancel.error")

export const setCreateBookingTimeRangeAction = action(
  ({ startTime, endTime }: { startTime: string; endTime: string }) => {
    createBookingForm.fields.startTime.set(startTime)
    createBookingForm.fields.endTime.set(endTime)
  },
  "bookings.create.setTimeRange",
)

export const invalidateBookingsCacheAction = action(() => {
  bookingsCacheAtom.set(() => new Map())
  bookingsHistoryCacheAtom.set(() => new Map())
}, "bookings.invalidateCache")

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
)

// Small helper for page-level manual validation.
export function validateCreateBooking(values: unknown) {
  return createBookingSchema.safeParse(values)
}

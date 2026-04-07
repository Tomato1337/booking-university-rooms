import { IconSearch } from "@tabler/icons-react"

import { atom } from "@reatom/core"
import { reatomComponent, useWrap } from "@reatom/react"

import { BookingRow } from "@/modules/bookings"
import type { BookingStatus } from "@/modules/bookings"
import { rootRoute } from "@/shared/router"

interface MockBooking {
  roomName: string
  bookingId: string
  date: string
  timeRange: string
  location: string
  status: BookingStatus
}

const MOCK_BOOKINGS: MockBooking[] = [
  {
    roomName: "RM_402 QUANTUM LAB",
    bookingId: "#BK-88291-Q",
    date: "OCT 24, 2023",
    timeRange: "14:00 — 16:30",
    location: "SCIENCE BLOCK B",
    status: "confirmed",
  },
  {
    roomName: "STUDIO_G DIGITAL ARTS",
    bookingId: "#BK-88450-D",
    date: "OCT 26, 2023",
    timeRange: "09:00 — 11:00",
    location: "MEDIA CENTER 1",
    status: "pending",
  },
  {
    roomName: "HALL_A AUDITORIUM",
    bookingId: "#BK-88901-A",
    date: "NOV 01, 2023",
    timeRange: "18:00 — 20:00",
    location: "MAIN CAMPUS",
    status: "confirmed",
  },
]

const searchQuery = atom("", "bookingsPage-searchQuery")

const BookingsPage = reatomComponent(() => {
  const query = searchQuery().toLowerCase()
  const filteredBookings = MOCK_BOOKINGS.filter(
    (booking) =>
      booking.roomName.toLowerCase().includes(query) ||
      booking.bookingId.toLowerCase().includes(query) ||
      booking.location.toLowerCase().includes(query),
  )

  return (
    <div
      data-slot="bookings-page"
      className="flex min-h-full flex-col gap-10 px-6 py-8 md:px-10"
    >
      {/* Hero title section */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="mb-2 text-[3.5rem] font-black uppercase leading-[0.9] tracking-tighter">
            My Bookings
          </h2>
          <div className="h-2 w-16 bg-primary" />
        </div>

        {/* Tabs: Active / History */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            className="text-sm font-black uppercase tracking-widest text-primary"
          >
            Active
          </button>
          <button
            type="button"
            className="text-sm font-bold uppercase tracking-widest text-on-surface-variant transition-colors duration-150 ease-linear hover:text-on-surface"
          >
            History
          </button>
        </div>
      </section>

      {/* Table section */}
      <section className="flex flex-1 flex-col">
        {/* Search bar inside table */}
        <div className="flex items-center gap-3 bg-surface-container px-6 py-4">
          <IconSearch size={18} className="shrink-0 text-primary" />
          <input
            type="text"
            value={searchQuery()}
            onChange={useWrap((e) => searchQuery.set(e.target.value))}
            placeholder="SEARCH BOOKINGS BY ROOM, DATE, OR ID..."
            className="w-full bg-transparent text-sm font-bold uppercase tracking-widest text-on-surface outline-none placeholder:text-on-surface-variant/50"
          />
        </div>

        {/* Table header */}
        <div className="hidden bg-surface-container-high px-8 py-4 md:grid md:grid-cols-5">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Booking Details
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Date &amp; Time
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Location
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Status
          </span>
          <span className="text-right text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Action
          </span>
        </div>

        {/* Booking rows */}
        <div className="flex flex-col gap-1 bg-surface-container-lowest">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => (
              <BookingRow key={booking.bookingId} {...booking} />
            ))
          ) : (
            <div className="flex items-center justify-center bg-surface-container-low py-20">
              <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                No bookings match your search
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}, "BookingsPage")

export const bookingsRoute = rootRoute.reatomRoute(
  {
    path: "bookings",
    render: () => <BookingsPage />,
  },
  "bookings",
)

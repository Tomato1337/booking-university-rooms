import { IconCheck, IconSearch, IconX } from "@tabler/icons-react"

import { atom } from "@reatom/core"
import { reatomComponent, useWrap } from "@reatom/react"

import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { MetricCard, MetricLabel, MetricValue } from "@/shared/ui/metric-card"
import { rootRoute } from "@/shared/router"

interface AdminBooking {
  id: string
  userInitials: string
  userName: string
  department: string
  roomName: string
  building: string
  timeRange: string
  date: string
}

const MOCK_ADMIN_BOOKINGS: AdminBooking[] = [
  {
    id: "req-001",
    userInitials: "JD",
    userName: "Johnathan Doe",
    department: "Graduate Research Lab",
    roomName: "AUDITORIUM B-12",
    building: "Engineering Block",
    timeRange: "14:00 — 16:30",
    date: "TODAY, OCT 24",
  },
  {
    id: "req-002",
    userInitials: "SA",
    userName: "Sarah Al-Mansour",
    department: "Faculty of Medicine",
    roomName: "MEETING ROOM 04",
    building: "Main Library",
    timeRange: "09:00 — 11:00",
    date: "TOMORROW, OCT 25",
  },
  {
    id: "req-003",
    userInitials: "ML",
    userName: "Marcus Low",
    department: "Design & Arts Collective",
    roomName: "LABORATORY 302",
    building: "Science South",
    timeRange: "16:30 — 18:00",
    date: "OCT 26, 2024",
  },
  {
    id: "req-004",
    userInitials: "EV",
    userName: "Elena Vasilyev",
    department: "Physics Department",
    roomName: "SEMINAR HALL C",
    building: "Center for Humanities",
    timeRange: "12:00 — 14:00",
    date: "OCT 26, 2024",
  },
]

const TOTAL_PENDING = 24

const searchQuery = atom("", "dashboardPage-searchQuery")

function AdminBookingRow({ booking }: { booking: AdminBooking }) {
  return (
    <div
      data-slot="admin-booking-row"
      className="grid grid-cols-1 items-center gap-4 bg-surface-container-low px-8 py-6 transition-colors duration-150 ease-linear hover:bg-surface-container md:grid-cols-5"
    >
      {/* User */}
      <div className="flex items-center gap-4">
        <span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
          User
        </span>
        <div className="flex size-8 shrink-0 items-center justify-center bg-surface-container-highest text-xs font-bold text-primary">
          {booking.userInitials}
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-bold text-on-surface">{booking.userName}</p>
          <p className="text-xs text-on-surface-variant/50">{booking.department}</p>
        </div>
      </div>

      {/* Room */}
      <div className="flex flex-col gap-0.5">
        <span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
          Room
        </span>
        <p className="text-sm font-bold uppercase text-primary">{booking.roomName}</p>
        <p className="text-xs text-on-surface-variant/50">{booking.building}</p>
      </div>

      {/* Time Slot */}
      <div className="flex flex-col gap-0.5">
        <span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
          Time Slot
        </span>
        <p className="text-sm font-bold text-on-surface">{booking.timeRange}</p>
        <p className="text-xs uppercase tracking-tighter text-on-surface-variant/50">
          {booking.date}
        </p>
      </div>

      {/* Status */}
      <div className="flex md:justify-center">
        <span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
          Status
        </span>
        <Badge dot variant="pending">
          Pending
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex gap-2 md:justify-end">
        <Button
          aria-label="Approve booking"
          size="icon-sm"
          type="button"
          variant="default"
        >
          <IconCheck className="size-4" />
        </Button>
        <Button
          aria-label="Reject booking"
          size="icon-sm"
          type="button"
          variant="destructive"
        >
          <IconX className="size-4" />
        </Button>
      </div>
    </div>
  )
}

const DashboardPage = reatomComponent(() => {
  const query = searchQuery().toLowerCase()
  const filteredBookings = MOCK_ADMIN_BOOKINGS.filter(
    (booking) =>
      booking.userName.toLowerCase().includes(query) ||
      booking.roomName.toLowerCase().includes(query) ||
      booking.building.toLowerCase().includes(query) ||
      booking.department.toLowerCase().includes(query),
  )

  return (
    <div
      data-slot="dashboard-page"
      className="flex min-h-full flex-col gap-10 px-6 py-8 md:px-10"
    >
      {/* Hero title */}
      <section>
        <h2 className="mb-2 text-[3.5rem] font-black uppercase leading-[0.9] tracking-tighter">
          Dashboard
        </h2>
        <div className="h-2 w-16 bg-primary" />
      </section>

      {/* Metric cards */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <MetricCard stripe="available">
          <MetricLabel>Pending Requests</MetricLabel>
          <MetricValue>24</MetricValue>
        </MetricCard>
        <MetricCard stripe="pending">
          <MetricLabel>Occupancy Rate</MetricLabel>
          <MetricValue>88%</MetricValue>
        </MetricCard>
        <MetricCard stripe="booked">
          <MetricLabel>System Alerts</MetricLabel>
          <MetricValue>02</MetricValue>
        </MetricCard>
      </section>

      {/* Live Booking Feed */}
      <section className="flex flex-1 flex-col gap-6">
        <h3 className="text-[1.75rem] font-black uppercase tracking-tighter">
          Live Booking Feed
        </h3>

        {/* Table block — search, header, rows are flush */}
        <div className="flex flex-col">
          {/* Search bar */}
          <div className="flex items-center gap-3 bg-surface-container px-6 py-4">
            <IconSearch size={18} className="shrink-0 text-primary" />
            <input
              type="text"
              value={searchQuery()}
              onChange={useWrap((e) => searchQuery.set(e.target.value))}
              placeholder="SEARCH REQUESTS..."
              className="w-full bg-transparent text-sm font-bold uppercase tracking-widest text-on-surface outline-none placeholder:text-on-surface-variant/50"
            />
          </div>

          {/* Table header */}
          <div className="hidden bg-surface-container-high px-8 py-4 md:grid md:grid-cols-5">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              User
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Room
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Time Slot
            </span>
            <span className="text-center text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Status
            </span>
            <span className="text-right text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Actions
            </span>
          </div>

          {/* Booking rows */}
          <div className="flex flex-col gap-1 bg-surface-container-lowest">
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <AdminBookingRow key={booking.id} booking={booking} />
              ))
            ) : (
              <div className="flex items-center justify-center bg-surface-container-low py-20">
                <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                  No requests match your search
                </p>
              </div>
            )}
          </div>

          {/* Infinite scroll indicator */}
          {filteredBookings.length > 0 && (
            <div className="flex items-center justify-between bg-surface-container px-8 py-6">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Showing {filteredBookings.length} of {TOTAL_PENDING} Pending
                Bookings
              </span>
              <div className="flex items-center gap-3">
                <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Loading more...
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}, "DashboardPage")

export const dashboardRoute = rootRoute.reatomRoute(
  {
    path: "dashboard",
    render: () => <DashboardPage />,
  },
  "dashboard",
)

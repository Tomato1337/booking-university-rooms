import type { ComponentProps } from "react"

import {
  IconArrowRight,
  IconCalendarEvent,
  IconInfoCircle,
  IconTerminal2,
  IconVideo,
  IconVolume,
  IconWifi,
} from "@tabler/icons-react"

import { TimeGrid } from "@/modules/rooms"
import type { TimeSlot } from "@/modules/rooms"
import { cn } from "@/shared/lib/utils"
import { rootRoute } from "@/shared/router"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"

// --- Hardcoded Data ---

const HAS_BOOKING = true

const EQUIPMENT_ITEMS = [
  { icon: IconVideo, label: "4K Projector" },
  { icon: IconWifi, label: "Fiber Uplink" },
  { icon: IconVolume, label: "Spatial Audio" },
  { icon: IconTerminal2, label: "Linux Nodes" },
]

const TIMELINE_SLOTS_DEFAULT: TimeSlot[] = [
  { status: "available", flex: 2, startLabel: "08:00" },
  { status: "booked", flex: 2 },
  { status: "available", flex: 1, startLabel: "12:00" },
  { status: "pending", flex: 1 },
  { status: "available", flex: 3, startLabel: "14:00" },
  { status: "booked", flex: 3, startLabel: "17:00", endLabel: "20:00" },
]

const TIMELINE_SLOTS_BOOKED: TimeSlot[] = [
  { status: "available", flex: 2, startLabel: "08:00" },
  { status: "booked", flex: 2, startLabel: "10:00" },
  { status: "available", flex: 2, startLabel: "12:00" },
  { status: "yours", flex: 2, startLabel: "14:00", label: "YOUR_SLOT" },
  { status: "available", flex: 2, startLabel: "16:00" },
  { status: "booked", flex: 2, startLabel: "18:00", endLabel: "20:00" },
]

// --- Local Components ---

function BookingForm({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="booking-form"
      className={cn(
        "flex flex-col gap-8 border-t-4 border-primary bg-surface-container p-8",
        className,
      )}
      {...props}
    >
      <div>
        <h3 className="mb-2 text-[1.75rem] font-black uppercase leading-tight tracking-tight">
          Request Access
        </h3>
        <p className="text-sm text-on-surface-variant">
          Fill in the session parameters below.
        </p>
      </div>

      <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Session Title
          </label>
          <Input
            className="h-auto border-0 p-4 text-lg font-bold placeholder:text-outline/40"
            placeholder="e.g. Advanced AI Seminar"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Purpose
          </label>
          <Select defaultValue="academic-lecture">
            <SelectTrigger className="h-auto border-0 p-4 text-lg font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="academic-lecture">Academic Lecture</SelectItem>
              <SelectItem value="research-workshop">Research Workshop</SelectItem>
              <SelectItem value="collaborative-study">Collaborative Study</SelectItem>
              <SelectItem value="technical-assessment">Technical Assessment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Start Time
            </label>
            <Input
              type="time"
              className="h-auto border-0 p-4 text-lg font-bold"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              End Time
            </label>
            <Input
              type="time"
              className="h-auto border-0 p-4 text-lg font-bold"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Attendee Count
          </label>
          <Input
            type="number"
            max={45}
            className="h-auto border-0 p-4 text-lg font-bold placeholder:text-outline/40"
            placeholder="Max 45"
          />
        </div>

        <Button className="mt-4 h-auto w-full py-5 text-lg font-black uppercase tracking-widest">
          Confirm Booking
          <IconArrowRight className="size-5" />
        </Button>
      </form>

      <div className="border-l-2 border-primary bg-surface-container-low p-4">
        <p className="text-[0.7rem] leading-relaxed text-on-surface-variant">
          <span className="font-bold text-primary">NOTE:</span> Booking is subject
          to faculty approval. A response will be issued within 24 hours of
          submission.
        </p>
      </div>
    </div>
  )
}

function ScheduleCard() {
  return (
    <div className="sticky top-0 flex flex-col gap-6">
      <div className="flex flex-col gap-6 bg-primary p-8">
        <div className="flex items-start gap-3">
          <IconCalendarEvent className="size-7 shrink-0 text-primary-foreground" />
          <h3 className="text-[1.75rem] font-black uppercase leading-tight tracking-tight text-primary-foreground">
            Your Schedule Today
          </h3>
        </div>

        <div className="flex flex-col gap-3 bg-surface-container p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              ID: #BK-88201-Q
            </span>
            <Badge variant="available">Active</Badge>
          </div>
          <h4 className="text-lg font-bold text-on-surface">
            Advanced Architecture II
          </h4>
          <p className="text-2xl font-black tracking-tight text-on-surface">
            14:00 — 16:30
          </p>
          <div className="flex items-center gap-4 pt-2">
            <button className="text-xs font-bold uppercase tracking-widest text-on-surface-variant transition-colors duration-150 ease-linear hover:text-on-surface">
              Edit
            </button>
            <button className="text-xs font-bold uppercase tracking-widest text-on-surface-variant underline transition-colors duration-150 ease-linear hover:text-on-surface">
              Cancel
            </button>
          </div>
        </div>

        <p className="flex items-start gap-2 text-xs text-primary-foreground/80">
          <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
          You are currently assigned to this room for the next session.
        </p>
      </div>
    </div>
  )
}

// --- Page Component ---

function RoomDetailPage() {
  return (
    <div
      data-slot="room-detail-page"
      className="flex min-h-full flex-col gap-10 px-6 py-8 md:px-10"
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Left column — room info */}
        <div className="flex flex-col gap-10 lg:col-span-8">
          {/* Hero */}
          <section>
            <span className="mb-4 block text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Building C / Level 04
            </span>
            <h1 className="text-[3.5rem] font-black uppercase leading-[1.1] tracking-tighter">
              LAB_402_OMEGA
            </h1>
          </section>

          {/* Meta grid */}
          <div className="grid grid-cols-1 gap-[1px] bg-surface-container-low p-[1px] md:grid-cols-3">
            <div className="flex flex-col gap-2 bg-surface-container p-6">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Capacity
              </span>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold">45</span>
                <span className="pb-1 text-on-surface-variant">Persons</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 bg-surface-container p-6">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Type
              </span>
              <span className="text-2xl font-bold">Lab</span>
            </div>
            <div className="flex flex-col gap-2 bg-surface-container p-6">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Condition
              </span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-2xl font-bold">Pristine</span>
              </div>
            </div>
          </div>

          {/* Equipment inventory */}
          <section className="flex flex-col gap-6">
            <h2 className="text-[1.75rem] font-bold tracking-tight">
              Equipment Inventory
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {EQUIPMENT_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 border-l-4 border-primary bg-surface-container-high p-4"
                >
                  <item.icon className="size-5 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Daily occupancy timeline */}
          <TimeGrid
            title="Daily Occupancy"
            subtitle="Today: Oct 24, 2024"
            slots={HAS_BOOKING ? TIMELINE_SLOTS_BOOKED : TIMELINE_SLOTS_DEFAULT}
          />
        </div>

        {/* Right column — schedule or form */}
        <div className="lg:col-span-4">
          {HAS_BOOKING ? (
            <ScheduleCard />
          ) : (
            <div className="sticky top-0">
              <BookingForm />
            </div>
          )}
        </div>
      </div>

      {/* Bottom booking form — visible when user already has a booking */}
      {HAS_BOOKING && <BookingForm />}
    </div>
  )
}

export const roomDetailRoute = rootRoute.reatomRoute(
  {
    path: "room-detail",
    render: () => <RoomDetailPage />,
  },
  "roomDetail",
)

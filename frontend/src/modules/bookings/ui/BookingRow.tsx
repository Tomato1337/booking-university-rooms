import type { ComponentProps } from "react"

import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { StatusIndicator } from "@/shared/ui/status-indicator"

export type BookingStatus = "confirmed" | "pending"

export interface BookingRowProps extends ComponentProps<"article"> {
  /** Room display name, e.g. "RM_402 QUANTUM LAB" */
  roomName: string
  /** Booking identifier, e.g. "#BK-88291-Q" */
  bookingId: string
  /** Formatted date string, e.g. "OCT 24, 2023" */
  date: string
  /** Formatted time range, e.g. "14:00 — 16:30" */
  timeRange: string
  /** Building/location, e.g. "SCIENCE BLOCK B" */
  location: string
  /** Booking status */
  status: BookingStatus
  /** Called when cancel button is clicked */
  onCancel?: () => void
}

function BookingRow({
  roomName,
  bookingId,
  date,
  timeRange,
  location,
  status,
  onCancel,
  className,
  ...props
}: BookingRowProps) {
  const isPending = status === "pending"

  return (
    <article
      data-slot="booking-row"
      className={cn(
        "relative grid grid-cols-1 items-center gap-4 bg-surface-container-low px-8 py-8 pl-10 md:grid-cols-5",
        className,
      )}
      {...props}
    >
      <StatusIndicator
        className="absolute top-0 bottom-0 left-0 rounded-none"
        orientation="vertical"
        status={isPending ? "pending" : "available"}
      />

      {/* Booking Details */}
      <div className="flex flex-col gap-0.5">
        <span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
          Booking Details
        </span>
        <p className="text-lg font-bold uppercase tracking-tighter text-on-surface">
          {roomName}
        </p>
        <p className="text-xs tracking-wider text-on-surface-variant">
          ID: {bookingId}
        </p>
      </div>

      {/* Date & Time */}
      <div className="flex flex-col gap-0.5">
        <span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
          Date &amp; Time
        </span>
        <p className="text-sm font-bold uppercase text-on-surface">{date}</p>
        <p className="text-sm text-on-surface-variant">{timeRange}</p>
      </div>

      {/* Location */}
      <div>
        <span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
          Location
        </span>
        <p className="text-sm font-bold uppercase text-on-surface">
          {location}
        </p>
      </div>

      {/* Status */}
      <div>
        <span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
          Status
        </span>
        <Badge dot variant={isPending ? "pending" : "confirmed"}>
          {isPending ? "Pending" : "Confirmed"}
        </Badge>
      </div>

      {/* Action */}
      <div className="flex md:justify-end">
        <Button
          className="uppercase tracking-widest"
          size="sm"
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </article>
  )
}

export { BookingRow }

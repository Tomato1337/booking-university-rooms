import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { StatusIndicator } from "@/shared/ui/status-indicator";

export type BookingRowStatus = "pending" | "confirmed" | "rejected" | "cancelled";

export interface BookingRowProps extends ComponentProps<"article"> {
  /** Room display name, e.g. "RM_402 QUANTUM LAB" */
  roomName: string;
  /** Booking identifier, e.g. "#BK-88291-Q" */
  title: string;
  /** Formatted date string, e.g. "OCT 24, 2023" */
  date: string;
  /** Formatted time range, e.g. "14:00 — 16:30" */
  timeRange: string;
  /** Building/location, e.g. "SCIENCE BLOCK B" */
  location: string;
  /** Booking status */
  status: BookingRowStatus;
  /** Called when cancel button is clicked */
  onCancel?: () => void;
  /** Called when row is clicked */
  onOpen?: () => void;
  /** Disable cancel action button */
  cancelDisabled?: boolean;
}

function BookingRow({
  roomName,
  title,
  date,
  timeRange,
  location,
  status,
  onCancel,
  onOpen,
  cancelDisabled = false,
  className,
  ...props
}: BookingRowProps) {
  const badgeVariant =
    status === "pending" ? "pending" : status === "confirmed" ? "confirmed" : "booked";

  const indicatorStatus =
    status === "pending" ? "pending" : status === "confirmed" ? "available" : "booked";

  const statusLabel =
    status === "pending"
      ? "Pending"
      : status === "confirmed"
        ? "Confirmed"
        : status === "rejected"
          ? "Rejected"
          : "Cancelled";

  return (
    <article
      data-slot="booking-row"
      className={cn(
        "relative grid grid-cols-1 items-center gap-4 bg-surface-container-low px-8 py-8 pl-10 transition-all duration-100 ease-linear md:grid-cols-5",
        onOpen && "cursor-pointer hover:translate-x-1.5 hover:bg-accent/50",
        className,
      )}
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onOpen) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      {...props}
    >
      <StatusIndicator
        className="absolute top-0 bottom-0 left-0 rounded-none"
        orientation="vertical"
        status={indicatorStatus}
      />

      {/* Booking Details */}
      <div className="flex flex-col gap-0.5">
        <span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
          Booking Details
        </span>
        <p className="text-lg font-bold uppercase tracking-tighter text-on-surface">{roomName}</p>
        <p className="text-xs tracking-wider text-on-surface-variant">{title}</p>
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
        <p className="text-sm font-bold uppercase text-on-surface">{location}</p>
      </div>

      {/* Status */}
      <div>
        <span className="mb-1 text-[0.65rem] uppercase text-on-surface-variant md:hidden">
          Status
        </span>
        <Badge dot variant={badgeVariant}>
          {statusLabel}
        </Badge>
      </div>

      {/* Action */}
      <div className="flex md:justify-end">
        <Button
          className="uppercase tracking-widest"
          size="sm"
          type="button"
          variant="outline"
          disabled={cancelDisabled}
          onClick={(e) => {
            e.stopPropagation();
            onCancel?.();
          }}
        >
          Cancel
        </Button>
      </div>
    </article>
  );
}

export { BookingRow };

import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";

export type TimeSlotStatus = "available" | "booked" | "pending" | "yours" | "yours_pending";

export interface TimeSlot {
  /** Slot status determines color */
  status: TimeSlotStatus;
  /** CSS flex value (e.g. "1", "2", "10%") — controls relative width */
  flex?: string | number;
  /** Time label to show below the left edge of this slot */
  startLabel?: string;
  /** Time label to show below the right edge of this slot (typically only for the last slot) */
  endLabel?: string;
  /** Text label to display centered inside the slot bar */
  label?: string;
  /** Raw slot start in HH:mm */
  startTime?: string;
  /** Raw slot end in HH:mm */
  endTime?: string;
}

export interface TimeGridProps extends ComponentProps<"div"> {
  /** Array of time slots to render */
  slots: TimeSlot[];
  /** Title text, e.g. "Daily Occupancy" */
  title?: string;
  /** Subtitle text, e.g. "Today: Oct 24, 2024" */
  subtitle?: string;
  /** Whether to show the legend (defaults to true) */
  showLegend?: boolean;
  /** Called when user clicks a slot */
  onSlotSelect?: (slot: TimeSlot) => void;
}

const statusColorMap: Record<TimeSlotStatus, string> = {
  available: "bg-primary",
  booked: "bg-secondary",
  pending: "bg-tertiary",
  yours: "bg-primary border-dashed border-4 border-accent-foreground",
  yours_pending: "bg-tertiary border-dashed border-4 border-accent-foreground",
};

const statusLabelMap: Record<TimeSlotStatus, string> = {
  available: "Available",
  booked: "Booked",
  pending: "Pending",
  yours: "Your Session",
  yours_pending: "Your Pending",
};

const LEGEND_ORDER: TimeSlotStatus[] = ["available", "booked", "pending", "yours", "yours_pending"];

function TimeGrid({
  slots,
  title,
  subtitle,
  showLegend = true,
  onSlotSelect,
  className,
  ...props
}: TimeGridProps) {
  const presentStatuses = new Set(slots.map((s) => s.status));
  const legendItems = LEGEND_ORDER.filter((status) => presentStatuses.has(status)).map(
    (status) => ({ status, label: statusLabelMap[status] }),
  );

  return (
    <div data-slot="time-grid" className={cn("bg-surface-container-low p-8", className)} {...props}>
      {(title || subtitle) && (
        <div className="mb-6 flex items-end justify-between gap-4">
          {title ? (
            <h3 className="text-[1.75rem] font-bold tracking-tight text-on-surface">{title}</h3>
          ) : (
            <span />
          )}
          {subtitle && (
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="relative">
        <div className="flex h-16 w-full gap-[2px]">
          {slots.map((slot, index) => (
            <div
              key={`${index}-${slot.status}`}
              className={cn("group relative cursor-pointer", statusColorMap[slot.status])}
              style={{ flex: slot.flex ?? 1 }}
              onClick={() => onSlotSelect?.(slot)}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-150 ease-linear group-hover:opacity-100" />
              {slot.label && (
                <span className="absolute inset-0 flex items-center justify-center text-[0.6rem] font-black uppercase tracking-wider text-primary-foreground">
                  {slot.label}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex w-full gap-[2px]">
          {slots.map((slot, index) => (
            <div
              key={`label-${index}-${slot.status}`}
              style={{ flex: slot.flex ?? 1 }}
              className="flex items-center justify-center"
            >
              <span className="text-[0.65rem] font-bold whitespace-nowrap text-on-surface-variant">
                {slot.startTime ?? slot.startLabel} — {slot.endTime ?? slot.endLabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {showLegend && (
        <div className="mt-8 flex flex-wrap gap-6">
          {legendItems.map((item) => (
            <div key={item.status} className="flex items-center gap-2">
              <div className={cn("h-3 w-3 rounded-sm", statusColorMap[item.status])} />
              <span className="text-[0.7rem] font-bold uppercase tracking-widest text-on-surface-variant">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { TimeGrid };

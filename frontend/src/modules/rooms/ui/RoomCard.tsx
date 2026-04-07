import * as React from "react"
import { IconUser } from "@tabler/icons-react"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { StatusIndicator } from "@/shared/ui/status-indicator"

interface RoomCardEquipment {
  /** Tabler icon component */
  icon: React.ComponentType<{ className?: string; size?: number }>
  /** Equipment label, e.g. "Multi-Media" */
  label: string
}

interface RoomCardProps {
  /** Room display name, e.g. "LAB_402B" */
  roomName: string
  /** Availability state */
  available: boolean
  /** Availability label text, e.g. "AVAILABLE NOW" or "BOOKED UNTIL 16:00" */
  availabilityLabel: string
  /** Room capacity number */
  capacity: number
  /** Equipment list */
  equipment?: RoomCardEquipment[]
  /** Time range string for available rooms, e.g. "09:00 — 18:00" */
  timeRange?: string
  /** Called when Book Space is clicked (available rooms only) */
  onBook?: () => void
  /** Additional className */
  className?: string
}

function RoomCard({
  roomName,
  available,
  availabilityLabel,
  capacity,
  equipment = [],
  timeRange,
  onBook,
  className,
}: RoomCardProps) {
  return (
    <div
      data-slot="room-card"
      className={cn(
        "relative flex items-stretch overflow-hidden bg-surface-container-low transition-colors duration-150 ease-linear",
        !available && "grayscale opacity-50",
        className
      )}
    >
      <StatusIndicator
        status={available ? "available" : "booked"}
        orientation="vertical"
        className="w-1 self-stretch rounded-none"
      />

      <div className="flex flex-1 flex-col justify-between gap-6 p-6 md:flex-row md:items-center md:p-8">
        <div className="flex flex-col gap-1">
          <span
            className={cn(
              "mb-1 text-xs font-bold uppercase tracking-[0.15em]",
              available ? "text-primary" : "text-secondary"
            )}
          >
            {availabilityLabel}
          </span>

          <h4 className="text-[2.5rem] leading-none font-black uppercase tracking-tighter text-on-surface">
            {roomName}
          </h4>

          <div className="mt-2 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <IconUser size={16} className="text-on-surface-variant" />
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Cap. {capacity}
              </span>
            </div>

            {equipment.map((item) => {
              const EquipmentIcon = item.icon

              return (
                <div key={item.label} className="flex items-center gap-2">
                  <EquipmentIcon size={16} className="text-on-surface-variant" />
                  <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end">
          <span
            className={cn(
              "text-[1.75rem] font-black tracking-tighter",
              available ? "text-on-surface" : "text-on-surface-variant"
            )}
          >
            {available ? (timeRange ?? "--:-- — --:--") : "OCCUPIED"}
          </span>

          {available ? (
            <Button
              onClick={onBook}
              className="px-10 py-3 text-xs uppercase tracking-widest transition-colors duration-150 ease-linear"
            >
              Book Space
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled
              className="cursor-not-allowed px-10 py-3 text-xs uppercase tracking-widest transition-colors duration-150 ease-linear"
            >
              Unavailable
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export { RoomCard }
export type { RoomCardProps, RoomCardEquipment }

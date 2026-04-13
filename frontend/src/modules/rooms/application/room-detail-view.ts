import type { RoomDetail } from "../domain/types"
import type { TimeSlot } from "../ui/TimeGrid"

function parseHmToMinutes(value: string): number | null {
  const m = value.match(/^(\d{2}):(\d{2})$/)
  if (!m) return null

  const hh = Number(m[1])
  const mm = Number(m[2])

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null

  return hh * 60 + mm
}

function toUiSlotStatus(status: RoomDetail["timeSlots"][number]["status"]): TimeSlot["status"] {
  if (status === "occupied") return "booked"
  if (status === "yours_pending") return "yours_pending"
  return status
}

export function buildRoomDetailTimeGridSlots(timeSlots: RoomDetail["timeSlots"]): TimeSlot[] {
  if (timeSlots.length === 0) return []

  return timeSlots.map((slot) => {
    const startMin = parseHmToMinutes(slot.startTime) ?? 0
    const endMin = parseHmToMinutes(slot.endTime) ?? startMin + 30
    const minutes = Math.max(1, endMin - startMin)

    return {
      status: toUiSlotStatus(slot.status),
      flex: minutes,
      startLabel: slot.startTime,
      endLabel: slot.endTime,
      startTime: slot.startTime,
      endTime: slot.endTime,
      label: slot.status === "yours" ? "YOUR_SLOT" : slot.status === "yours_pending" ? "PENDING" : undefined,
    }
  })
}

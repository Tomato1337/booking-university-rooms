import type { components } from "@/shared/api/schema"

export type RoomCard = components["schemas"]["RoomCard"]
export type RoomAvailability = components["schemas"]["RoomAvailability"]
export type EquipmentItem = components["schemas"]["EquipmentItem"]
export type CursorPaginationMeta = components["schemas"]["CursorPaginationMeta"]
export type RoomDetail = components["schemas"]["RoomDetail"]
export type TimeSlotFromApi = components["schemas"]["TimeSlot"]
export type RoomType = components["schemas"]["RoomType"]

export interface RoomSearchFilters {
  date?: string
  search?: string
  building?: string
  timeFrom?: string
  timeTo?: string
  equipment?: string
  minCapacity?: number
  limit?: number
  cursor?: string
}

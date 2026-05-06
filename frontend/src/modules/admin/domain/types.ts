import type { components, operations } from "@/shared/api/schema"

type SchemaType<Name extends string> =
  components["schemas"][Name & keyof components["schemas"]]

export type AdminPendingBooking = components["schemas"]["AdminPendingBooking"]
export type AdminStats = components["schemas"]["AdminStats"]
export type RoomCard = components["schemas"]["RoomCard"]
export type EquipmentItem = components["schemas"]["EquipmentItem"]

export type AdminBookingUser = AdminPendingBooking["user"]
export type AdminBookingRoom = AdminPendingBooking["room"]

export type AutoRejectedBooking = operations["approveBooking"]["responses"][200]["content"]["application/json"]["data"]["autoRejected"][number]

export interface EquipmentUsageRoom {
  id: string
  name: string
}

export interface EquipmentDeleteResult {
  deleted: boolean
  usedInRooms: EquipmentUsageRoom[]
}
export type BookingStatusCount = SchemaType<"BookingStatusCount">
export type PopularRoom = SchemaType<"PopularRoom">
export type DayOfWeekCount = SchemaType<"DayOfWeekCount">
export type BuildingOccupancy = SchemaType<"BuildingOccupancy">

export type AdminTab = "bookings" | "rooms" | "buildings" | "roomTypes" | "equipment" | "purposes" | "statistics"

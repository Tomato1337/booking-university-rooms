import { apiClient } from "@/shared/api/client"

export interface BuildingOption {
  code: string
  label: string
}

export interface BookingPurposeOption {
  code: string
  label: string
}

export interface RoomTypeOption {
  code: string
  label: string
}

export interface AdminBookingPurpose {
  code: string
  labelRu: string
  labelEn: string
  isActive: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}

export interface AdminBuilding {
  code: string
  labelRu: string
  labelEn: string
  isActive: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}

export interface AdminRoomType {
  code: string
  labelRu: string
  labelEn: string
  isActive: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}

export interface BookingPurposeBody {
  code?: string
  labelRu: string
  labelEn: string
  isActive?: boolean
  sortOrder: number
}

export interface BuildingBody {
  code?: string
  labelRu: string
  labelEn: string
  isActive?: boolean
  sortOrder: number
}

export interface RoomTypeBody {
  code?: string
  labelRu: string
  labelEn: string
  isActive?: boolean
  sortOrder: number
}

export function listBuildings() {
  return apiClient.GET("/buildings" as never) as Promise<{
    data?: { data: BuildingOption[] }
    error?: unknown
  }>
}

export function listBookingPurposes() {
  return apiClient.GET("/booking-purposes" as never) as Promise<{
    data?: { data: BookingPurposeOption[] }
    error?: unknown
  }>
}

export function listRoomTypes() {
  return apiClient.GET("/room-types" as never) as Promise<{
    data?: { data: RoomTypeOption[] }
    error?: unknown
  }>
}

export function listAdminBookingPurposes() {
  return apiClient.GET("/admin/booking-purposes" as never) as Promise<{
    data?: { data: AdminBookingPurpose[] }
    error?: unknown
  }>
}

export function listAdminBuildings() {
  return apiClient.GET("/admin/buildings" as never) as Promise<{
    data?: { data: AdminBuilding[] }
    error?: unknown
  }>
}

export function listAdminRoomTypes() {
  return apiClient.GET("/admin/room-types" as never) as Promise<{
    data?: { data: AdminRoomType[] }
    error?: unknown
  }>
}

export function createBuilding(body: BuildingBody) {
  return apiClient.POST("/admin/buildings" as never, { body } as never) as Promise<{
    data?: { data: AdminBuilding }
    error?: unknown
  }>
}

export function updateBuilding(code: string, body: BuildingBody) {
  return apiClient.PUT("/admin/buildings/{code}" as never, {
    params: { path: { code } },
    body,
  } as never) as Promise<{ data?: { data: AdminBuilding }; error?: unknown }>
}

export function deactivateBuilding(code: string) {
  return apiClient.DELETE("/admin/buildings/{code}" as never, {
    params: { path: { code } },
  } as never)
}

export function reactivateBuilding(code: string) {
  return apiClient.PATCH("/admin/buildings/{code}/reactivate" as never, {
    params: { path: { code } },
  } as never) as Promise<{ data?: { data: AdminBuilding }; error?: unknown }>
}

export function hardDeleteBuilding(code: string) {
  return apiClient.DELETE("/admin/buildings/{code}/hard" as never, {
    params: { path: { code } },
  } as never)
}

export function createRoomType(body: RoomTypeBody) {
  return apiClient.POST("/admin/room-types" as never, { body } as never) as Promise<{
    data?: { data: AdminRoomType }
    error?: unknown
  }>
}

export function updateRoomType(code: string, body: RoomTypeBody) {
  return apiClient.PUT("/admin/room-types/{code}" as never, {
    params: { path: { code } },
    body,
  } as never) as Promise<{ data?: { data: AdminRoomType }; error?: unknown }>
}

export function deactivateRoomType(code: string) {
  return apiClient.DELETE("/admin/room-types/{code}" as never, {
    params: { path: { code } },
  } as never)
}

export function reactivateRoomType(code: string) {
  return apiClient.PATCH("/admin/room-types/{code}/reactivate" as never, {
    params: { path: { code } },
  } as never) as Promise<{ data?: { data: AdminRoomType }; error?: unknown }>
}

export function hardDeleteRoomType(code: string) {
  return apiClient.DELETE("/admin/room-types/{code}/hard" as never, {
    params: { path: { code } },
  } as never)
}

export function createBookingPurpose(body: BookingPurposeBody) {
  return apiClient.POST("/admin/booking-purposes" as never, { body } as never) as Promise<{
    data?: { data: AdminBookingPurpose }
    error?: unknown
  }>
}

export function updateBookingPurpose(code: string, body: BookingPurposeBody) {
  return apiClient.PUT("/admin/booking-purposes/{code}" as never, {
    params: { path: { code } },
    body,
  } as never) as Promise<{ data?: { data: AdminBookingPurpose }; error?: unknown }>
}

export function deactivateBookingPurpose(code: string) {
  return apiClient.DELETE("/admin/booking-purposes/{code}" as never, {
    params: { path: { code } },
  } as never)
}

export function reactivateBookingPurpose(code: string) {
  return apiClient.PATCH("/admin/booking-purposes/{code}/reactivate" as never, {
    params: { path: { code } },
  } as never) as Promise<{ data?: { data: AdminBookingPurpose }; error?: unknown }>
}

export function hardDeleteBookingPurpose(code: string) {
  return apiClient.DELETE("/admin/booking-purposes/{code}/hard" as never, {
    params: { path: { code } },
  } as never)
}

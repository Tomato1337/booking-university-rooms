import { apiClient } from "@/shared/api/client"

export interface BuildingOption {
  code: string
  label: string
}

export interface BookingPurposeOption {
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

export interface BookingPurposeBody {
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

export function listAdminBookingPurposes() {
  return apiClient.GET("/admin/booking-purposes" as never) as Promise<{
    data?: { data: AdminBookingPurpose[] }
    error?: unknown
  }>
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

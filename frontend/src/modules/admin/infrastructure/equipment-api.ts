import { apiClient } from "@/shared/api/client"

export interface EquipmentPayload {
  code: string
  labelRu: string
  labelEn: string
  icon: string
  isActive?: boolean
  sortOrder: number
}

export function listEquipment() {
  return apiClient.GET("/admin/equipment" as never) as Promise<{
    data?: { data: import("@/shared/api/schema").components["schemas"]["EquipmentItem"][] }
    error?: unknown
  }>
}

export function createEquipment(body: EquipmentPayload) {
  return apiClient.POST("/admin/equipment", { body })
}

export function updateEquipment(equipmentId: string, body: EquipmentPayload) {
  return apiClient.PUT("/admin/equipment/{equipmentId}", {
    params: { path: { equipmentId } },
    body,
  })
}

export function deleteEquipment(equipmentId: string) {
  return apiClient.DELETE("/admin/equipment/{equipmentId}", {
    params: { path: { equipmentId } },
  })
}

export function reactivateEquipment(equipmentId: string) {
  return apiClient.PATCH("/admin/equipment/{equipmentId}/reactivate" as never, {
    params: { path: { equipmentId } },
  } as never)
}

export function hardDeleteEquipment(equipmentId: string) {
  return apiClient.DELETE("/admin/equipment/{equipmentId}/hard" as never, {
    params: { path: { equipmentId } },
  } as never) as Promise<{
    data?: { data: { usedInRooms?: { id: string; name: string }[] } }
    error?: unknown
  }>
}

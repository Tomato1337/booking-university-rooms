import { apiClient } from "@/shared/api/client"

export interface EquipmentPayload {
  name: string
  icon: string
}

export function listEquipment() {
  return apiClient.GET("/equipment")
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

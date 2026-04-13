import { action, computed, withAsync, withAsyncData, wrap } from "@reatom/core"

import type { components } from "@/shared/api/schema"

import type { EquipmentPayload } from "../infrastructure/equipment-api"
import * as equipmentApi from "../infrastructure/equipment-api"

type EquipmentItem = components["schemas"]["EquipmentItem"]
type EquipmentDeleteResult = {
  deleted: boolean
}

export const equipmentListQuery = computed(async () => {
  const { data, error } = await wrap(equipmentApi.listEquipment())
  if (error || !data) {
    throw new Error("Failed to load equipment")
  }

  return data.data
}, "equipmentListQuery").extend(
  withAsyncData({
    initState: [] as EquipmentItem[],
    status: true,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
)

export const createEquipmentMutation = action(async (body: EquipmentPayload) => {
  const { data, error } = await wrap(equipmentApi.createEquipment(body))
  if (error || !data) {
    throw new Error("Failed to create equipment")
  }

  await wrap(equipmentListQuery.retry())
  return data.data
}, "createEquipmentMutation").extend(withAsync({ status: true }))

export const updateEquipmentMutation = action(
  async (payload: { equipmentId: string; body: EquipmentPayload }) => {
    const { data, error } = await wrap(equipmentApi.updateEquipment(payload.equipmentId, payload.body))
    if (error || !data) {
      throw new Error("Failed to update equipment")
    }

    await wrap(equipmentListQuery.retry())
    return data.data
  },
  "updateEquipmentMutation",
).extend(withAsync({ status: true }))

export const deleteEquipmentMutation = action(async (equipmentId: string) => {
  const { data, error } = await wrap(equipmentApi.deleteEquipment(equipmentId))
  if (error || !data) {
    throw new Error("Failed to delete equipment")
  }

  await wrap(equipmentListQuery.retry())

  const result: EquipmentDeleteResult = {
    deleted: true,
  }

  if (typeof result.deleted !== "boolean") {
    throw new Error("Invalid equipment delete result")
  }

  return result
}, "deleteEquipmentMutation").extend(withAsync({ status: true }))

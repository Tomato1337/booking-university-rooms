import { action, atom, reatomForm } from "@reatom/core"

import { createEquipmentSchema } from "../domain/schemas"
import type { EquipmentItem } from "../domain/types"

export type EquipmentFormMode = "create" | "edit"

function defaultValues() {
  return {
    name: "",
    icon: "IconVideo",
  }
}

export function toInitialValues(equipment?: EquipmentItem) {
  if (!equipment) return defaultValues()

  return {
    name: equipment.name,
    icon: equipment.icon,
  }
}

export const equipmentForm = reatomForm(defaultValues(), {
  name: "adminEquipmentForm",
  validateOnBlur: true,
  schema: createEquipmentSchema,
})

export const equipmentFormModeAtom = atom<EquipmentFormMode>("create", "admin.equipmentFormModeAtom")
export const equipmentFormOpenAtom = atom(false, "admin.equipmentFormOpenAtom")
export const equipmentFormEditingItemAtom = atom<EquipmentItem | undefined>(
  undefined,
  "admin.equipmentFormEditingItemAtom",
)

export const openCreateEquipmentFormAction = action(() => {
  equipmentFormModeAtom.set("create")
  equipmentFormEditingItemAtom.set(undefined)
  equipmentForm.reset(toInitialValues())
  equipmentFormOpenAtom.set(true)
}, "admin.openCreateEquipmentFormAction")

export const openEditEquipmentFormAction = action((item: EquipmentItem) => {
  equipmentFormModeAtom.set("edit")
  equipmentFormEditingItemAtom.set(item)
  equipmentForm.reset(toInitialValues(item))
  equipmentFormOpenAtom.set(true)
}, "admin.openEditEquipmentFormAction")

export const closeEquipmentFormAction = action(() => {
  equipmentFormOpenAtom.set(false)
  equipmentFormEditingItemAtom.set(undefined)
  equipmentFormModeAtom.set("create")
  equipmentForm.reset(toInitialValues())
}, "admin.closeEquipmentFormAction")

import { action, atom, reatomForm } from "@reatom/core"

import { createRoomSchema } from "../domain/schemas"
import type { RoomCard } from "../domain/types"

export type RoomFormMode = "create" | "edit"
export type RoomType = "lab" | "auditorium" | "seminar" | "conference" | "studio" | "lecture_hall"

function defaultValues() {
  return {
    name: "",
    building: "",
    roomType: "lab" as RoomType,
    capacity: 1,
    floor: 0,
    openTime: "08:00",
    closeTime: "20:00",
    equipmentIds: new Array<string>(),
    description: "",
    photos: new Array<string>(),
  }
}

export function toInitialValues(room?: RoomCard) {
  if (!room) return defaultValues()

  return {
    name: room.name,
    building: room.building,
    roomType: room.roomType,
    capacity: room.capacity,
    floor: room.floor,
    openTime: "08:00",
    closeTime: "20:00",
    equipmentIds: room.equipment.map((item) => item.id),
    description: "",
    photos: [],
  }
}

export const roomForm = reatomForm(defaultValues(), {
  name: "adminRoomForm",
  validateOnBlur: true,
  schema: createRoomSchema,
})

export const roomFormModeAtom = atom<RoomFormMode>("create", "admin.roomFormModeAtom")
export const roomFormOpenAtom = atom(false, "admin.roomFormOpenAtom")
export const roomFormEditingRoomAtom = atom<RoomCard | undefined>(
  undefined,
  "admin.roomFormEditingRoomAtom",
)

export const openCreateRoomFormAction = action(() => {
  roomFormModeAtom.set("create")
  roomFormEditingRoomAtom.set(undefined)
  roomForm.reset(toInitialValues())
  roomFormOpenAtom.set(true)
}, "admin.openCreateRoomFormAction")

export const openEditRoomFormAction = action((room: RoomCard) => {
  roomFormModeAtom.set("edit")
  roomFormEditingRoomAtom.set(room)
  roomForm.reset(toInitialValues(room))
  roomFormOpenAtom.set(true)
}, "admin.openEditRoomFormAction")

export const closeRoomFormAction = action(() => {
  roomFormOpenAtom.set(false)
  roomFormEditingRoomAtom.set(undefined)
  roomFormModeAtom.set("create")
  roomForm.reset(toInitialValues())
}, "admin.closeRoomFormAction")

import { z } from "zod/v4"

const hmRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const rejectReasonSchema = z.string().max(500).optional()

export const createEquipmentSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().min(1),
})

export const createRoomSchema = z
  .object({
    name: z.string().min(1).max(100),
    building: z.string().min(1).max(100),
    roomType: z.enum([
      "lab",
      "auditorium",
      "seminar",
      "conference",
      "studio",
      "lecture_hall",
    ]),
    capacity: z.number().int().min(1),
    floor: z.number().int().min(0),
    openTime: z.string().regex(hmRegex, "Time must be HH:mm"),
    closeTime: z.string().regex(hmRegex, "Time must be HH:mm"),
    equipmentIds: z.array(z.string()).default([]),
    description: z.string().max(1000).optional(),
    photos: z.array(z.string()).default([]),
  })
  .refine((value) => value.openTime < value.closeTime, {
    message: "closeTime must be after openTime",
    path: ["closeTime"],
  })

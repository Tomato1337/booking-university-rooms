import { z } from "zod/v4"

const fiveMinuteHmRegex = /^([01]\d|2[0-3]):([0-5][05])$/

export const rejectReasonSchema = z.string().max(500).optional()

export const createEquipmentSchema = z.object({
  name: z.string().min(1, "required").max(100, "maxLength"),
  icon: z.string().min(1, "required"),
})

export const createRoomSchema = z
  .object({
    name: z.string().min(1, "required").max(100, "maxLength"),
    building: z.string().min(1, "required").max(100, "maxLength"),
    roomType: z.enum([
        "lab",
        "auditorium",
        "seminar",
        "conference",
        "studio",
        "lecture_hall",
      ], { message: "required" }),
    capacity: z.number({ message: "required" }).int().min(1, "required"),
    floor: z.number({ message: "required" }).int().min(0, "required"),
    openTime: z.string().regex(fiveMinuteHmRegex, "invalidTime"),
    closeTime: z.string().regex(fiveMinuteHmRegex, "invalidTime"),
    equipmentIds: z.array(z.string()).default([]),
    description: z.string().max(1000, "maxLength").optional(),
    photos: z.array(z.string()).default([]),
  })
  .refine((value) => value.openTime < value.closeTime, {
    message: "timeOrder",
    path: ["closeTime"],
  })

import { z } from "zod/v4";

const hmHalfHourRegex = /^([01]\d|2[0-3]):(00|30)$/;

export const createBookingSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    purpose: z.enum([
      "academic_lecture",
      "research_workshop",
      "collaborative_study",
      "technical_assessment",
    ]),
    startTime: z.string().regex(hmHalfHourRegex, "Time must be HH:mm in 30-min steps"),
    endTime: z.string().regex(hmHalfHourRegex, "Time must be HH:mm in 30-min steps"),
    attendeeCount: z.union([z.number().int().min(1), z.undefined()]).optional(),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

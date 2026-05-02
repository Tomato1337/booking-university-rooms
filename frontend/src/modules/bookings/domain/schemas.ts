import { z } from "zod/v4";

const fiveMinuteHmRegex = /^([01]\d|2[0-3]):([0-5][05])$/;

export const createBookingSchema = z
  .object({
    title: z.string().min(1, "titleRequired"),
    purpose: z.enum([
      "academic_lecture",
      "research_workshop",
      "collaborative_study",
      "technical_assessment",
    ]),
    startTime: z.string().regex(fiveMinuteHmRegex, "timeFormat"),
    endTime: z.string().regex(fiveMinuteHmRegex, "timeFormat"),
    attendeeCount: z.union([z.number().int().min(1), z.undefined()]).optional(),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "endBeforeStart",
    path: ["endTime"],
  });

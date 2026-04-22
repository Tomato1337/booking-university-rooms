import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z.email("invalidEmail"),
  password: z.string().min(1, "passwordRequired"),
});

export const registerSchema = z.object({
  email: z.email("invalidEmail"),
  password: z
    .string()
    .min(8, "passwordMinLength")
    .regex(/[A-Z]/, "passwordUppercase")
    .regex(/[a-z]/, "passwordLowercase")
    .regex(/\d/, "passwordDigit"),
  confirmPassword: z.string().min(1, "confirmPasswordRequired"),
  firstName: z.string().min(1, "firstNameRequired"),
  lastName: z.string().min(1, "lastNameRequired"),
  department: z.string().optional(),
});

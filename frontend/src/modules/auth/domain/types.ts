import type { components } from "@/shared/api/schema";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";
export type User = components["schemas"]["User"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type RegisterRequest = components["schemas"]["RegisterRequest"];

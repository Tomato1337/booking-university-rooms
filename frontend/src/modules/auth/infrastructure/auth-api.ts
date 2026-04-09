import { apiClient } from "@/shared/api/client";
import type { LoginRequest, RegisterRequest } from "../domain/types";

export function login(body: LoginRequest) {
  return apiClient.POST("/auth/login", { body });
}

export function register(body: RegisterRequest) {
  return apiClient.POST("/auth/register", { body });
}

export function refreshToken() {
  return apiClient.POST("/auth/refresh");
}

export function logout() {
  return apiClient.POST("/auth/logout");
}

export function getMe() {
  return apiClient.GET("/auth/me");
}

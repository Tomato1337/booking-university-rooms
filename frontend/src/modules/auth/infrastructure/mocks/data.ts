import type { User } from "../../domain/types";

export const currentUserMock: User = {
  id: "d290f1ee-6c54-4b01-90e6-d701748f0851",
  createdAt: "2025-09-15T10:30:00.000Z",
  firstName: "Alex",
  lastName: "Foxer",
  email: "alex@example.com",
  role: "admin",
};

let hasValidAccessToken = true;
let hasValidRefreshToken = true;

export function getAuthState() {
  return { hasValidAccessToken, hasValidRefreshToken };
}

export function simulateLogin() {
  hasValidAccessToken = true;
  hasValidRefreshToken = true;
}

export function simulateLogout() {
  hasValidAccessToken = false;
  hasValidRefreshToken = false;
}

export function simulateAccessExpired() {
  hasValidAccessToken = false;
}

export function simulateFullExpiry() {
  hasValidAccessToken = false;
  hasValidRefreshToken = false;
}

export function simulateRefreshSuccess() {
  hasValidAccessToken = true;
}

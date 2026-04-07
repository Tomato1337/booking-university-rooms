import { HttpResponse, delay } from "msw";

import { http } from "@/shared/mocks/http";
import { to401 } from "@/shared/mocks/utils";

import {
  currentUserMock,
  getAuthState,
  simulateLogin,
  simulateLogout,
  simulateRefreshSuccess,
} from "./data";

export const authMe = {
  default: http.get("/auth/me", ({ response }) => {
    const { hasValidAccessToken } = getAuthState();
    if (!hasValidAccessToken) {
      return to401("Access token expired");
    }
    return response(200).json({ data: currentUserMock });
  }),
};

export const authLogin = {
  default: http.post("/auth/login", async ({ request, response }) => {
    const body = await request.json();
    if (body.email === "alex@example.com" && body.password === "Password1") {
      simulateLogin();
      return response(200).json({
        data: { user: currentUserMock, accessToken: "mock-access-token" },
      });
    }
    return to401("Invalid email or password");
  }),
};

export const authRegister = {
  default: http.post("/auth/register", async ({ request, response }) => {
    const body = await request.json();
    simulateLogin();
    return response(201).json({
      data: {
        user: {
          ...currentUserMock,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          department: body.department ?? null,
          role: "user" as const,
        },
        accessToken: "mock-access-token",
      },
    });
  }),
};

export const authRefresh = {
  default: http.post("/auth/refresh", async ({ response }) => {
    await delay(100);
    const { hasValidRefreshToken } = getAuthState();
    if (!hasValidRefreshToken) {
      return to401("Refresh token expired");
    }
    simulateRefreshSuccess();
    return response(200).json({ data: { accessToken: "mock-refreshed-token" } });
  }),
};

export const authLogout = {
  default: http.post("/auth/logout", () => {
    simulateLogout();
    return new HttpResponse(null, { status: 204 });
  }),
};

export const authMockHandlers = [
  authMe.default,
  authLogin.default,
  authRegister.default,
  authRefresh.default,
  authLogout.default,
];

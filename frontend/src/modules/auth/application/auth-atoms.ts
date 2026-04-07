import type { components } from "@/shared/api/schema";

import { action, atom, wrap } from "@reatom/core";

import type { AuthStatus } from "../domain/types";
import * as authApi from "../infrastructure/auth-api";
import {
  clearAccessToken,
  setAccessToken,
  setOnAuthFailure,
} from "../infrastructure/token-storage";

type User = components["schemas"]["User"];

export const authStatusAtom = atom<AuthStatus>("idle", "authStatusAtom");
export const currentUserAtom = atom<User | null>(null, "currentUserAtom");
export const authErrorAtom = atom<string | null>(null, "authErrorAtom");

export const checkAuthAction = action(async () => {
  authStatusAtom.set("loading");
  const { data, error } = await wrap(authApi.getMe());
  if (error || !data) {
    authStatusAtom.set("unauthenticated");
    return;
  }
  currentUserAtom.set(data.data);
  authStatusAtom.set("authenticated");
}, "checkAuthAction");

export const loginAction = action(async (credentials: components["schemas"]["LoginRequest"]) => {
  authErrorAtom.set(null);
  authStatusAtom.set("loading");
  const { data, error } = await wrap(authApi.login(credentials));
  if (error || !data) {
    authStatusAtom.set("unauthenticated");
    authErrorAtom.set("Invalid email or password");
    return;
  }
  setAccessToken(data.data.accessToken);
  currentUserAtom.set(data.data.user);
  authStatusAtom.set("authenticated");
}, "loginAction");

export const registerAction = action(
  async (credentials: components["schemas"]["RegisterRequest"]) => {
    authErrorAtom.set(null);
    authStatusAtom.set("loading");
    const { data, error } = await wrap(authApi.register(credentials));
    if (error || !data) {
      authStatusAtom.set("unauthenticated");
      authErrorAtom.set("Registration failed");
      return;
    }
    setAccessToken(data.data.accessToken);
    currentUserAtom.set(data.data.user);
    authStatusAtom.set("authenticated");
  },
  "registerAction",
);

export const logoutAction = action(async () => {
  await wrap(authApi.logout());
  clearAccessToken();
  currentUserAtom.set(null);
  authStatusAtom.set("unauthenticated");
}, "logoutAction");

// Wire auth failure callback — when refresh token fully expires
setOnAuthFailure(() => {
  currentUserAtom.set(null);
  authStatusAtom.set("unauthenticated");
});

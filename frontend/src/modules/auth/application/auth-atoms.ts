import { action, atom, computed, withAsync, wrap } from "@reatom/core"

import type { AuthStatus, LoginRequest, RegisterRequest, User } from "../domain/types"
import * as authApi from "../infrastructure/auth-api"
import { setOnAuthFailure } from "../infrastructure/token-storage"

export const currentUserAtom = atom<User | null>(null, "currentUserAtom")
export const authErrorAtom = atom<string | null>(null, "authErrorAtom")

export const checkAuthAction = action(async () => {
  const { data, error } = await wrap(authApi.getMe())
  if (error || !data) {
    currentUserAtom.set(null)
    return null
  }

  currentUserAtom.set(data.data)
  return data.data
}, "checkAuthAction").extend(withAsync({ status: true }))

export const loginAction = action(async (credentials: LoginRequest) => {
  authErrorAtom.set(null)

  const { data, error } = await wrap(authApi.login(credentials))
  if (error || !data) {
    authErrorAtom.set("Invalid email or password")
    throw new Error("Invalid email or password")
  }

  currentUserAtom.set(data.data.user)
  return data.data.user
}, "loginAction").extend(withAsync({ status: true }))

export const registerAction = action(async (credentials: RegisterRequest) => {
  authErrorAtom.set(null)

  const { data, error } = await wrap(authApi.register(credentials))
  if (error || !data) {
    authErrorAtom.set("Registration failed")
    throw new Error("Registration failed")
  }

  currentUserAtom.set(data.data.user)
  return data.data.user
}, "registerAction").extend(withAsync({ status: true }))

export const logoutAction = action(async () => {
  await wrap(authApi.logout())
  currentUserAtom.set(null)
  authErrorAtom.set(null)
  return true
}, "logoutAction").extend(withAsync({ status: true }))

export const authStatusAtom = computed((): AuthStatus => {
  if (!checkAuthAction.status().isEverSettled && checkAuthAction.status().isPending) {
    return "loading"
  }

  if (checkAuthAction.status().isPending) {
    return "loading"
  }

  if (currentUserAtom()) {
    return "authenticated"
  }

  if (checkAuthAction.status().isEverSettled) {
    return "unauthenticated"
  }

  return "idle"
}, "authStatusAtom")

// Wire auth failure callback — when refresh token fully expires
setOnAuthFailure(() => {
  currentUserAtom.set(null)
})

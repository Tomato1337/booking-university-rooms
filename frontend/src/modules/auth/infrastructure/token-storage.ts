let accessToken: string | undefined
let onAuthFailureCb: (() => void) | undefined

export function getAccessToken(): string | undefined {
  return accessToken
}

export function setAccessToken(token: string | undefined): void {
  accessToken = token
}

export function clearAccessToken(): void {
  accessToken = undefined
}

export function setOnAuthFailure(fn: () => void): void {
  onAuthFailureCb = fn
}

export function fireAuthFailure(): void {
  onAuthFailureCb?.()
}

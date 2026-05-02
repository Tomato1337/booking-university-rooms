let onAuthFailureCb: (() => void) | undefined

export function setOnAuthFailure(fn: () => void): void {
  onAuthFailureCb = fn
}

export function fireAuthFailure(): void {
  onAuthFailureCb?.()
}

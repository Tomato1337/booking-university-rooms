import type { RequestHandler } from "msw"
import { setupWorker } from "msw/browser"

export function startMockWorker(...handlers: RequestHandler[]) {
  const worker = setupWorker(...handlers)
  return worker.start({ onUnhandledRequest: "bypass" })
}

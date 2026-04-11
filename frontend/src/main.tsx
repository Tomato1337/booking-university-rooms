import "./setup"

import { reatomContext } from "@reatom/react"
import { createRoot } from "react-dom/client"

import { checkAuthAction } from "@/modules/auth"
import App from "./app/App"
import { rootFrame } from "./setup"

async function bootstrap() {
  if (import.meta.env.DEV) {
    const { startMockWorker } = await import("@/shared/mocks/browser")
    const { authMockHandlers } = await import("@/modules/auth")
    const { roomsMockHandlers } = await import("@/modules/rooms")
    await startMockWorker(...authMockHandlers, ...roomsMockHandlers)
  }

  rootFrame.run(checkAuthAction)

  createRoot(document.getElementById("root")!).render(
    <reatomContext.Provider value={rootFrame}>
      <App />
    </reatomContext.Provider>,
  )
}

bootstrap()

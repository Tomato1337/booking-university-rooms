import { clearStack, connectLogger, context } from "@reatom/core"

import { installAuthMiddleware } from "@/modules/auth"

clearStack()

export const rootFrame = context.start()

installAuthMiddleware()

if (import.meta.env.DEV) {
  rootFrame.run(connectLogger)
}

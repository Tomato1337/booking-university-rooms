import { clearStack, context } from "@reatom/core";
import { connectLogger } from "@reatom/core";

import { installAuthMiddleware } from "@/modules/auth";

clearStack();

export const rootFrame = context.start();

installAuthMiddleware();

if (import.meta.env.DEV) {
  // TEMP: disabled to unmask real errors hidden by connectLogger crash
  rootFrame.run(connectLogger);
}

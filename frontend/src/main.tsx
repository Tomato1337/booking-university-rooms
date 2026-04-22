import "./setup";

import { reatomContext } from "@reatom/react";
import { ThemeProvider } from "next-themes";
import { createRoot } from "react-dom/client";

import { checkAuthAction } from "@/modules/auth";
import App from "./app/App";
import { rootFrame } from "./setup";
import { Toaster } from "./shared/ui/sonner";

async function bootstrap() {
  if (import.meta.env.DEV) {
    const { startMockWorker } = await import("@/shared/mocks/browser");
    const { authMockHandlers } = await import("@/modules/auth");
    const { roomsMockHandlers } = await import("@/modules/rooms");
    const { bookingsMockHandlers } = await import("@/modules/bookings");
    const { adminMockHandlers } = await import("@/modules/admin/infrastructure/mocks/handlers");
    await startMockWorker(
      ...authMockHandlers,
      ...roomsMockHandlers,
      ...bookingsMockHandlers,
      ...adminMockHandlers,
    );
  }

  rootFrame.run(checkAuthAction);

  createRoot(document.getElementById("root")!).render(
    <reatomContext.Provider value={rootFrame}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <Toaster />
        <App />
      </ThemeProvider>
    </reatomContext.Provider>,
  );
}

bootstrap();

import "./index.css";

import type { ReactNode } from "react";

import { urlAtom, withChangeHook } from "@reatom/core";
import { reatomComponent } from "@reatom/react";
import { IconLoader2 } from "@tabler/icons-react";

import { authStatusAtom, currentUserAtom } from "@/modules/auth";
import { roomsBackHrefAtom } from "@/modules/rooms";
import { AppSidebar } from "@/modules/sidebar/ui/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/shared/ui/sidebar";

import {
  authRoute,
  bookingsRoute,
  dashboardRoute,
  roomDetailRoute,
  roomsRoute,
  rootRoute,
} from "./routes";

function isRoomsBackHrefValid(href: string | null, roomsHref: string): href is string {
  if (!href) return false;

  return href === roomsHref || href.startsWith(`${roomsHref}?`);
}

urlAtom.extend(
  withChangeHook(() => {
    if (rootRoute.exact()) {
      dashboardRoute.go(undefined, true);
    }
  }),
);

interface PageMeta {
  route: { match(): unknown };
  title: string;
  parent?: {
    route: { path(): string };
    title: string;
  };
}

const pageMeta: PageMeta[] = [
  { route: dashboardRoute, title: "Dashboard" },
  {
    route: roomDetailRoute,
    title: "LAB_402_OMEGA",
    parent: { route: roomsRoute, title: "Room Search" },
  },
  { route: roomsRoute, title: "Room Search" },
  { route: bookingsRoute, title: "My Bookings" },
];

const App = reatomComponent(() => {
  const status = authStatusAtom();
  const roomsBackHref = roomsBackHrefAtom();

  if (status === "loading" || status === "idle") {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <IconLoader2 className="animate-spin size-24 text-on-surface-variant" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    if (!authRoute.match()) {
      authRoute.go(undefined, true);
    }
    return <>{authRoute.render()}</>;
  }

  // authenticated — redirect away from auth page
  if (authRoute.match()) {
    dashboardRoute.go(undefined, true);
  }

  if (dashboardRoute.match() && currentUserAtom()?.role !== "admin") {
    roomsRoute.go(undefined, true);
  }

  const currentPage = pageMeta.find(({ route }) => route.match());
  const roomsHref = roomsRoute.path();
  const roomDetailParentHref = isRoomsBackHrefValid(roomsBackHref, roomsHref)
    ? roomsBackHref
    : roomsHref;

  const parentHref =
    currentPage?.route === roomDetailRoute
      ? roomDetailParentHref
      : currentPage?.parent?.route.path();

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex w-full flex-col relative">
        <header className="sticky top-0 z-20 flex min-h-18 items-center gap-4 border-b border-surface-container-high bg-sidebar px-6">
          <SidebarTrigger className="ml-1" />
          {currentPage?.parent && (
            <>
              <a
                href={parentHref}
                className="text-lg font-black uppercase tracking-widest text-on-surface-variant transition-colors duration-150 ease-linear hover:text-on-surface"
              >
                {currentPage.parent.title}
              </a>
              <span className="text-on-surface-variant/50">/</span>
            </>
          )}
          <h1 className="text-lg font-black tracking-widest uppercase text-on-surface">
            {currentPage?.title ?? ""}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto">{rootRoute.render() as ReactNode}</main>
      </div>
    </SidebarProvider>
  );
}, "App");

export default App;

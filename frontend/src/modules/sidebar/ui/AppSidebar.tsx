import { reatomComponent } from "@reatom/react";
import { IconLayoutDashboard, IconSearch, IconCalendarEvent } from "@tabler/icons-react";

import { currentUserAtom } from "@/modules/auth";
import { dashboardRoute } from "@/pages/dashboard";
import { roomsRoute } from "@/pages/rooms";
import { bookingsRoute } from "@/pages/bookings";
import Logo from "@/shared/ui/logo";
import { Button } from "@/shared/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/shared/ui/sidebar";

import UserCard from "./UserCard";

export const AppSidebar = reatomComponent(() => {
  const user = currentUserAtom();
  const navItems = [
    ...(user?.role === "admin"
      ? [{ route: dashboardRoute, icon: IconLayoutDashboard, label: "Dashboard" }]
      : []),
    { route: roomsRoute, icon: IconSearch, label: "Room Search" },
    { route: bookingsRoute, icon: IconCalendarEvent, label: "My Bookings" },
  ] as const;

  return (
    <Sidebar>
      <SidebarHeader className="">
        <a href={dashboardRoute.path()} className="flex items-center gap-2 cursor-pointer">
          <Logo />
        </a>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="flex flex-col gap-1">
          {navItems.map(({ route, icon: Icon, label }) => {
            const isActive = route.match();
            return (
              <a key={label} href={route.path()}>
                <Button
                  variant={isActive ? "sidebar-active" : "ghost"}
                  size="lg"
                  className="w-full cursor-pointer justify-start gap-4 px-4 py-8 text-xl hover:bg-primary-dim"
                >
                  <Icon className="size-6" />
                  {label}
                </Button>
              </a>
            );
          })}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-6">
        <UserCard />
      </SidebarFooter>
    </Sidebar>
  );
}, "AppSidebar");

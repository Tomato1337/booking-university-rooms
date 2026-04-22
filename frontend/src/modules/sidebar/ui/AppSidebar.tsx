import { reatomComponent } from "@reatom/react";
import { IconLayoutDashboard, IconSearch, IconCalendarEvent } from "@tabler/icons-react";

import { currentUserAtom } from "@/modules/auth";
import { LanguageSwitcher, tAtom } from "@/modules/i18n";
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
import { ThemeSwitcher } from "@/shared/ui/theme-switcher";

import UserCard from "./UserCard";

export const AppSidebar = reatomComponent(() => {
  const user = currentUserAtom();
  const t = tAtom();
  const navItems = [
    ...(user?.role === "admin"
      ? [{ route: dashboardRoute, icon: IconLayoutDashboard, label: t.sidebar.dashboard }]
      : []),
    { route: roomsRoute, icon: IconSearch, label: t.sidebar.roomSearch },
    { route: bookingsRoute, icon: IconCalendarEvent, label: t.sidebar.myBookings },
  ] as const;

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between pr-4">
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
                  className="w-full cursor-pointer justify-start gap-4 px-4 py-8 text-lg font-bold tracking-tight uppercase hover:bg-primary-dim"
                >
                  <Icon className="size-6" />
                  {label}
                </Button>
              </a>
            );
          })}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
        <UserCard />
      </SidebarFooter>
    </Sidebar>
  );
}, "AppSidebar");

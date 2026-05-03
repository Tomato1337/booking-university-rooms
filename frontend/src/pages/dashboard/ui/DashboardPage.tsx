import { atom, withSearchParams } from "@reatom/core";
import { reatomComponent, useWrap } from "@reatom/react";

import { type AdminTab } from "@/modules/admin";
import { tAtom } from "@/modules/i18n";
import { rootRoute } from "@/shared/router";

import { BookingsTab } from "./BookingsTab";
import { EquipmentTab } from "./EquipmentTab";
import { PurposesTab } from "./PurposesTab";
import { RoomsTab } from "./RoomsTab";
import { StatisticsTab } from "./StatisticsTab";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

const dashboardTabs: AdminTab[] = ["bookings", "rooms", "equipment", "purposes", "statistics"];

function isAdminTab(value: string | null | undefined): value is AdminTab {
  return dashboardTabs.includes((value ?? "") as AdminTab);
}

export const activeTabAtom = atom<AdminTab>("bookings", "dashboard.activeTab").extend(
  withSearchParams("tab", {
    parse: (value) => (isAdminTab(value) ? value : "bookings"),
    serialize: (value) => (value === "bookings" ? undefined : value),
  }),
);

const DashboardTabs = reatomComponent(() => {
  const activeTab = activeTabAtom();
  const t = tAtom();
  const wrapSetTab = useWrap((tab: AdminTab) => activeTabAtom.set(tab));

  return (
    <div className="flex items-center gap-6">
      {dashboardTabs.map((tab) => {
        return (
          <Button
            key={tab}
            type="button"
            variant={"tab"}
            className={cn("-ml-2", {
              "text-primary font-black": tab === activeTab,
            })}
            onClick={() => wrapSetTab(tab)}
          >
            {t.admin.dashboard.tabs[tab]}
          </Button>
        );
      })}
    </div>
  );
});

const DashboardPage = reatomComponent(() => {
  const activeTab = activeTabAtom();
  const t = tAtom();

  return (
    <div data-slot="dashboard-page" className="flex min-h-full min-w-0 flex-col gap-10 px-6 py-8 md:px-10 overflow-hidden">
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="mb-2 text-[3.5rem] font-black uppercase leading-[0.9] tracking-tighter">
            {t.admin.dashboard.title}
          </h2>
          <div className="h-2 w-16 bg-primary" />
        </div>

        <DashboardTabs />
      </section>

      {activeTab === "bookings" && <BookingsTab />}

      {activeTab === "rooms" && <RoomsTab />}

      {activeTab === "equipment" && <EquipmentTab />}

      {activeTab === "purposes" && <PurposesTab />}

      {activeTab === "statistics" && <StatisticsTab />}
    </div>
  );
}, "DashboardPage");

export const dashboardRoute = rootRoute.reatomRoute(
  {
    path: "dashboard",
    render: () => <DashboardPage />,
  },
  "dashboard",
);

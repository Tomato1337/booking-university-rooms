import { atom, withSearchParams } from "@reatom/core";
import { reatomComponent, useWrap } from "@reatom/react";

import { type AdminTab } from "@/modules/admin";
import { rootRoute } from "@/shared/router";

import { BookingsTab } from "./BookingsTab";
import { EquipmentTab } from "./EquipmentTab";
import { RoomsTab } from "./RoomsTab";
import { StatisticsTab } from "./StatisticsTab";

const dashboardTabs: AdminTab[] = ["bookings", "rooms", "equipment", "statistics"];

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
  const wrapSetTab = useWrap((tab: AdminTab) => activeTabAtom.set(tab));

  return (
    <div className="flex items-center gap-6">
      {dashboardTabs.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => wrapSetTab(tab)}
            className={
              isActive
                ? "text-sm font-black uppercase tracking-widest text-primary"
                : "text-sm font-bold uppercase tracking-widest text-on-surface-variant transition-colors duration-150 ease-linear hover:text-on-surface"
            }
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
});

const DashboardPage = reatomComponent(() => {
  const activeTab = activeTabAtom();

  return (
    <div data-slot="dashboard-page" className="flex min-h-full flex-col gap-10 px-6 py-8 md:px-10">
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="mb-2 text-[3.5rem] font-black uppercase leading-[0.9] tracking-tighter">
            Dashboard
          </h2>
          <div className="h-2 w-16 bg-primary" />
        </div>

        <DashboardTabs />
      </section>

      {activeTab === "bookings" && <BookingsTab />}

      {activeTab === "rooms" && <RoomsTab />}

      {activeTab === "equipment" && <EquipmentTab />}

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

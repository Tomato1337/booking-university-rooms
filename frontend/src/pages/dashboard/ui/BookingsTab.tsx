

import { reatomComponent, useWrap } from "@reatom/react";
import { useEffect, useRef, useState } from "react";

import {
  AdminBookingRow,
  adminStatsQuery,
  loadMorePendingBookingsAction,
  pendingBookingsListAtom,
  pendingBookingsQuery,
  pendingHasMoreAtom,
  pendingSearchAtom,
  searchPendingBookingsAction,
  updatePendingSearchAction,
  loadMoreHistoryBookingsAction,
  historyBookingsListAtom,
  historyBookingsQuery,
  historyHasMoreAtom,
  historySearchAtom,
  searchHistoryBookingsAction,
  updateHistorySearchAction,
} from "@/modules/admin";
import { MetricCard, MetricLabel, MetricValue } from "@/shared/ui/metric-card";
import { Button } from "@/shared/ui/button";
import Search from "@/shared/ui/search";
import { cn } from "@/shared/lib/utils";

type BookingsTabType = "active" | "history";

export const BookingsTab = reatomComponent(() => {
  const [activeTab, setActiveTab] = useState<BookingsTabType>("active");

  const stats = adminStatsQuery.data();

  const pendingBookings = pendingBookingsListAtom();
  const pendingQuery = pendingSearchAtom();
  const hasMorePending = pendingHasMoreAtom();
  const pendingStatus = pendingBookingsQuery.status();

  const historyBookings = historyBookingsListAtom();
  const historyQuery = historySearchAtom();
  const hasMoreHistory = historyHasMoreAtom();
  const historyStatus = historyBookingsQuery.status();

  const sentinelRef = useRef<HTMLDivElement>(null);

  const currentBookings = activeTab === "active" ? pendingBookings : historyBookings;
  const currentQuery = activeTab === "active" ? pendingQuery : historyQuery;
  const hasMore = activeTab === "active" ? hasMorePending : hasMoreHistory;
  const isFirstPending =
    activeTab === "active" ? pendingStatus.isFirstPending : historyStatus.isFirstPending;
  const isPending = activeTab === "active" ? pendingStatus.isPending : historyStatus.isPending;

  const wrapSearch = useWrap((value: string) => {
    if (activeTab === "active") {
      updatePendingSearchAction(value);
    } else {
      updateHistorySearchAction(value);
    }
  });

  const wrapLoadMore = useWrap(() => {
    if (activeTab === "active") {
      loadMorePendingBookingsAction();
    } else {
      loadMoreHistoryBookingsAction();
    }
  });

  const wrapActivate = useWrap(() => {
    searchPendingBookingsAction();
    searchHistoryBookingsAction();
  });

  useEffect(() => {
    wrapActivate();
  }, [wrapActivate]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && hasMore && !isPending) {
          wrapLoadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isPending, wrapLoadMore]);

  return (
    <section data-slot="dashboard-bookings-tab" className="flex flex-1 flex-col gap-6">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <MetricCard stripe="pending">
          <MetricLabel>Pending Requests</MetricLabel>
          <MetricValue>{stats.pendingCount}</MetricValue>
        </MetricCard>
        <MetricCard stripe="available">
          <MetricLabel>Today Bookings</MetricLabel>
          <MetricValue>{stats.todayBookingsCount}</MetricValue>
        </MetricCard>
        <MetricCard stripe="booked">
          <MetricLabel>Occupancy Rate</MetricLabel>
          <MetricValue>{stats.occupancyRate}%</MetricValue>
        </MetricCard>
        <MetricCard stripe="available">
          <MetricLabel>Active Rooms</MetricLabel>
          <MetricValue>{stats.totalActiveRooms}</MetricValue>
        </MetricCard>
      </section>

      <section className="flex flex-1 flex-col gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[1.75rem] font-black uppercase tracking-tighter">Bookings</h3>
          <div className="flex items-center gap-6">
            <Button
              type="button"
              variant={"tab"}
              className={cn("-mr-2", {
                "text-primary font-black": activeTab === "active",
              })}
              onClick={() => setActiveTab("active")}
            >
              Active
            </Button>

            <Button
              type="button"
              variant={"tab"}
              className={cn("-mr-2", {
                "text-primary font-black": activeTab === "history",
              })}
              onClick={() => setActiveTab("history")}
            >
              History
            </Button>
          </div>
        </div>

        <div className="flex flex-col">
          <Search
            query={currentQuery}
            wrapSearch={wrapSearch}
            placeholder={"SEARCH BY USER, ROOM, BUILDING, OR TITLE..."}
          />

          <div className="hidden bg-surface-container-high px-8 pl-10 py-4 md:grid md:grid-cols-5 gap-4">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              User
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Booking Details
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Date &amp; Time
            </span>
            <span className="text-left text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Status
            </span>
            <span className="text-right text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Actions
            </span>
          </div>

          <div className="flex flex-col gap-1 bg-surface-container-lowest">
            {isFirstPending ? (
              <div className="flex items-center justify-center bg-surface-container-low py-20">
                <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                  Loading bookings...
                </p>
              </div>
            ) : currentBookings.length > 0 ? (
              currentBookings.map((booking) => (
                <AdminBookingRow
                  key={booking.id}
                  booking={booking}
                  isHistory={activeTab === "history"}
                />
              ))
            ) : (
              <div className="flex items-center justify-center bg-surface-container-low py-20">
                <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                  No {activeTab === "active" ? "pending requests" : "history"} match your search
                </p>
              </div>
            )}
          </div>

          {hasMore && <div ref={sentinelRef} className="h-1" />}
        </div>
      </section>
    </section>
  );
}, "BookingsTab");

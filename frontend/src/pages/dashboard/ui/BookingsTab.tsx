import { IconSearch } from "@tabler/icons-react";

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
import { Input } from "@/shared/ui/input";
import { MetricCard, MetricLabel, MetricValue } from "@/shared/ui/metric-card";

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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentBookings = activeTab === "active" ? pendingBookings : historyBookings;
  const currentQuery = activeTab === "active" ? pendingQuery : historyQuery;
  const hasMore = activeTab === "active" ? hasMorePending : hasMoreHistory;
  const isFirstPending = activeTab === "active" ? pendingStatus.isFirstPending : historyStatus.isFirstPending;
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
            <button
              type="button"
              className={
                activeTab === "active"
                  ? "text-sm font-black uppercase tracking-widest text-primary"
                  : "text-sm font-bold uppercase tracking-widest text-on-surface-variant transition-colors duration-150 ease-linear hover:text-on-surface"
              }
              onClick={() => setActiveTab("active")}
            >
              Active
            </button>
            <button
              type="button"
              className={
                activeTab === "history"
                  ? "text-sm font-black uppercase tracking-widest text-primary"
                  : "text-sm font-bold uppercase tracking-widest text-on-surface-variant transition-colors duration-150 ease-linear hover:text-on-surface"
              }
              onClick={() => setActiveTab("history")}
            >
              History
            </button>
          </div>
        </div>

        <div className="flex flex-col">
          <div
            onClick={() => {
              if (searchInputRef.current) {
                searchInputRef.current.focus();
              }
            }}
            className="flex items-center gap-3 bg-surface-container px-6 py-4"
          >
            <IconSearch size={18} className="shrink-0 text-primary" />
            <Input
              ref={searchInputRef}
              type="text"
              value={currentQuery}
              onChange={useWrap((e) => wrapSearch(e.target.value))}
              placeholder="SEARCH BY USER, ROOM, BUILDING, OR TITLE..."
              className="w-full border-none bg-transparent text-sm font-bold uppercase tracking-widest text-on-surface outline-none placeholder:text-on-surface-variant/50"
            />
          </div>

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

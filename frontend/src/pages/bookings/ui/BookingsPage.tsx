
import { reatomComponent, useWrap } from "@reatom/react";
import { useEffect, useState } from "react";

import {
  bookingsPageSearchAtom,
  BookingRow,
  cancelBookingAction,
  cancelBookingErrorAtom,
  cancelBookingStatusAtom,
  fetchMyBookingHistoryAction,
  fetchMyBookingsAction,
  myBookingHistoryAtom,
  myBookingHistoryErrorAtom,
  myBookingHistoryLoadingAtom,
  myBookingsAtom,
  myBookingsErrorAtom,
  myBookingsLoadingAtom,
  myBookingsSearchAtom,
  type MyBooking,
} from "@/modules/bookings";
import { roomDetailRoute } from "@/pages/room-detail";
import { rootRoute } from "@/shared/router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { wrap } from "@reatom/core";
import Search from "@/shared/ui/search";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
type BookingsTab = "active" | "history";

function formatBookingDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function toBookingRowData(booking: MyBooking) {
  return {
    id: booking.id,
    roomId: booking.roomId,
    title: booking.title,
    roomName: booking.roomName,
    bookingId: booking.bookingId,
    date: formatBookingDate(booking.bookingDate).toUpperCase(),
    timeRange: `${booking.startTime} — ${booking.endTime}`,
    location: booking.building,
    status: booking.status,
    bookingDate: booking.bookingDate,
    canCancel: booking.status === "pending" || booking.status === "confirmed",
  } as const;
}

const BookingsPage = reatomComponent(() => {
  const [activeTab, setActiveTab] = useState<BookingsTab>("active");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<ReturnType<
    typeof toBookingRowData
  > | null>(null);

  const query = bookingsPageSearchAtom();
  const activeBookings = myBookingsAtom().map(toBookingRowData);
  const historyBookings = myBookingHistoryAtom().map(toBookingRowData);


  const currentRows = activeTab === "active" ? activeBookings : historyBookings;
  const isLoading =
    activeTab === "active" ? myBookingsLoadingAtom() : myBookingHistoryLoadingAtom();
  const loadError = activeTab === "active" ? myBookingsErrorAtom() : myBookingHistoryErrorAtom();
  const cancelStatus = cancelBookingStatusAtom();
  const cancelError = cancelBookingErrorAtom();

  const wrapLoadData = useWrap(() => {
    myBookingsSearchAtom.set(query.trim());

    if (activeTab === "active") {
      fetchMyBookingsAction();
      return;
    }

    fetchMyBookingHistoryAction();
  });

  useEffect(() => {
    wrapLoadData();
  }, [wrapLoadData]);

  const wrapSearch = useWrap(async (value: string) => {
    bookingsPageSearchAtom.set(value);
    myBookingsSearchAtom.set(value.trim());

    if (activeTab === "active") {
      fetchMyBookingsAction();
      return;
    }

    fetchMyBookingHistoryAction();
  });

  const wrapOpenRoom = useWrap((booking: ReturnType<typeof toBookingRowData>) => {
    roomDetailRoute.go({ roomId: booking.roomId, date: booking.bookingDate });
  });

  const wrapConfirmCancel = (booking: ReturnType<typeof toBookingRowData>) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  const wrapDoCancel = useWrap(async () => {
    if (!bookingToCancel) return;

    const ok = await wrap(cancelBookingAction(bookingToCancel.id));
    if (!ok) return;

    setCancelDialogOpen(false);
    setBookingToCancel(null);
  });

  const wrapSelectTab = useWrap((tab: BookingsTab) => {
    setActiveTab(tab);

    if (tab === "active") {
      fetchMyBookingsAction();
      return;
    }

    fetchMyBookingHistoryAction();
  });

  return (
    <div data-slot="bookings-page" className="flex min-h-full flex-col gap-6 px-6 py-8 md:px-10">
      {/* Hero title section */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="mb-2 text-[3.5rem] font-black uppercase leading-[0.9] tracking-tighter">
            My Bookings
          </h2>
          <div className="h-2 w-16 bg-primary" />
        </div>

        {/* Tabs: Active / History */}
        <div className="flex items-center gap-6">
          <Button
            type="button"
            variant={"tab"}
            className={cn("-ml-2", {
              "text-primary font-black": activeTab === "active",
            })}
            onClick={() => wrapSelectTab("active")}
          >
            Active
          </Button>
          <Button
            type="button"
            variant={"tab"}
            className={cn("-ml-2", {
              "text-primary font-black": activeTab === "history",
            })}
            onClick={() => wrapSelectTab("history")}
          >
            History
          </Button>
        </div>
      </section>

      {/* Table section */}
      <section className="flex flex-1 flex-col">
        {/* Search bar inside table */}
        <Search query={query} wrapSearch={wrapSearch} placeholder="SEARCH BY NAME..." />

        {loadError && (
          <div className="border-l-2 border-secondary bg-surface-container-low px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">
              {loadError}
            </p>
          </div>
        )}

        {/* Table header */}
        <div className="hidden bg-surface-container-high gap-4 px-8 py-4 pl-10 md:grid md:grid-cols-5">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Booking Details
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Date &amp; Time
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Location
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Status
          </span>
          <span className="text-right text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Action
          </span>
        </div>

        {/* Booking rows */}
        <div className="flex flex-col gap-1 bg-surface-container-lowest">
          {isLoading ? (
            <div className="flex items-center justify-center bg-surface-container-low py-20">
              <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                Loading bookings...
              </p>
            </div>
          ) : currentRows.length > 0 ? (
            currentRows.map((booking) => (
              <BookingRow
                key={booking.id}
                roomName={booking.roomName}
                title={booking.title}
                date={booking.date}
                timeRange={booking.timeRange}
                location={booking.location}
                status={booking.status}
                onOpen={() => wrapOpenRoom(booking)}
                onCancel={booking.canCancel ? () => wrapConfirmCancel(booking) : undefined}
                cancelDisabled={!booking.canCancel || activeTab === "history"}
              />
            ))
          ) : (
            <div className="flex items-center justify-center bg-surface-container-low py-20">
              <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                {activeTab === "active"
                  ? "No active bookings match your search"
                  : "No booking history matches your search"}
              </p>
            </div>
          )}
        </div>
      </section>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              {bookingToCancel
                ? `Are you sure you want to cancel ${bookingToCancel.bookingId} for ${bookingToCancel.roomName}?`
                : "Are you sure you want to cancel this booking?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {cancelError && (
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">
              {cancelError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                wrapDoCancel();
              }}
            >
              {cancelStatus === "submitting" ? "Cancelling..." : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}, "BookingsPage");

export const bookingsRoute = rootRoute.reatomRoute(
  {
    path: "bookings",
    render: () => <BookingsPage />,
  },
  "bookings",
);

import { useEffect, useRef } from "react";

import { reatomComponent, useWrap, useAtom } from "@reatom/react";
import { tAtom } from "@/modules/i18n";
import {
  activateRoomsPageAction,
  deactivateRoomsPageAction,
  RoomCard,
  RoomsFilters,
  roomsSearchAtom,
  roomsListAtom,
  roomsLoadingAtom,
  roomsHasMoreAtom,
  updateRoomsSearchInputAction,
  searchRoomsAction,
  loadMoreRoomsAction,
  isEditable,
  roomsDateAtom,
  roomsBackHrefAtom,
} from "@/modules/rooms";
import { roomDetailRoute } from "@/pages/room-detail";
import { rootRoute } from "@/shared/router";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import Search from "@/shared/ui/search";

function RoomCardSkeleton() {
  return (
    <div data-slot="room-card-skeleton" className="flex items-stretch bg-surface-container-low">
      <Skeleton className="w-1 self-stretch" />
      <div className="flex flex-1 flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-2.5 w-32" />
          <div className="mt-2 flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}

const RoomsPage = reatomComponent(() => {
  const [t] = useAtom(tAtom);
  const rooms = roomsListAtom();
  const loading = roomsLoadingAtom();
  const hasMore = roomsHasMoreAtom();
  const search = roomsSearchAtom();

  const sentinelRef = useRef<HTMLDivElement>(null);
  const wrapLoadMore = useWrap(() => loadMoreRoomsAction());
  const wrapSearch = useWrap(() => searchRoomsAction());
  const wrapUpdateSearch = useWrap((value: string) => updateRoomsSearchInputAction(value));
  const wrapActivatePage = useWrap(() => activateRoomsPageAction());
  const wrapDeactivatePage = useWrap(() => deactivateRoomsPageAction());


  useEffect(() => {
    wrapActivatePage();

    return () => {
      wrapDeactivatePage();
    };
  }, [wrapActivatePage, wrapDeactivatePage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && hasMore && !loading) {
          wrapLoadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, wrapLoadMore]);

  const handleBook = useWrap((roomId: string) => {
    const { pathname, search } = window.location;

    const backHref = `${pathname}${search}`;
    if (backHref === roomsRoute.path() || backHref.startsWith(`${roomsRoute.path()}?`)) {
      roomsBackHrefAtom.set(backHref);
    } else {
      roomsBackHrefAtom.set(roomsRoute.path());
    }

    roomDetailRoute.go({ roomId, date: roomsDateAtom() });
  });

  const showSkeletons = loading && rooms.length === 0;
  const showEmpty = !loading && rooms.length === 0;

  return (
    <div data-slot="rooms-page" className="flex min-h-full flex-col gap-10 px-6 py-8 md:px-10">
      {/* Hero search section */}
      <section className="flex flex-col gap-8">
        <div>
          <h2 className="mb-2 text-[3.5rem] font-black uppercase leading-[0.9] tracking-tighter">
            {t.rooms.title}
          </h2>
          <div className="h-2 w-16 bg-primary" />
        </div>

        <RoomsFilters />

        <Button
          onClick={wrapSearch}
          disabled={!isEditable()}
          className="h-auto w-full py-8 text-[1.75rem] font-black uppercase tracking-tighter"
        >
          {t.rooms.findAvailable}
        </Button>
      </section>

      {/* Results section */}
      <section className="flex flex-1 flex-col">
        <div className="flex items-end justify-between border-b border-outline-variant/10 pb-4">
          <h3 className="text-[1.75rem] font-black uppercase tracking-tighter">
            {t.rooms.resultsTitle}
          </h3>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
            {t.rooms.matchesFound.replace("{count}", String(rooms.length))}
          </span>
        </div>

        {/* Search by room name */}
        {/* <div
          onClick={() => {
            }
          }}
          className="flex items-center gap-3 bg-surface-container-high px-4 py-3"
        >
          <label htmlFor="room-search" className="text-on-surface-variant">
            <IconSearch size={18} className="shrink-0 text-on-surface-variant" />
          </label>
          <Input
            type="text"
            id="room-search"
            value={search}
            onChange={useWrap((e) => wrapUpdateSearch(e.target.value))}
            placeholder={t.rooms.searchPlaceholder}
            className="w-full border-none bg-transparent text-xs font-bold uppercase tracking-widest text-on-surface outline-none placeholder:text-on-surface-variant/50"
          />
        </div> */}
        <Search
          query={search}
          wrapSearch={wrapUpdateSearch}
          placeholder={t.rooms.searchPlaceholder}
        />

        {/* Room cards list */}
        <div className="flex flex-1 flex-col gap-1">
          {showSkeletons && (
            <>
              <RoomCardSkeleton />
              <RoomCardSkeleton />
              <RoomCardSkeleton />
            </>
          )}

          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} onBook={handleBook} />
          ))}

          {/* Loading more indicator */}
          {loading && rooms.length > 0 && <RoomCardSkeleton />}

          {showEmpty && (
            <div className="flex flex-1 items-center justify-center py-20">
              <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                {t.rooms.noMatches}
              </p>
            </div>
          )}

          {/* Infinite scroll sentinel */}
          {hasMore && <div ref={sentinelRef} className="h-1" />}
        </div>
      </section>
    </div>
  );
}, "RoomsPage");

export const roomsRoute = rootRoute.reatomRoute(
  {
    path: "rooms",
    render: () => <RoomsPage />,
  },
  "rooms",
);

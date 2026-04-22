import {
  action,
  atom,
  computed,
  sleep,
  withCallHook,
  withAsyncData,
  withSearchParams,
  wrap,
} from "@reatom/core";

import type {
  CursorPaginationMeta,
  EquipmentItem,
  RoomCard,
  RoomSearchFilters,
} from "../domain/types";
import * as roomsApi from "../infrastructure/rooms-api";

const EQUIPMENT_TTL_MS = 24 * 60 * 60 * 1000;
const ROOMS_SEARCH_TTL_MS = 60 * 1000;

interface RoomsPagePayload {
  items: RoomCard[];
  meta: CursorPaginationMeta;
  requestKey: string;
  requestCursor: string | null;
}

interface RoomsCacheEntry {
  payload: RoomsPagePayload;
  updatedAt: number;
}

interface EquipmentCacheEntry {
  items: EquipmentItem[];
  updatedAt: number;
}

function todayStr(): string {
  const tz = import.meta.env.VITE_TZ || "Europe/Moscow";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isFresh(updatedAt: number, ttlMs: number): boolean {
  return Date.now() - updatedAt < ttlMs;
}

function normalizeFilters(filters: RoomSearchFilters): RoomSearchFilters {
  return {
    ...filters,
    search: filters.search?.trim() || undefined,
    timeFrom: filters.timeFrom || undefined,
    timeTo: filters.timeTo || undefined,
    equipment: filters.equipment || undefined,
    minCapacity: filters.minCapacity && filters.minCapacity > 0 ? filters.minCapacity : undefined,
  };
}

function createRoomsCacheKey(filters: RoomSearchFilters): string {
  return JSON.stringify(filters);
}

function createEmptyMeta(): CursorPaginationMeta {
  return {
    hasMore: false,
    nextCursor: null,
  };
}

export const roomsDateAtom = atom(todayStr(), "rooms.date").extend(
  withSearchParams("date", {
    parse: (value) => value ?? todayStr(),
    serialize: (value) => (value === todayStr() ? undefined : value),
  }),
);

export const roomsSearchAtom = atom("", "rooms.search").extend(
  withSearchParams("search", {
    parse: (value) => value ?? "",
    serialize: (value) => value || undefined,
  }),
);

export const roomsTimeFromAtom = atom("", "rooms.timeFrom").extend(
  withSearchParams("timeFrom", {
    parse: (value) => value ?? "",
    serialize: (value) => value || undefined,
  }),
);

export const roomsTimeToAtom = atom("", "rooms.timeTo").extend(
  withSearchParams("timeTo", {
    parse: (value) => value ?? "",
    serialize: (value) => value || undefined,
  }),
);

export const roomsEquipmentAtom = atom("", "rooms.equipment").extend(
  withSearchParams("equipment", {
    parse: (value) => value ?? "",
    serialize: (value) => value || undefined,
  }),
);

export const roomsMinCapacityAtom = atom(0, "rooms.minCapacity").extend(
  withSearchParams("minCapacity", {
    parse: (value) => {
      if (!value) return 0;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    },
    serialize: (value) => (value > 0 ? String(value) : undefined),
  }),
);

export const roomsFiltersAtom = computed(() => {
  return normalizeFilters({
    date: roomsDateAtom(),
    search: roomsSearchAtom(),
    timeFrom: roomsTimeFromAtom(),
    timeTo: roomsTimeToAtom(),
    equipment: roomsEquipmentAtom(),
    minCapacity: roomsMinCapacityAtom(),
    limit: 6,
  });
}, "rooms.filters");

const roomsCursorInputAtom = atom<string | null>(null, "rooms.cursorInput");
const roomsRequestQueryAtom = atom<RoomSearchFilters | null>(null, "rooms.requestQuery");
const loadedPageKeysAtom = atom<string[]>([], "rooms.loadedPageKeys");
const roomsSearchInputActiveAtom = atom(false, "rooms.searchInputActive");

const roomsSearchCacheAtom = atom<Map<string, RoomsCacheEntry>>(new Map(), "rooms.searchCache");
const equipmentCacheAtom = atom<EquipmentCacheEntry | null>(null, "rooms.equipmentCache");

export const roomsPagesAtom = atom<RoomCard[][]>([], "rooms.pages");
export const roomsMetaAtom = atom<CursorPaginationMeta>(createEmptyMeta(), "rooms.meta");

export const roomsListAtom = computed(() => roomsPagesAtom().flat(), "rooms.list");
export const roomsCursorAtom = computed(() => roomsMetaAtom().nextCursor ?? null, "rooms.cursor");
export const roomsHasMoreAtom = computed(() => roomsMetaAtom().hasMore, "rooms.hasMore");

export const lastAppliedFiltersAtom = atom<RoomSearchFilters | null>(
  null,
  "rooms.lastAppliedFilters",
);
export const isEditable = computed(() => {
  const lastFilters = lastAppliedFiltersAtom();
  if (!lastFilters) return true;

  const current = roomsFiltersAtom();
  return (
    (current.date ?? todayStr()) !== (lastFilters.date ?? todayStr()) ||
    (current.timeFrom ?? "") !== (lastFilters.timeFrom ?? "") ||
    (current.timeTo ?? "") !== (lastFilters.timeTo ?? "") ||
    (current.equipment ?? "") !== (lastFilters.equipment ?? "") ||
    (current.minCapacity ?? 0) !== (lastFilters.minCapacity ?? 0)
  );
}, "rooms.isEditable");

// Used by header breadcrumb on room detail page.
// If user came from /rooms with filters in URL, we store exact href to go back.
export const roomsBackHrefAtom = atom<string | null>(null, "rooms.backHref");

const equipmentResource = computed(async () => {
  const cache = equipmentCacheAtom();
  if (cache && isFresh(cache.updatedAt, EQUIPMENT_TTL_MS)) {
    return cache.items;
  }

  const { data, error } = await wrap(roomsApi.listEquipment());
  if (error || !data) {
    throw new Error("Failed to load equipment");
  }

  equipmentCacheAtom.set({
    items: data.data ?? [],
    updatedAt: Date.now(),
  });

  return data.data;
}, "rooms.equipmentResource").extend(
  withAsyncData({
    initState: [] as EquipmentItem[],
    mapPayload: (payload: EquipmentItem[]) => payload,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
);

export const equipmentListAtom = computed(() => equipmentResource.data(), "rooms.equipmentList");

const roomsPageResource = computed(async () => {
  const query = roomsRequestQueryAtom();
  if (!query) {
    return {
      items: [] as RoomCard[],
      meta: createEmptyMeta(),
      requestKey: "",
      requestCursor: null,
    };
  }

  const key = createRoomsCacheKey(query);
  const cache = roomsSearchCacheAtom().get(key);
  if (cache && isFresh(cache.updatedAt, ROOMS_SEARCH_TTL_MS)) {
    return cache.payload;
  }

  const { data, error } = await wrap(roomsApi.searchRooms(query));
  if (error || !data) {
    throw new Error("Failed to load rooms");
  }

  const payload: RoomsPagePayload = {
    items: data.data ?? [],
    meta: data.meta,
    requestKey: key,
    requestCursor: query.cursor ?? null,
  };

  roomsSearchCacheAtom.set((store) => {
    const next = new Map(store);
    next.set(key, {
      payload,
      updatedAt: Date.now(),
    });
    return next;
  });

  return payload;
}, "rooms.pageResource").extend(
  withAsyncData({
    initState: {
      items: [] as RoomCard[],
      meta: createEmptyMeta(),
    },
    status: true,
    mapPayload: (payload: RoomsPagePayload) => payload,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
);

export const roomsLoadingAtom = computed(
  () => roomsPageResource.status().isPending,
  "rooms.loading",
);

roomsPageResource.onFulfill.extend(
  withCallHook(({ payload }) => {
    roomsMetaAtom.set(payload.meta);

    if (payload.requestCursor === null) {
      roomsPagesAtom.set([payload.items]);
      loadedPageKeysAtom.set(payload.requestKey ? [payload.requestKey] : []);
      return;
    }

    if (!payload.requestKey || loadedPageKeysAtom().includes(payload.requestKey)) {
      return;
    }

    roomsPagesAtom.set((pages) => [...pages, payload.items]);
    loadedPageKeysAtom.set((keys) => [...keys, payload.requestKey]);
  }),
);

export const fetchEquipmentAction = action(async () => {
  try {
    return await wrap(equipmentResource.retry());
  } catch (error: any) {
    if (error?.name === "AbortError") return null;
    throw error;
  }
}, "rooms.fetchEquipment");

export const searchRoomsAction = action(async () => {
  roomsCursorInputAtom.set(null);
  roomsPagesAtom.set([]);
  roomsMetaAtom.set(createEmptyMeta());
  loadedPageKeysAtom.set([]);

  const requestQuery = {
    ...roomsFiltersAtom(),
    cursor: undefined,
  };

  roomsRequestQueryAtom.set(requestQuery);
  lastAppliedFiltersAtom.set(roomsFiltersAtom());
  try {
    return await wrap(roomsPageResource.retry());
  } catch (error: any) {
    if (error?.name === "AbortError") return null;
    throw error;
  }
}, "rooms.search");

export const activateRoomsPageAction = action(async () => {
  roomsSearchInputActiveAtom.set(false);

  try {
    await wrap(fetchEquipmentAction());
  } catch {
    // keep page usable even if equipment fails
  }

  try {
    await wrap(searchRoomsAction());
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return;
    }
    throw error;
  } finally {
    roomsSearchInputActiveAtom.set(true);
  }
}, "rooms.activatePage");

export const deactivateRoomsPageAction = action(() => {
  roomsSearchInputActiveAtom.set(false);
}, "rooms.deactivatePage");

const searchRoomsByTypingAction = action(async () => {
  if (!roomsSearchInputActiveAtom()) return null;

  await wrap(sleep(300));

  if (!roomsSearchInputActiveAtom()) return null;

  const nextSearch = roomsSearchAtom().trim();
  const appliedSearch = (lastAppliedFiltersAtom()?.search ?? "").trim();
  if (nextSearch === appliedSearch) {
    return null;
  }

  try {
    return await wrap(searchRoomsAction());
  } catch {
    return null;
  }
}, "rooms.searchByTyping").extend(withAsyncData({ initState: null }));

export const updateRoomsSearchInputAction = action(async (value: string) => {
  roomsSearchAtom.set(value);

  if (!roomsSearchInputActiveAtom()) {
    return null;
  }

  try {
    return await wrap(searchRoomsByTypingAction());
  } catch {
    return null;
  }
}, "rooms.updateSearchInput");

export const loadMoreRoomsAction = action(async () => {
  const nextCursor = roomsCursorAtom();
  if (!nextCursor || !roomsHasMoreAtom()) {
    return null;
  }

  roomsCursorInputAtom.set(nextCursor);
  const requestQuery = {
    ...roomsFiltersAtom(),
    cursor: nextCursor,
  };

  roomsRequestQueryAtom.set(requestQuery);
  const key = createRoomsCacheKey(requestQuery);

  if (loadedPageKeysAtom().includes(key)) {
    return roomsPageResource.data();
  }

  try {
    return await wrap(roomsPageResource.retry());
  } catch (error: any) {
    if (error?.name === "AbortError") return null;
    throw error;
  }
}, "rooms.loadMore");

export const invalidateRoomsCacheAction = action(() => {
  roomsSearchCacheAtom.set(() => new Map());
  roomsPagesAtom.set([]);
  roomsMetaAtom.set(createEmptyMeta());
  loadedPageKeysAtom.set([]);
  roomsCursorInputAtom.set(null);
  roomsRequestQueryAtom.set(null);
}, "rooms.invalidateCache");

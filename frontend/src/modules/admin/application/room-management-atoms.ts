import {
  action,
  atom,
  computed,
  sleep,
  withAsync,
  withAsyncData,
  withCallHook,
  wrap,
} from "@reatom/core";

import type { components } from "@/shared/api/schema";
import type {
  AdminRoomListItem,
  CreateRoomBody,
  ListAdminRoomsQuery,
  UpdateRoomBody,
} from "../infrastructure/room-admin-api";
import * as roomAdminApi from "../infrastructure/room-admin-api";

const ADMIN_ROOM_SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_ADMIN_ROOM_LIMIT = 20;

type RoomStatusTab = "active" | "inactive" | "all";

interface AdminRoomsPayload {
  items: AdminRoomListItem[];
  meta: components["schemas"]["CursorPaginationMeta"];
  requestKey: string;
  requestCursor: string | null;
}

function createEmptyMeta(): components["schemas"]["CursorPaginationMeta"] {
  return {
    hasMore: false,
    nextCursor: null,
  };
}

function createAdminRoomRequestKey(query: ListAdminRoomsQuery): string {
  return JSON.stringify({
    search: query.search ?? null,
    status: query.status ?? "all",
    limit: query.limit ?? DEFAULT_ADMIN_ROOM_LIMIT,
    cursor: query.cursor ?? null,
  });
}

// State Atoms
export const adminRoomSearchAtom = atom("", "adminRoomSearchAtom");
export const adminRoomStatusTabAtom = atom<RoomStatusTab>("active", "adminRoomStatusTabAtom");

const adminRoomCursorInputAtom = atom<string | null>(null, "adminRoomCursorInputAtom");
const adminRoomRequestQueryAtom = atom<ListAdminRoomsQuery | null>(
  null,
  "adminRoomRequestQueryAtom",
);
const loadedAdminRoomPageKeysAtom = atom<string[]>([], "loadedAdminRoomPageKeysAtom");

export const adminRoomPagesAtom = atom<AdminRoomListItem[][]>([], "adminRoomPagesAtom");
export const adminRoomMetaAtom = atom<components["schemas"]["CursorPaginationMeta"]>(
  createEmptyMeta(),
  "adminRoomMetaAtom",
);

// Computed derived state
export const adminRoomsListAtom = computed(
  () => adminRoomPagesAtom().flat(),
  "adminRoomsListAtom",
);
export const adminRoomsHasMoreAtom = computed(
  () => adminRoomMetaAtom().hasMore,
  "adminRoomsHasMoreAtom",
);

// Actions
export const searchAdminRoomsAction = action(async () => {
  adminRoomCursorInputAtom.set(null);
  adminRoomPagesAtom.set([]);
  adminRoomMetaAtom.set(createEmptyMeta());
  loadedAdminRoomPageKeysAtom.set([]);

  const search = adminRoomSearchAtom().trim();
  const status = adminRoomStatusTabAtom();

  const requestQuery: ListAdminRoomsQuery = {
    search: search || undefined,
    status,
    limit: DEFAULT_ADMIN_ROOM_LIMIT,
    cursor: undefined,
  };

  adminRoomRequestQueryAtom.set(requestQuery);
  return await wrap(adminRoomsQuery.retry());
}, "searchAdminRoomsAction").extend(withAsync({ status: true }));

export const loadMoreAdminRoomsAction = action(async () => {
  const nextCursor = adminRoomMetaAtom().nextCursor ?? null;

  if (!nextCursor || !adminRoomsHasMoreAtom()) {
    return null;
  }

  adminRoomCursorInputAtom.set(nextCursor);

  const search = adminRoomSearchAtom().trim();
  const status = adminRoomStatusTabAtom();

  const requestQuery: ListAdminRoomsQuery = {
    search: search || undefined,
    status,
    limit: DEFAULT_ADMIN_ROOM_LIMIT,
    cursor: nextCursor,
  };

  adminRoomRequestQueryAtom.set(requestQuery);

  const requestKey = createAdminRoomRequestKey(requestQuery);
  if (loadedAdminRoomPageKeysAtom().includes(requestKey)) {
    return adminRoomsQuery.data();
  }

  return await wrap(adminRoomsQuery.retry());
}, "loadMoreAdminRoomsAction").extend(withAsync({ status: true }));

const searchAdminRoomsByTypingAction = action(async () => {
  await wrap(sleep(ADMIN_ROOM_SEARCH_DEBOUNCE_MS));

  const nextSearch = adminRoomSearchAtom().trim();
  const appliedSearch = (adminRoomRequestQueryAtom()?.search ?? "").trim();
  
  // If search matches current, do nothing
  if (nextSearch === appliedSearch) {
    return null;
  }

  try {
    return await wrap(searchAdminRoomsAction());
  } catch {
    return null;
  }
}, "searchAdminRoomsByTypingAction").extend(withAsyncData({ initState: null }));

export const updateAdminRoomSearchAction = action(async (value: string) => {
  adminRoomSearchAtom.set(value);

  try {
    return await wrap(searchAdminRoomsByTypingAction());
  } catch {
    return null;
  }
}, "updateAdminRoomSearchAction");

export const setAdminRoomStatusTabAction = action(async (status: RoomStatusTab) => {
  if (status === adminRoomStatusTabAtom()) return;
  
  adminRoomStatusTabAtom.set(status);
  await wrap(searchAdminRoomsAction());
}, "setAdminRoomStatusTabAction");


// Main Query
export const adminRoomsQuery = computed(async () => {
  // Read to establish subscription (although usually triggered by actions)
  adminRoomCursorInputAtom();

  const query = adminRoomRequestQueryAtom();
  if (!query) {
    return {
      items: [] as AdminRoomListItem[],
      meta: createEmptyMeta(),
      requestKey: "",
      requestCursor: null,
    };
  }

  const { data, error } = await wrap(roomAdminApi.listAdminRooms(query));

  if (error || !data) {
    throw new Error("Failed to load rooms");
  }

  return {
    items: data.data ?? [],
    meta: data.meta,
    requestKey: createAdminRoomRequestKey(query),
    requestCursor: query.cursor ?? null,
  };
}, "adminRoomsQuery").extend(
  withAsyncData({
    initState: {
      items: [] as AdminRoomListItem[],
      meta: createEmptyMeta(),
      requestKey: "",
      requestCursor: null,
    } satisfies AdminRoomsPayload,
    status: true,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
);

// Lifecycle Hook
adminRoomsQuery.onFulfill.extend(
  withCallHook(({ payload }) => {
    adminRoomMetaAtom.set({
      hasMore: payload.meta.hasMore || false,
      nextCursor: payload.meta.nextCursor ?? null,
    });

    if (payload.requestCursor === null) {
      adminRoomPagesAtom.set([payload.items]);
      loadedAdminRoomPageKeysAtom.set(payload.requestKey ? [payload.requestKey] : []);
      return;
    }

    if (!payload.requestKey || loadedAdminRoomPageKeysAtom().includes(payload.requestKey)) {
      return;
    }

    adminRoomPagesAtom.set((pages) => [...pages, payload.items]);
    loadedAdminRoomPageKeysAtom.set((keys) => [...keys, payload.requestKey]);
  }),
);

// Mutations
export const createRoomMutation = action(async (body: CreateRoomBody) => {
  const { data, error } = await wrap(roomAdminApi.createRoom(body));
  if (error || !data) {
    throw new Error("Failed to create room");
  }

  await wrap(searchAdminRoomsAction());
  return data.data;
}, "createRoomMutation").extend(withAsync({ status: true }));

export const updateRoomMutation = action(
  async (payload: { roomId: string; body: UpdateRoomBody }) => {
    const { data, error } = await wrap(roomAdminApi.updateRoom(payload.roomId, payload.body));
    if (error || !data) {
      throw new Error("Failed to update room");
    }

    // Instead of adminRoomsQuery.retry(), perform search again to maintain order and current state
    // Or retry current if we just want to update in-place without losing scroll
    // Let's do searchAdminRoomsAction for simplicity and consistency with creation
    await wrap(searchAdminRoomsAction());
    return data.data;
  },
  "updateRoomMutation",
).extend(withAsync({ status: true }));

export const deleteRoomMutation = action(async (roomId: string) => {
  const { error } = await wrap(roomAdminApi.deleteRoom(roomId));
  if (error) {
    throw new Error("Failed to deactivate room");
  }

  await wrap(searchAdminRoomsAction());
  return roomId;
}, "deleteRoomMutation").extend(withAsync({ status: true }));

export const reactivateRoomMutation = action(async (roomId: string) => {
  const { error } = await wrap(roomAdminApi.reactivateRoom(roomId));
  if (error) {
    throw new Error("Failed to reactivate room");
  }

  await wrap(searchAdminRoomsAction());
  return roomId;
}, "reactivateRoomMutation").extend(withAsync({ status: true }));

export const hardDeleteRoomMutation = action(async (roomId: string) => {
  const { error } = await wrap(roomAdminApi.hardDeleteRoom(roomId));
  if (error) {
    throw new Error("Failed to permanently delete room");
  }

  await wrap(searchAdminRoomsAction());
  return roomId;
}, "hardDeleteRoomMutation").extend(withAsync({ status: true }));

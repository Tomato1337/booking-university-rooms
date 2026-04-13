import {
  action,
  atom,
  computed,
  sleep,
  withAbort,
  withAsync,
  withAsyncData,
  withCallHook,
  wrap,
} from "@reatom/core";

import type { components } from "@/shared/api/schema";
import type { AdminPendingBooking } from "../domain/types";
import * as adminApi from "../infrastructure/admin-api";
import { adminStatsQuery } from "./stats-atoms";

const PENDING_SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PENDING_LIMIT = 8;

interface PendingBookingsPayload {
  items: AdminPendingBooking[];
  meta: components["schemas"]["CursorPaginationMetaWithTotal"];
  requestKey: string;
  requestCursor: string | null;
}

function createEmptyMeta(): components["schemas"]["CursorPaginationMetaWithTotal"] {
  return {
    total: 0,
    hasMore: false,
    nextCursor: null,
  };
}

function createPendingRequestKey(query: adminApi.ListPendingQuery): string {
  return JSON.stringify({
    search: query.search ?? null,
    limit: query.limit ?? DEFAULT_PENDING_LIMIT,
    cursor: query.cursor ?? null,
  });
}

export const pendingSearchAtom = atom("", "pendingSearchAtom");
const pendingSearchRevisionAtom = atom(0, "pendingSearchRevisionAtom");

const pendingCursorInputAtom = atom<string | null>(null, "pendingCursorInputAtom");
const pendingRequestQueryAtom = atom<adminApi.ListPendingQuery | null>(
  null,
  "pendingRequestQueryAtom",
);
const loadedPendingPageKeysAtom = atom<string[]>([], "loadedPendingPageKeysAtom");

export const pendingPagesAtom = atom<AdminPendingBooking[][]>([], "pendingPagesAtom");
export const pendingMetaAtom = atom<components["schemas"]["CursorPaginationMetaWithTotal"]>(
  createEmptyMeta(),
  "pendingMetaAtom",
);
export const pendingBookingsListAtom = computed(
  () => pendingPagesAtom().flat(),
  "pendingBookingsListAtom",
);
export const pendingHasMoreAtom = computed(() => pendingMetaAtom().hasMore, "pendingHasMoreAtom");
export const pendingTotalAtom = computed(() => pendingMetaAtom().total, "pendingTotalAtom");

export const searchPendingBookingsAction = action(async () => {
  pendingCursorInputAtom.set(null);
  pendingPagesAtom.set([]);
  pendingMetaAtom.set(createEmptyMeta());
  loadedPendingPageKeysAtom.set([]);

  const search = pendingSearchAtom().trim();
  const requestQuery: adminApi.ListPendingQuery = {
    search: search || undefined,
    limit: DEFAULT_PENDING_LIMIT,
    cursor: undefined,
  };

  pendingRequestQueryAtom.set(requestQuery);
  return await wrap(pendingBookingsQuery.retry());
}, "searchPendingBookingsAction").extend(withAsync({ status: true }));

export const loadMorePendingBookingsAction = action(async () => {
  const nextCursor = pendingMetaAtom().nextCursor ?? null;

  if (!nextCursor || !pendingHasMoreAtom()) {
    return null;
  }

  pendingCursorInputAtom.set(nextCursor);

  const search = pendingSearchAtom().trim();
  const requestQuery: adminApi.ListPendingQuery = {
    search: search || undefined,
    limit: DEFAULT_PENDING_LIMIT,
    cursor: nextCursor,
  };

  pendingRequestQueryAtom.set(requestQuery);

  const requestKey = createPendingRequestKey(requestQuery);
  if (loadedPendingPageKeysAtom().includes(requestKey)) {
    return pendingBookingsQuery.data();
  }

  return await wrap(pendingBookingsQuery.retry());
}, "loadMorePendingBookingsAction").extend(withAsync({ status: true }));

export const updatePendingSearchAction = action(async (value: string) => {
  pendingSearchAtom.set(value);
  const nextRevision = pendingSearchRevisionAtom() + 1;
  pendingSearchRevisionAtom.set(nextRevision);

  await wrap(sleep(PENDING_SEARCH_DEBOUNCE_MS));

  if (pendingSearchRevisionAtom() !== nextRevision) {
    return null;
  }

  return await wrap(searchPendingBookingsAction());
}, "updatePendingSearchAction").extend(withAsync({ status: true }), withAbort());

export const pendingBookingsQuery = computed(async () => {
  pendingSearchRevisionAtom();
  pendingCursorInputAtom();

  const query = pendingRequestQueryAtom();
  if (!query) {
    return {
      items: [] as AdminPendingBooking[],
      meta: createEmptyMeta(),
      requestKey: "",
      requestCursor: null,
    };
  }

  const { data, error } = await wrap(adminApi.listPending(query));

  if (error || !data) {
    throw new Error("Failed to load pending bookings");
  }

  return {
    items: data.data,
    meta: data.meta,
    requestKey: createPendingRequestKey(query),
    requestCursor: query.cursor ?? null,
  };
}, "pendingBookingsQuery").extend(
  withAsyncData({
    initState: {
      items: [] as AdminPendingBooking[],
      meta: createEmptyMeta(),
      requestKey: "",
      requestCursor: null,
    } satisfies PendingBookingsPayload,
    status: true,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
);

pendingBookingsQuery.onFulfill.extend(
  withCallHook(({ payload }) => {
    pendingMetaAtom.set(payload.meta);

    if (payload.requestCursor === null) {
      pendingPagesAtom.set([payload.items]);
      loadedPendingPageKeysAtom.set(payload.requestKey ? [payload.requestKey] : []);
      return;
    }

    if (!payload.requestKey || loadedPendingPageKeysAtom().includes(payload.requestKey)) {
      return;
    }

    pendingPagesAtom.set((pages) => [...pages, payload.items]);
    loadedPendingPageKeysAtom.set((keys) => [...keys, payload.requestKey]);
  }),
);

export const approveBookingMutation = action(async (bookingId: string) => {
  const { data, error } = await wrap(adminApi.approve(bookingId));
  if (error || !data) {
    throw new Error("Failed to approve booking");
  }

  await wrap(searchPendingBookingsAction());
  await wrap(adminStatsQuery.retry());
  return data.data;
}, "approveBookingMutation").extend(withAsync({ status: true }));

export const rejectBookingMutation = action(
  async (payload: { bookingId: string; reason?: string }) => {
    const { data, error } = await wrap(adminApi.reject(payload.bookingId, payload.reason));
    if (error || !data) {
      throw new Error("Failed to reject booking");
    }

    await wrap(searchPendingBookingsAction());
    await wrap(adminStatsQuery.retry());
    return data.data;
  },
  "rejectBookingMutation",
).extend(withAsync({ status: true }));
const HISTORY_SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_HISTORY_LIMIT = 8;

interface HistoryBookingsPayload {
  items: AdminPendingBooking[];
  meta: components["schemas"]["CursorPaginationMetaWithTotal"];
  requestKey: string;
  requestCursor: string | null;
}

function createHistoryRequestKey(query: adminApi.ListPendingQuery): string {
  return JSON.stringify({
    search: query.search ?? null,
    limit: query.limit ?? DEFAULT_HISTORY_LIMIT,
    cursor: query.cursor ?? null,
  });
}

export const historySearchAtom = atom("", "historySearchAtom");
const historySearchRevisionAtom = atom(0, "historySearchRevisionAtom");

const historyCursorInputAtom = atom<string | null>(null, "historyCursorInputAtom");
const historyRequestQueryAtom = atom<adminApi.ListPendingQuery | null>(
  null,
  "historyRequestQueryAtom",
);
const loadedHistoryPageKeysAtom = atom<string[]>([], "loadedHistoryPageKeysAtom");

export const historyPagesAtom = atom<AdminPendingBooking[][]>([], "historyPagesAtom");
export const historyMetaAtom = atom<components["schemas"]["CursorPaginationMetaWithTotal"]>(
  createEmptyMeta(),
  "historyMetaAtom",
);
export const historyBookingsListAtom = computed(
  () => historyPagesAtom().flat(),
  "historyBookingsListAtom",
);
export const historyHasMoreAtom = computed(() => historyMetaAtom().hasMore, "historyHasMoreAtom");
export const historyTotalAtom = computed(() => historyMetaAtom().total, "historyTotalAtom");

export const searchHistoryBookingsAction = action(async () => {
  historyCursorInputAtom.set(null);
  historyPagesAtom.set([]);
  historyMetaAtom.set(createEmptyMeta());
  loadedHistoryPageKeysAtom.set([]);

  const search = historySearchAtom().trim();
  const requestQuery: adminApi.ListPendingQuery = {
    search: search || undefined,
    limit: DEFAULT_HISTORY_LIMIT,
    cursor: undefined,
  };

  historyRequestQueryAtom.set(requestQuery);
  return await wrap(historyBookingsQuery.retry());
}, "searchHistoryBookingsAction").extend(withAsync({ status: true }));

export const loadMoreHistoryBookingsAction = action(async () => {
  const nextCursor = historyMetaAtom().nextCursor ?? null;

  if (!nextCursor || !historyHasMoreAtom()) {
    return null;
  }

  historyCursorInputAtom.set(nextCursor);

  const search = historySearchAtom().trim();
  const requestQuery: adminApi.ListPendingQuery = {
    search: search || undefined,
    limit: DEFAULT_HISTORY_LIMIT,
    cursor: nextCursor,
  };

  historyRequestQueryAtom.set(requestQuery);

  const requestKey = createHistoryRequestKey(requestQuery);
  if (loadedHistoryPageKeysAtom().includes(requestKey)) {
    return historyBookingsQuery.data();
  }

  return await wrap(historyBookingsQuery.retry());
}, "loadMoreHistoryBookingsAction").extend(withAsync({ status: true }));

export const updateHistorySearchAction = action(async (value: string) => {
  historySearchAtom.set(value);
  const nextRevision = historySearchRevisionAtom() + 1;
  historySearchRevisionAtom.set(nextRevision);

  await wrap(sleep(HISTORY_SEARCH_DEBOUNCE_MS));

  if (historySearchRevisionAtom() !== nextRevision) {
    return null;
  }

  return await wrap(searchHistoryBookingsAction());
}, "updateHistorySearchAction").extend(withAsync({ status: true }));

export const historyBookingsQuery = computed(async () => {
  historySearchRevisionAtom();
  historyCursorInputAtom();

  const query = historyRequestQueryAtom();
  if (!query) {
    return {
      items: [] as AdminPendingBooking[],
      meta: createEmptyMeta(),
      requestKey: "",
      requestCursor: null,
    };
  }

  const { data, error } = await wrap(adminApi.listHistory(query));

  if (error || !data) {
    throw new Error("Failed to load history bookings");
  }

  return {
    items: data.data,
    meta: data.meta,
    requestKey: createHistoryRequestKey(query),
    requestCursor: query.cursor ?? null,
  };
}, "historyBookingsQuery").extend(
  withAsyncData({
    initState: {
      items: [] as AdminPendingBooking[],
      meta: createEmptyMeta(),
      requestKey: "",
      requestCursor: null,
    } satisfies HistoryBookingsPayload,
    status: true,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
);

historyBookingsQuery.onFulfill.extend(
  withCallHook(({ payload }) => {
    historyMetaAtom.set(payload.meta);

    if (payload.requestCursor === null) {
      historyPagesAtom.set([payload.items]);
      loadedHistoryPageKeysAtom.set(payload.requestKey ? [payload.requestKey] : []);
      return;
    }

    if (!payload.requestKey || loadedHistoryPageKeysAtom().includes(payload.requestKey)) {
      return;
    }

    historyPagesAtom.set((pages) => [...pages, payload.items]);
    loadedHistoryPageKeysAtom.set((keys) => [...keys, payload.requestKey]);
  }),
);

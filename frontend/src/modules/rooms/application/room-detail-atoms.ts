import { action, atom, computed, withAsyncData, wrap } from "@reatom/core";

import type { RoomDetail } from "../domain/types";
import * as roomsApi from "../infrastructure/rooms-api";

const ROOM_DETAIL_TTL_MS = 60 * 1000;

export interface LoadRoomDetailParams {
  roomId: string;
  date: string;
}

interface RoomDetailCacheEntry {
  data: RoomDetail;
  updatedAt: number;
}

function roomDetailKey({ roomId, date }: LoadRoomDetailParams): string {
  return `${roomId}:${date}`;
}

function isFresh(entry: RoomDetailCacheEntry): boolean {
  return Date.now() - entry.updatedAt < ROOM_DETAIL_TTL_MS;
}

const roomDetailParamsAtom = atom<LoadRoomDetailParams | null>(null, "roomDetail.params");
const roomDetailCacheAtom = atom<Map<string, RoomDetailCacheEntry>>(new Map(), "roomDetail.cache");

export const roomDetailResource = computed(async () => {
  const params = roomDetailParamsAtom();
  if (!params) return null;

  if (!params.roomId) {
    throw new Error("Room id is missing");
  }

  const cacheKey = roomDetailKey(params);
  const cached = roomDetailCacheAtom().get(cacheKey);
  if (cached && isFresh(cached)) {
    return cached.data;
  }

  const { data, error } = await wrap(roomsApi.getRoomDetail(params.roomId, params.date));

  if (error || !data) {
    throw new Error("Failed to load room");
  }

  roomDetailCacheAtom.set((cache) => {
    const next = new Map(cache);
    next.set(cacheKey, {
      data: data.data,
      updatedAt: Date.now(),
    });
    return next;
  });

  return data.data;
}, "roomDetail.resource").extend(
  withAsyncData({
    initState: null as RoomDetail | null,
    status: true,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
);

export const roomDetailAtom = computed(() => roomDetailResource.data(), "roomDetail.data");
export const roomDetailLoadingAtom = computed(
  () => !roomDetailResource.ready(),
  "roomDetail.loading",
);
export const roomDetailErrorAtom = computed(() => {
  const error = roomDetailResource.error();
  return error?.message ?? null;
}, "roomDetail.error");

export const loadRoomDetailAction = action(async (params: LoadRoomDetailParams) => {
  roomDetailParamsAtom.set(params);
  try {
    return await wrap(roomDetailResource.retry());
  } catch (error: any) {
    if (error?.name === "AbortError") return null;
    throw error;
  }
}, "roomDetail.load");

export const invalidateRoomDetailCacheAction = action((params?: LoadRoomDetailParams) => {
  if (!params) {
    roomDetailCacheAtom.set(() => new Map());
    return;
  }

  const key = roomDetailKey(params);
  roomDetailCacheAtom.set((cache) => {
    if (!cache.has(key)) return cache;
    const next = new Map(cache);
    next.delete(key);
    return next;
  });
}, "roomDetail.invalidateCache");

export const refreshRoomDetailAction = action(async () => {
  const params = roomDetailParamsAtom();
  if (!params) return null;

  invalidateRoomDetailCacheAction(params);
  try {
    return await wrap(roomDetailResource.retry());
  } catch (error: any) {
    if (error?.name === "AbortError") return null;
    throw error;
  }
}, "roomDetail.refresh");

export const cancelMyBookingFromRoomDetailAction = action(async (bookingId: string) => {
  const { cancelBookingAction, fetchMyBookingHistoryAction, fetchMyBookingsAction } = await wrap(
    import("@/modules/bookings"),
  );

  const result = await wrap(cancelBookingAction(bookingId));
  if (!result) {
    return false;
  }

  void (async () => await wrap(fetchMyBookingsAction()))().catch(() => null);
  void (async () => await wrap(fetchMyBookingHistoryAction()))().catch(() => null);
  void (async () => await wrap(refreshRoomDetailAction()))().catch(() => null);

  return true;
}, "roomDetail.cancelMyBooking");

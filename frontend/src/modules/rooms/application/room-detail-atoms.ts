import { action, atom, wrap } from "@reatom/core";

import type { RoomDetail } from "../domain/types";
import * as roomsApi from "../infrastructure/rooms-api";
import { roomDetailRoute } from "@/pages/room-detail";

export interface LoadRoomDetailParams {
  roomId: string;
  date: string;
}

export const roomDetailAtom = atom<RoomDetail | null>(null, "roomDetail.data");
export const roomDetailLoadingAtom = atom(false, "roomDetail.loading");
export const roomDetailErrorAtom = atom<string | null>(null, "roomDetail.error");

export const loadRoomDetailAction = action(async ({ roomId, date }: LoadRoomDetailParams) => {
  const today = new Date().toISOString().slice(0, 10);
  if (date < today) {
    roomDetailRoute.go({ roomId, date: today }, true);
    return;
  }

  if (!roomId) {
    roomDetailAtom.set(null);
    roomDetailErrorAtom.set("Room id is missing");
    return;
  }

  roomDetailLoadingAtom.set(true);
  roomDetailErrorAtom.set(null);

  try {
    const { data } = await wrap(roomsApi.getRoomDetail(roomId, date));

    if (!data) {
      roomDetailAtom.set(null);
      roomDetailErrorAtom.set("Failed to load room");
      roomDetailLoadingAtom.set(false);
      return;
    }

    roomDetailAtom.set(data.data);
  } catch (err) {
    roomDetailAtom.set(null);
    roomDetailErrorAtom.set(err instanceof Error ? err.message : "Failed to load room");
  }

  roomDetailLoadingAtom.set(false);
}, "roomDetail.load");

export const cancelMyBookingFromRoomDetailAction = action(async (bookingId: string) => {
  const { cancelBookingAction, fetchMyBookingsAction, fetchMyBookingHistoryAction } = await wrap(
    import("@/modules/bookings"),
  );
  const result = await wrap(cancelBookingAction(bookingId));

  if (!result) {
    return false;
  }

  await wrap(fetchMyBookingsAction());
  await wrap(fetchMyBookingHistoryAction());

  const params = roomDetailRoute();
  if (params?.roomId) {
    await wrap(
      loadRoomDetailAction({
        roomId: params.roomId,
        date: params.date ?? new Date().toISOString().slice(0, 10),
      }),
    );
  }

  return true;
}, "roomDetail.cancelMyBooking");

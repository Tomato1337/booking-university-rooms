import { action, atom, wrap } from "@reatom/core"

import type { RoomDetail } from "../domain/types"
import * as roomsApi from "../infrastructure/rooms-api"

export interface LoadRoomDetailParams {
  roomId: string
  date: string
}

export const roomDetailAtom = atom<RoomDetail | null>(null, "roomDetail.data")
export const roomDetailLoadingAtom = atom(false, "roomDetail.loading")
export const roomDetailErrorAtom = atom<string | null>(null, "roomDetail.error")

export const loadRoomDetailAction = action(async ({ roomId, date }: LoadRoomDetailParams) => {
  if (!roomId) {
    roomDetailAtom.set(null)
    roomDetailErrorAtom.set("Room id is missing")
    return
  }

  roomDetailLoadingAtom.set(true)
  roomDetailErrorAtom.set(null)

  try {
    const { data } = await wrap(roomsApi.getRoomDetail(roomId, date))

    if (!data) {
      roomDetailAtom.set(null)
      roomDetailErrorAtom.set("Failed to load room")
      roomDetailLoadingAtom.set(false)
      return
    }

    roomDetailAtom.set(data.data)
  } catch (err) {
    roomDetailAtom.set(null)
    roomDetailErrorAtom.set(err instanceof Error ? err.message : "Failed to load room")
  }

  roomDetailLoadingAtom.set(false)
}, "roomDetail.load")

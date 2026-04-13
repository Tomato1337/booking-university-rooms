import { action, computed, withAsync, withAsyncData, wrap } from "@reatom/core"

import type { AdminRoomListItem, CreateRoomBody, UpdateRoomBody } from "../infrastructure/room-admin-api"
import * as roomAdminApi from "../infrastructure/room-admin-api"

export const adminRoomsQuery = computed(async () => {
  const { data, error } = await wrap(roomAdminApi.listRooms())
  if (error || !data) {
    throw new Error("Failed to load rooms")
  }

  return data.data
}, "adminRoomsQuery").extend(
  withAsyncData({
    initState: [] as AdminRoomListItem[],
    status: true,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
)

export const createRoomMutation = action(async (body: CreateRoomBody) => {
  const { data, error } = await wrap(roomAdminApi.createRoom(body))
  if (error || !data) {
    throw new Error("Failed to create room")
  }

  await wrap(adminRoomsQuery.retry())
  return data.data
}, "createRoomMutation").extend(withAsync({ status: true }))

export const updateRoomMutation = action(
  async (payload: { roomId: string; body: UpdateRoomBody }) => {
    const { data, error } = await wrap(roomAdminApi.updateRoom(payload.roomId, payload.body))
    if (error || !data) {
      throw new Error("Failed to update room")
    }

    await wrap(adminRoomsQuery.retry())
    return data.data
  },
  "updateRoomMutation",
).extend(withAsync({ status: true }))

export const deleteRoomMutation = action(async (roomId: string) => {
  const { error } = await wrap(roomAdminApi.deleteRoom(roomId))
  if (error) {
    throw new Error("Failed to delete room")
  }

  await wrap(adminRoomsQuery.retry())
  return roomId
}, "deleteRoomMutation").extend(withAsync({ status: true }))

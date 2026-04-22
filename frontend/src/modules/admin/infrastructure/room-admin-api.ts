import { apiClient } from "@/shared/api/client"
import type { components } from "@/shared/api/schema"

export type CreateRoomBody = components["schemas"]["CreateRoomRequest"]
export type UpdateRoomBody = components["schemas"]["UpdateRoomRequest"]
export type AdminRoomListItem = components["schemas"]["RoomCard"]

export function listRooms() {
  return apiClient.GET("/rooms", {
    params: {
      query: {
        limit: 100,
      },
    },
  })
}

export function createRoom(body: CreateRoomBody) {
  return apiClient.POST("/rooms", { body })
}

export function updateRoom(roomId: string, body: UpdateRoomBody) {
  return apiClient.PUT("/rooms/{roomId}", {
    params: { path: { roomId } },
    body,
  })
}

export function deleteRoom(roomId: string) {
  return apiClient.DELETE("/rooms/{roomId}", {
    params: { path: { roomId } },
  })
}

export interface ListAdminRoomsQuery {
  search?: string;
  status?: "active" | "inactive" | "all";
  limit?: number;
  cursor?: string;
}

export function listAdminRooms(query: ListAdminRoomsQuery) {
  return apiClient.GET("/admin/rooms", {
    params: {
      query: {
        search: query.search,
        status: query.status,
        limit: query.limit,
        cursor: query.cursor,
      },
    },
  });
}

export function reactivateRoom(roomId: string) {
  return apiClient.PATCH("/admin/rooms/{roomId}/reactivate", {
    params: { path: { roomId } },
  });
}

export function hardDeleteRoom(roomId: string) {
  return apiClient.DELETE("/admin/rooms/{roomId}", {
    params: { path: { roomId } },
  });
}

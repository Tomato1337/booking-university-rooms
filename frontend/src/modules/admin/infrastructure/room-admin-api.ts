import { apiClient } from "@/shared/api/client"
import type { components } from "@/shared/api/schema"

export type CreateRoomBody = components["schemas"]["CreateRoomRequest"]
export type UpdateRoomBody = components["schemas"]["UpdateRoomRequest"]
export type AdminRoomListItem = components["schemas"]["RoomCard"]
export type RoomFormBody = Omit<CreateRoomBody, "photos"> & {
  photoFile?: File | null
  removePhoto?: boolean
}

export function listRooms() {
  return apiClient.GET("/rooms", {
    params: {
      query: {
        limit: 100,
      },
    },
  })
}

function appendRoomFormData(body: RoomFormBody) {
  const formData = new FormData()
  formData.append("name", body.name)
  if (body.description) formData.append("description", body.description)
  formData.append("roomType", body.roomType)
  formData.append("capacity", String(body.capacity))
  formData.append("building", body.building)
  formData.append("floor", String(body.floor))
  formData.append("openTime", body.openTime ?? "08:00")
  formData.append("closeTime", body.closeTime ?? "20:00")
  body.equipmentIds?.forEach((id) => formData.append("equipmentIds", id))
  if (body.photoFile) formData.append("photo", body.photoFile)
  if (body.removePhoto) formData.append("removePhoto", "true")
  return formData
}

export function createRoom(body: RoomFormBody) {
  return apiClient.POST("/rooms", { body: appendRoomFormData(body) as never })
}

export function updateRoom(roomId: string, body: RoomFormBody) {
  return apiClient.PUT("/rooms/{roomId}", {
    params: { path: { roomId } },
    body: appendRoomFormData(body) as never,
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

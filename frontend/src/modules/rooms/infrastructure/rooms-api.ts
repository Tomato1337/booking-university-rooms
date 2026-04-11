import { apiClient } from "@/shared/api/client";
import type { RoomSearchFilters } from "../domain/types";

export function searchRooms(query?: RoomSearchFilters) {
  return apiClient.GET("/rooms", { params: { query } });
}

export function listEquipment() {
  return apiClient.GET("/equipment");
}

export function getRoomDetail(roomId: string, date?: string) {
  return apiClient.GET("/rooms/{roomId}", {
    params: { path: { roomId }, query: { date } },
  });
}

// domain
export type {
  RoomCard as RoomCardType,
  EquipmentItem,
  RoomSearchFilters,
  RoomDetail,
  TimeSlotFromApi,
} from "./domain/types";

// application
export {
  roomsDateAtom,
  roomsSearchAtom,
  roomsTimeFromAtom,
  roomsTimeToAtom,
  roomsEquipmentAtom,
  roomsMinCapacityAtom,
  roomsListAtom,
  roomsLoadingAtom,
  roomsHasMoreAtom,
  roomsFiltersAtom,
  activateRoomsPageAction,
  deactivateRoomsPageAction,
  updateRoomsSearchInputAction,
  searchRoomsAction,
  loadMoreRoomsAction,
  fetchEquipmentAction,
  invalidateRoomsCacheAction,
  equipmentListAtom,
  isEditable,
  roomsBackHrefAtom,
} from "./application/rooms-atoms";
export {
  cancelMyBookingFromRoomDetailAction,
  invalidateRoomDetailCacheAction,
  loadRoomDetailAction,
  refreshRoomDetailAction,
  roomDetailResource,
  roomDetailAtom,
  roomDetailErrorAtom,
  roomDetailLoadingAtom,
} from "./application/room-detail-atoms";
export { buildRoomDetailTimeGridSlots } from "./application/room-detail-view";

// infrastructure — mocks (DEV only, lazy-imported)
export { roomsMockHandlers } from "./infrastructure/mocks/handlers";
export {
  getMockRoomDetail,
  invalidateMockRoomDetail,
  registerMockRoomBookingsProvider,
  mockRooms,
} from "./infrastructure/mocks/data";

// infrastructure
export { getRoomDetail } from "./infrastructure/rooms-api";
export { getEquipmentIcon } from "./infrastructure/icon-map";

// ui
export { TimeGrid } from "./ui/TimeGrid";
export type { TimeGridProps, TimeSlot, TimeSlotStatus } from "./ui/TimeGrid";
export { RoomCard } from "./ui/RoomCard";
export type { RoomCardProps } from "./ui/RoomCard";
export { RoomsFilters } from "./ui/FilterCard";
export type { RoomsFiltersProps } from "./ui/FilterCard";

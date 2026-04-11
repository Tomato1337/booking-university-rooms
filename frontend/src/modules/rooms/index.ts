// domain
export type { RoomCard as RoomCardType, EquipmentItem, RoomSearchFilters } from "./domain/types";

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
  searchRoomsAction,
  loadMoreRoomsAction,
  fetchEquipmentAction,
  equipmentListAtom,
  isEditable,
} from "./application/rooms-atoms";

// infrastructure — mocks (DEV only, lazy-imported)
export { roomsMockHandlers } from "./infrastructure/mocks/handlers";

// ui
export { TimeGrid } from "./ui/TimeGrid";
export type { TimeGridProps, TimeSlot, TimeSlotStatus } from "./ui/TimeGrid";
export { RoomCard } from "./ui/RoomCard";
export type { RoomCardProps } from "./ui/RoomCard";
export { RoomsFilters } from "./ui/FilterCard";
export type { RoomsFiltersProps } from "./ui/FilterCard";

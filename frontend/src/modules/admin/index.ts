// domain
export {
  createEquipmentSchema,
  createRoomSchema,
  rejectReasonSchema,
} from "./domain/schemas"

// application
export {
  approveBookingMutation,
  loadMorePendingBookingsAction,
  pendingBookingsListAtom,
  pendingHasMoreAtom,
  pendingMetaAtom,
  pendingPagesAtom,
  pendingBookingsQuery,
  pendingSearchAtom,
  pendingTotalAtom,
  rejectBookingMutation,
  searchPendingBookingsAction,
  updatePendingSearchAction,
  loadMoreHistoryBookingsAction,
  historyBookingsListAtom,
  historyBookingsQuery,
  historyHasMoreAtom,
  historySearchAtom,
  searchHistoryBookingsAction,
  updateHistorySearchAction,
} from "./application/booking-management-atoms"
export { adminStatsQuery, statsPeriodAtom } from "./application/stats-atoms"
export {
  adminRoomPagesAtom,
  adminRoomSearchAtom,
  adminRoomStatusTabAtom,
  adminRoomsHasMoreAtom,
  adminRoomsListAtom,
  adminRoomsQuery,
  createRoomMutation,
  deleteRoomMutation,
  hardDeleteRoomMutation,
  loadMoreAdminRoomsAction,
  reactivateRoomMutation,
  searchAdminRoomsAction,
  setAdminRoomStatusTabAction,
  updateAdminRoomSearchAction,
  updateRoomMutation,
} from "./application/room-management-atoms"
export {
  closeRoomFormAction,
  openCreateRoomFormAction,
  openEditRoomFormAction,
  roomForm,
  roomFormEditingRoomAtom,
  roomFormModeAtom,
  roomFormOpenAtom,
  toInitialValues as toInitialRoomValues,
} from "./application/admin-room-form-state"
export {
  closeEquipmentFormAction,
  equipmentForm,
  equipmentFormEditingItemAtom,
  equipmentFormModeAtom,
  equipmentFormOpenAtom,
  openCreateEquipmentFormAction,
  openEditEquipmentFormAction,
  toInitialValues as toInitialEquipmentValues,
} from "./application/admin-equipment-form-state"
export {
  createEquipmentMutation,
  deleteEquipmentMutation,
  equipmentListQuery,
  updateEquipmentMutation,
} from "./application/equipment-atoms"

// ui
export { AdminBookingRow, type AdminBookingRowProps } from "./ui/AdminBookingRow"
export {
  ApproveRejectDialog,
  type ApproveRejectDialogProps,
} from "./ui/ApproveRejectDialog"
export { RoomForm, type RoomFormProps } from "./ui/RoomForm"
export { EquipmentForm, type EquipmentFormProps } from "./ui/EquipmentForm"

// types
export type {
  AdminPendingBooking,
  AdminStats,
  AdminTab,
  RoomCard,
  EquipmentItem,
  EquipmentDeleteResult,
  EquipmentUsageRoom,
} from "./domain/types"

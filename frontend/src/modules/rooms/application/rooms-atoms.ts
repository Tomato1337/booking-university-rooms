import { action, atom, computed, withSearchParams, wrap } from "@reatom/core"

import type { CursorPaginationMeta, EquipmentItem, RoomCard, RoomSearchFilters } from "../domain/types"
import * as roomsApi from "../infrastructure/rooms-api"

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export const roomsDateAtom = atom(todayStr(), "rooms.date").extend(
  withSearchParams("date", {
    parse: (value) => value ?? todayStr(),
    serialize: (value) => (value === todayStr() ? undefined : value),
  }),
)

export const roomsSearchAtom = atom("", "rooms.search").extend(
  withSearchParams("search", {
    parse: (value) => value ?? "",
    serialize: (value) => value || undefined,
  }),
)

export const roomsTimeFromAtom = atom("", "rooms.timeFrom").extend(
  withSearchParams("timeFrom", {
    parse: (value) => value ?? "",
    serialize: (value) => value || undefined,
  }),
)

export const roomsTimeToAtom = atom("", "rooms.timeTo").extend(
  withSearchParams("timeTo", {
    parse: (value) => value ?? "",
    serialize: (value) => value || undefined,
  }),
)

export const roomsEquipmentAtom = atom("", "rooms.equipment").extend(
  withSearchParams("equipment", {
    parse: (value) => value ?? "",
    serialize: (value) => value || undefined,
  }),
)

export const roomsMinCapacityAtom = atom(0, "rooms.minCapacity").extend(
  withSearchParams("minCapacity", {
    parse: (value) => {
      if (!value) return 0
      const parsed = Number(value)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
    },
    serialize: (value) => (value > 0 ? String(value) : undefined),
  }),
)

export const equipmentListAtom = atom<EquipmentItem[]>([], "rooms.equipmentList")
export const equipmentLoadedAtom = atom(false, "rooms.equipmentLoaded")

export const lastAppliedFiltersAtom = atom<RoomSearchFilters | null>(
  null,
  "rooms.lastAppliedFilters",
)
export const isEditable = computed(() => {
  const lastFilters = lastAppliedFiltersAtom()

  if (!lastFilters) return true

  const date = roomsDateAtom()
  const timeFrom = roomsTimeFromAtom()
  const timeTo = roomsTimeToAtom()
  const equipment = roomsEquipmentAtom()
  const minCapacity = roomsMinCapacityAtom()

  const isChanged =
    date !== (lastFilters.date ?? todayStr()) ||
    timeFrom !== (lastFilters.timeFrom ?? "") ||
    timeTo !== (lastFilters.timeTo ?? "") ||
    equipment !== (lastFilters.equipment ?? "") ||
    minCapacity !== (lastFilters.minCapacity ?? 0)
  return isChanged
}, "rooms.isEditable")


export const fetchEquipmentAction = action(async () => {
  if (equipmentLoadedAtom()) return

  const { data } = await wrap(roomsApi.listEquipment())
  if (!data) return

  equipmentListAtom.set(data.data)
  equipmentLoadedAtom.set(true)
}, "rooms.fetchEquipment")

export const roomsListAtom = atom<RoomCard[]>([], "rooms.list")
export const roomsCursorAtom = atom<string | null>(null, "rooms.cursor")
export const roomsHasMoreAtom = atom(false, "rooms.hasMore")
export const roomsLoadingAtom = atom(false, "rooms.loading")
export const roomsMetaAtom = atom<CursorPaginationMeta | null>(null, "rooms.meta")

// Used by header breadcrumb on room detail page.
// If user came from /rooms with filters in URL, we store exact href to go back.
export const roomsBackHrefAtom = atom<string | null>(null, "rooms.backHref")

function buildSearchQuery(cursor?: string): RoomSearchFilters {
  const query: RoomSearchFilters = {}
  const date = roomsDateAtom()
  const search = roomsSearchAtom()
  const timeFrom = roomsTimeFromAtom()
  const timeTo = roomsTimeToAtom()
  const equipment = roomsEquipmentAtom()
  const minCapacity = roomsMinCapacityAtom()

  if (date) query.date = date
  if (search) query.search = search
  if (timeFrom) query.timeFrom = timeFrom
  if (timeTo) query.timeTo = timeTo
  if (equipment) query.equipment = equipment
  if (minCapacity > 0) query.minCapacity = minCapacity

  query.limit = 6

  if (cursor) query.cursor = cursor

  return query
}

function applyPaginationMeta(meta: CursorPaginationMeta): void {
  roomsMetaAtom.set(meta)
  roomsCursorAtom.set(meta.nextCursor ?? null)
  roomsHasMoreAtom.set(meta.hasMore)
}

export const searchRoomsAction = action(async () => {
  roomsLoadingAtom.set(true)
  roomsListAtom.set([])
  roomsCursorAtom.set(null)
  roomsHasMoreAtom.set(false)
  roomsMetaAtom.set(null)

  const query = buildSearchQuery()
  lastAppliedFiltersAtom.set({
    ...query,
  })
  const { data } = await wrap(roomsApi.searchRooms(query))

  if (data) {
    roomsListAtom.set(data.data)
    applyPaginationMeta(data.meta)
  }

  roomsLoadingAtom.set(false)
}, "rooms.search")

export const loadMoreRoomsAction = action(async () => {
  const cursor = roomsCursorAtom()
  if (!cursor || roomsLoadingAtom()) return

  roomsLoadingAtom.set(true)

  const query = buildSearchQuery(cursor)
  const { data } = await wrap(roomsApi.searchRooms(query))

  if (data) {
    roomsListAtom.set([...roomsListAtom(), ...data.data])
    applyPaginationMeta(data.meta)
  }

  roomsLoadingAtom.set(false)
}, "rooms.loadMore")

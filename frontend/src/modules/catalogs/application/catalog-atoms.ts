import { action, atom, computed, withAsync, withAsyncData, wrap } from "@reatom/core"

import { localeAtom } from "@/modules/i18n"

import * as catalogsApi from "../infrastructure/catalogs-api"
import type {
  AdminBuilding,
  AdminBookingPurpose,
  AdminRoomType,
  BuildingBody,
  BookingPurposeBody,
  BookingPurposeOption,
  BuildingOption,
  RoomTypeBody,
  RoomTypeOption,
} from "../infrastructure/catalogs-api"

const CATALOG_TTL_MS = 24 * 60 * 60 * 1000

interface CacheEntry<T> {
  items: T[]
  locale: string
  updatedAt: number
}

function isFresh<T>(entry: CacheEntry<T> | null, locale: string): entry is CacheEntry<T> {
  return Boolean(entry && entry.locale === locale && Date.now() - entry.updatedAt < CATALOG_TTL_MS)
}

const buildingsCacheAtom = atom<CacheEntry<BuildingOption> | null>(null, "catalogs.buildingsCache")
const roomTypesCacheAtom = atom<CacheEntry<RoomTypeOption> | null>(null, "catalogs.roomTypesCache")
const bookingPurposesCacheAtom = atom<CacheEntry<BookingPurposeOption> | null>(
  null,
  "catalogs.bookingPurposesCache",
)

const buildingsResource = computed(async () => {
  const locale = localeAtom()
  const cache = buildingsCacheAtom()
  if (isFresh(cache, locale)) return cache.items

  const { data, error } = await wrap(catalogsApi.listBuildings())
  if (error || !data) throw new Error("Failed to load buildings")

  const items = data.data ?? []
  buildingsCacheAtom.set({ items, locale, updatedAt: Date.now() })
  return items
}, "catalogs.buildingsResource").extend(
  withAsyncData({
    initState: [] as BuildingOption[],
    status: true,
    mapPayload: (payload: BuildingOption[]) => payload,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
)

const bookingPurposesResource = computed(async () => {
  const locale = localeAtom()
  const cache = bookingPurposesCacheAtom()
  if (isFresh(cache, locale)) return cache.items

  const { data, error } = await wrap(catalogsApi.listBookingPurposes())
  if (error || !data) throw new Error("Failed to load booking purposes")

  const items = data.data ?? []
  bookingPurposesCacheAtom.set({ items, locale, updatedAt: Date.now() })
  return items
}, "catalogs.bookingPurposesResource").extend(
  withAsyncData({
    initState: [] as BookingPurposeOption[],
    status: true,
    mapPayload: (payload: BookingPurposeOption[]) => payload,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
)

const roomTypesResource = computed(async () => {
  const locale = localeAtom()
  const cache = roomTypesCacheAtom()
  if (isFresh(cache, locale)) return cache.items

  const { data, error } = await wrap(catalogsApi.listRoomTypes())
  if (error || !data) throw new Error("Failed to load room types")

  const items = data.data ?? []
  roomTypesCacheAtom.set({ items, locale, updatedAt: Date.now() })
  return items
}, "catalogs.roomTypesResource").extend(
  withAsyncData({
    initState: [] as RoomTypeOption[],
    status: true,
    mapPayload: (payload: RoomTypeOption[]) => payload,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
)

const adminBookingPurposesResource = computed(async () => {
  const { data, error } = await wrap(catalogsApi.listAdminBookingPurposes())
  if (error || !data) throw new Error("Failed to load booking purposes")
  return data.data ?? []
}, "catalogs.adminBookingPurposesResource").extend(
  withAsyncData({
    initState: [] as AdminBookingPurpose[],
    status: true,
    mapPayload: (payload: AdminBookingPurpose[]) => payload,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
)

const adminBuildingsResource = computed(async () => {
  const { data, error } = await wrap(catalogsApi.listAdminBuildings())
  if (error || !data) throw new Error("Failed to load buildings")
  return data.data ?? []
}, "catalogs.adminBuildingsResource").extend(
  withAsyncData({
    initState: [] as AdminBuilding[],
    status: true,
    mapPayload: (payload: AdminBuilding[]) => payload,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
)

const adminRoomTypesResource = computed(async () => {
  const { data, error } = await wrap(catalogsApi.listAdminRoomTypes())
  if (error || !data) throw new Error("Failed to load room types")
  return data.data ?? []
}, "catalogs.adminRoomTypesResource").extend(
  withAsyncData({
    initState: [] as AdminRoomType[],
    status: true,
    mapPayload: (payload: AdminRoomType[]) => payload,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
)

export const buildingsListAtom = computed(() => buildingsResource.data(), "catalogs.buildings")
export const roomTypesListAtom = computed(() => roomTypesResource.data(), "catalogs.roomTypes")
export const bookingPurposesListAtom = computed(
  () => bookingPurposesResource.data(),
  "catalogs.bookingPurposes",
)
export const adminBookingPurposesAtom = computed(
  () => adminBookingPurposesResource.data(),
  "catalogs.adminBookingPurposes",
)
export const adminBuildingsAtom = computed(
  () => adminBuildingsResource.data(),
  "catalogs.adminBuildings",
)
export const adminRoomTypesAtom = computed(
  () => adminRoomTypesResource.data(),
  "catalogs.adminRoomTypes",
)

export const fetchBuildingsAction = action(async () => wrap(buildingsResource.retry()), "catalogs.fetchBuildings")
export const fetchRoomTypesAction = action(
  async () => wrap(roomTypesResource.retry()),
  "catalogs.fetchRoomTypes",
)
export const fetchBookingPurposesAction = action(
  async () => wrap(bookingPurposesResource.retry()),
  "catalogs.fetchBookingPurposes",
)
export const fetchAdminBookingPurposesAction = action(
  async () => wrap(adminBookingPurposesResource.retry()),
  "catalogs.fetchAdminBookingPurposes",
).extend(withAsync({ status: true }))

export const fetchAdminBuildingsAction = action(
  async () => wrap(adminBuildingsResource.retry()),
  "catalogs.fetchAdminBuildings",
).extend(withAsync({ status: true }))

export const fetchAdminRoomTypesAction = action(
  async () => wrap(adminRoomTypesResource.retry()),
  "catalogs.fetchAdminRoomTypes",
).extend(withAsync({ status: true }))

export const createBuildingMutation = action(async (body: BuildingBody) => {
  const { data, error } = await wrap(catalogsApi.createBuilding(body))
  if (error || !data) throw new Error("Failed to create building")
  buildingsCacheAtom.set(null)
  await wrap(adminBuildingsResource.retry())
  return data.data
}, "catalogs.createBuilding").extend(withAsync({ status: true }))

export const updateBuildingMutation = action(
  async ({ code, body }: { code: string; body: BuildingBody }) => {
    const { data, error } = await wrap(catalogsApi.updateBuilding(code, body))
    if (error || !data) throw new Error("Failed to update building")
    buildingsCacheAtom.set(null)
    await wrap(adminBuildingsResource.retry())
    return data.data
  },
  "catalogs.updateBuilding",
).extend(withAsync({ status: true }))

export const deactivateBuildingMutation = action(async (code: string) => {
  const { error } = await wrap(catalogsApi.deactivateBuilding(code))
  if (error) throw new Error("Failed to deactivate building")
  buildingsCacheAtom.set(null)
  await wrap(adminBuildingsResource.retry())
}, "catalogs.deactivateBuilding").extend(withAsync({ status: true }))

export const reactivateBuildingMutation = action(async (code: string) => {
  const { data, error } = await wrap(catalogsApi.reactivateBuilding(code))
  if (error || !data) throw new Error("Failed to reactivate building")
  buildingsCacheAtom.set(null)
  await wrap(adminBuildingsResource.retry())
  return data.data
}, "catalogs.reactivateBuilding").extend(withAsync({ status: true }))

export const hardDeleteBuildingMutation = action(async (code: string) => {
  const { error } = await wrap(catalogsApi.hardDeleteBuilding(code))
  if (error) throw new Error("Failed to delete building")
  buildingsCacheAtom.set(null)
  await wrap(adminBuildingsResource.retry())
}, "catalogs.hardDeleteBuilding").extend(withAsync({ status: true }))

export const createRoomTypeMutation = action(async (body: RoomTypeBody) => {
  const { data, error } = await wrap(catalogsApi.createRoomType(body))
  if (error || !data) throw new Error("Failed to create room type")
  roomTypesCacheAtom.set(null)
  await wrap(adminRoomTypesResource.retry())
  return data.data
}, "catalogs.createRoomType").extend(withAsync({ status: true }))

export const updateRoomTypeMutation = action(
  async ({ code, body }: { code: string; body: RoomTypeBody }) => {
    const { data, error } = await wrap(catalogsApi.updateRoomType(code, body))
    if (error || !data) throw new Error("Failed to update room type")
    roomTypesCacheAtom.set(null)
    await wrap(adminRoomTypesResource.retry())
    return data.data
  },
  "catalogs.updateRoomType",
).extend(withAsync({ status: true }))

export const deactivateRoomTypeMutation = action(async (code: string) => {
  const { error } = await wrap(catalogsApi.deactivateRoomType(code))
  if (error) throw new Error("Failed to deactivate room type")
  roomTypesCacheAtom.set(null)
  await wrap(adminRoomTypesResource.retry())
}, "catalogs.deactivateRoomType").extend(withAsync({ status: true }))

export const reactivateRoomTypeMutation = action(async (code: string) => {
  const { data, error } = await wrap(catalogsApi.reactivateRoomType(code))
  if (error || !data) throw new Error("Failed to reactivate room type")
  roomTypesCacheAtom.set(null)
  await wrap(adminRoomTypesResource.retry())
  return data.data
}, "catalogs.reactivateRoomType").extend(withAsync({ status: true }))

export const hardDeleteRoomTypeMutation = action(async (code: string) => {
  const { error } = await wrap(catalogsApi.hardDeleteRoomType(code))
  if (error) throw new Error("Failed to delete room type")
  roomTypesCacheAtom.set(null)
  await wrap(adminRoomTypesResource.retry())
}, "catalogs.hardDeleteRoomType").extend(withAsync({ status: true }))

export const createBookingPurposeMutation = action(async (body: BookingPurposeBody) => {
  const { data, error } = await wrap(catalogsApi.createBookingPurpose(body))
  if (error || !data) throw new Error("Failed to create booking purpose")
  bookingPurposesCacheAtom.set(null)
  await wrap(adminBookingPurposesResource.retry())
  return data.data
}, "catalogs.createBookingPurpose").extend(withAsync({ status: true }))

export const updateBookingPurposeMutation = action(
  async ({ code, body }: { code: string; body: BookingPurposeBody }) => {
    const { data, error } = await wrap(catalogsApi.updateBookingPurpose(code, body))
    if (error || !data) throw new Error("Failed to update booking purpose")
    bookingPurposesCacheAtom.set(null)
    await wrap(adminBookingPurposesResource.retry())
    return data.data
  },
  "catalogs.updateBookingPurpose",
).extend(withAsync({ status: true }))

export const deactivateBookingPurposeMutation = action(async (code: string) => {
  const { error } = await wrap(catalogsApi.deactivateBookingPurpose(code))
  if (error) throw new Error("Failed to deactivate booking purpose")
  bookingPurposesCacheAtom.set(null)
  await wrap(adminBookingPurposesResource.retry())
}, "catalogs.deactivateBookingPurpose").extend(withAsync({ status: true }))

export const reactivateBookingPurposeMutation = action(async (code: string) => {
  const { data, error } = await wrap(catalogsApi.reactivateBookingPurpose(code))
  if (error || !data) throw new Error("Failed to reactivate booking purpose")
  bookingPurposesCacheAtom.set(null)
  await wrap(adminBookingPurposesResource.retry())
  return data.data
}, "catalogs.reactivateBookingPurpose").extend(withAsync({ status: true }))

export const hardDeleteBookingPurposeMutation = action(async (code: string) => {
  const { error } = await wrap(catalogsApi.hardDeleteBookingPurpose(code))
  if (error) throw new Error("Failed to delete booking purpose")
  bookingPurposesCacheAtom.set(null)
  await wrap(adminBookingPurposesResource.retry())
}, "catalogs.hardDeleteBookingPurpose").extend(withAsync({ status: true }))

export const invalidateCatalogsAction = action(() => {
  buildingsCacheAtom.set(null)
  roomTypesCacheAtom.set(null)
  bookingPurposesCacheAtom.set(null)
}, "catalogs.invalidate")

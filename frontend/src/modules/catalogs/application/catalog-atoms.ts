import { action, atom, computed, withAsync, withAsyncData, wrap } from "@reatom/core"

import { localeAtom } from "@/modules/i18n"

import * as catalogsApi from "../infrastructure/catalogs-api"
import type {
  AdminBookingPurpose,
  BookingPurposeBody,
  BookingPurposeOption,
  BuildingOption,
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

export const buildingsListAtom = computed(() => buildingsResource.data(), "catalogs.buildings")
export const bookingPurposesListAtom = computed(
  () => bookingPurposesResource.data(),
  "catalogs.bookingPurposes",
)
export const adminBookingPurposesAtom = computed(
  () => adminBookingPurposesResource.data(),
  "catalogs.adminBookingPurposes",
)

export const fetchBuildingsAction = action(async () => wrap(buildingsResource.retry()), "catalogs.fetchBuildings")
export const fetchBookingPurposesAction = action(
  async () => wrap(bookingPurposesResource.retry()),
  "catalogs.fetchBookingPurposes",
)
export const fetchAdminBookingPurposesAction = action(
  async () => wrap(adminBookingPurposesResource.retry()),
  "catalogs.fetchAdminBookingPurposes",
).extend(withAsync({ status: true }))

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
  bookingPurposesCacheAtom.set(null)
}, "catalogs.invalidate")

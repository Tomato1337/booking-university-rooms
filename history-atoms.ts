const HISTORY_SEARCH_DEBOUNCE_MS = 300
const DEFAULT_HISTORY_LIMIT = 8

interface HistoryBookingsPayload {
  items: AdminPendingBooking[]
  meta: components["schemas"]["CursorPaginationMetaWithTotal"]
  requestKey: string
  requestCursor: string | null
}


function createHistoryRequestKey(query: adminApi.ListPendingQuery): string {
  return JSON.stringify({
    search: query.search ?? null,
    limit: query.limit ?? DEFAULT_HISTORY_LIMIT,
    cursor: query.cursor ?? null,
  })
}

export const historySearchAtom = atom("", "historySearchAtom")
const historySearchRevisionAtom = atom(0, "historySearchRevisionAtom")

const historyCursorInputAtom = atom<string | null>(null, "historyCursorInputAtom")
const historyRequestQueryAtom = atom<adminApi.ListPendingQuery | null>(null, "historyRequestQueryAtom")
const loadedHistoryPageKeysAtom = atom<string[]>([], "loadedHistoryPageKeysAtom")

export const historyPagesAtom = atom<AdminPendingBooking[][]>([], "historyPagesAtom")
export const historyMetaAtom = atom<components["schemas"]["CursorPaginationMetaWithTotal"]>(
  createEmptyMeta(),
  "historyMetaAtom",
)
export const historyBookingsListAtom = computed(
  () => historyPagesAtom().flat(),
  "historyBookingsListAtom",
)
export const historyHasMoreAtom = computed(() => historyMetaAtom().hasMore, "historyHasMoreAtom")
export const historyTotalAtom = computed(() => historyMetaAtom().total, "historyTotalAtom")

export const searchHistoryBookingsAction = action(async () => {
  historyCursorInputAtom.set(null)
  historyPagesAtom.set([])
  historyMetaAtom.set(createEmptyMeta())
  loadedHistoryPageKeysAtom.set([])

  const search = historySearchAtom().trim()
  const requestQuery: adminApi.ListPendingQuery = {
    search: search || undefined,
    limit: DEFAULT_HISTORY_LIMIT,
    cursor: undefined,
  }

  historyRequestQueryAtom.set(requestQuery)
  return await wrap(historyBookingsQuery.retry())
}, "searchHistoryBookingsAction").extend(withAsync({ status: true }))

export const loadMoreHistoryBookingsAction = action(async () => {
  const nextCursor = historyMetaAtom().nextCursor ?? null

  if (!nextCursor || !historyHasMoreAtom()) {
    return null
  }

  historyCursorInputAtom.set(nextCursor)

  const search = historySearchAtom().trim()
  const requestQuery: adminApi.ListPendingQuery = {
    search: search || undefined,
    limit: DEFAULT_HISTORY_LIMIT,
    cursor: nextCursor,
  }

  historyRequestQueryAtom.set(requestQuery)

  const requestKey = createHistoryRequestKey(requestQuery)
  if (loadedHistoryPageKeysAtom().includes(requestKey)) {
    return historyBookingsQuery.data()
  }

  return await wrap(historyBookingsQuery.retry())
}, "loadMoreHistoryBookingsAction").extend(withAsync({ status: true }))

export const updateHistorySearchAction = action(async (value: string) => {
  historySearchAtom.set(value)
  const nextRevision = historySearchRevisionAtom() + 1
  historySearchRevisionAtom.set(nextRevision)

  await wrap(sleep(HISTORY_SEARCH_DEBOUNCE_MS))

  if (historySearchRevisionAtom() !== nextRevision) {
    return null
  }

  return await wrap(searchHistoryBookingsAction())
}, "updateHistorySearchAction").extend(withAsync({ status: true }))

export const historyBookingsQuery = computed(async () => {
  historySearchRevisionAtom()
  historyCursorInputAtom()

  const query = historyRequestQueryAtom()
  if (!query) {
    return {
      items: [] as AdminPendingBooking[],
      meta: createEmptyMeta(),
      requestKey: "",
      requestCursor: null,
    }
  }

  const { data, error } = await wrap(adminApi.listHistory(query))

  if (error || !data) {
    throw new Error("Failed to load history bookings")
  }

  return {
    items: data.data,
    meta: data.meta,
    requestKey: createHistoryRequestKey(query),
    requestCursor: query.cursor ?? null,
  }
}, "historyBookingsQuery").extend(
  withAsyncData({
    initState: {
      items: [] as AdminPendingBooking[],
      meta: createEmptyMeta(),
      requestKey: "",
      requestCursor: null,
    } satisfies HistoryBookingsPayload,
    status: true,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
)

historyBookingsQuery.onFulfill.extend(
  withCallHook(({ payload }) => {
    historyMetaAtom.set(payload.meta)

    if (payload.requestCursor === null) {
      historyPagesAtom.set([payload.items])
      loadedHistoryPageKeysAtom.set(payload.requestKey ? [payload.requestKey] : [])
      return
    }

    if (!payload.requestKey || loadedHistoryPageKeysAtom().includes(payload.requestKey)) {
      return
    }

    historyPagesAtom.set((pages) => [...pages, payload.items])
    loadedHistoryPageKeysAtom.set((keys) => [...keys, payload.requestKey])
  }),
)

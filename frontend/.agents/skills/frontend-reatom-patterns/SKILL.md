---
name: frontend-reatom-patterns
description: Canonical Reatom v1000 coding patterns for this frontend. Use for all state/query/mutation/refetch/caching work in modules/*/application and pages using reatomComponent.
---

# Frontend Reatom Patterns (Project Canon)

Apply these rules for **all** Reatom code in `/frontend/src`.

## 1) Non-negotiable Rules

1. **Reatom v1000 only** (`@reatom/core`, `@reatom/react`).
2. **Every async boundary must use `wrap(...)`**.
3. **UI pages are presentation layer**:
   - no direct API calls,
   - no cache orchestration,
   - no hidden request side effects.
4. **Application layer owns orchestration** (atoms/resources/actions).
5. **Public module boundary only**: import via `@/modules/{name}`.

## 2) Query Pattern (GET)

Use `computed(async () => ...)` + `withAsyncData(...)`.

```ts
const userResource = computed(async () => {
  const id = userIdAtom()
  const response = await wrap(api.getUser(id))
  if (!response.data) throw new Error("Failed to load user")
  return response.data
}, "users.resource").extend(
  withAsyncData({
    initState: null,
    status: true,
    parseError: (error) => (error instanceof Error ? error : new Error(String(error))),
  }),
)
```

Use in state/UI:

- `resource.data()` → cached payload
- `resource.status().isFirstPending` → first-load skeleton
- `resource.status().isPending` → background refresh indicator
- `resource.error()` → error surface
- `resource.retry()` → refetch

## 3) Mutation Pattern (POST/PUT/PATCH/DELETE)

Use `action(async ...)` + `withAsync({ status: true })`.

```ts
const createBookingAction = action(async (body: CreateBookingRequest) => {
  const { data, error } = await wrap(api.createBooking(body))
  if (error || !data) throw new Error("Create booking failed")

  await wrap(bookingsResource.retry())
  await wrap(roomDetailResource.retry())

  return data.data
}, "bookings.create").extend(withAsync({ status: true }))
```

## 4) Derived State Pattern

Prefer `computed` over extra manual atoms/actions for derived data.

```ts
const canSubmit = computed(() => {
  const status = createBookingAction.status()
  return !status.isPending && Boolean(form.fields.title() && form.fields.startTime())
}, "bookings.canSubmit")
```

## 5) Lifecycle Hooks Pattern

For async lifecycle behavior, use `onFulfill/onReject/onSettle` with `withCallHook`.

```ts
resource.onFulfill.extend(
  withCallHook(({ payload }) => {
    listAtom.set(payload.items)
  }),
)
```

Do **not** use unsupported hook syntax variants.

## 6) Search & Filters Pattern (Rooms policy)

Project policy:

1. **Search input** triggers request with debounce (`300ms`).
2. **Other filters** (date/time/equipment/capacity) do **not** auto-fetch.
3. **Find Available Rooms button** always triggers request.
4. **Initial page enter** triggers initial request automatically.

Implementation style:

- explicit action `updateSearchInputAction(value)` with debounce + revision guard,
- explicit `searchAction()` for manual button,
- explicit `activatePageAction()` / `deactivatePageAction()` for mount lifecycle.

## 7) Infinite Scroll Pattern

Do not replace list on pagination.

- If payload cursor is `null` (new search) → replace pages.
- If payload cursor exists (next page) → append.
- Deduplicate page inserts by request key.

```ts
if (payload.requestCursor === null) pagesAtom.set([payload.items])
else pagesAtom.set((pages) => [...pages, payload.items])
```

## 8) Cache & Invalidation Pattern

Reatom resource state is the primary cache. Additional in-memory cache is allowed when TTL policy is required.

- keep cache in application layer,
- keep deterministic request keys,
- invalidate/retry related resources after mutations.

Use project TTL policy from feature requirements (example used in this repo: rooms/search 60s, room detail 60s, bookings/history 120s).

## 9) Forms Pattern

Use `reatomForm` in `application/` with Zod schema from `domain/`.

```ts
export const loginForm = reatomForm(
  { email: "", password: "" },
  {
    name: "loginForm",
    validateOnBlur: true,
    schema: loginSchema,
    onSubmit: async (values) => {
      await wrap(loginAction(values))
    },
  },
)
```

## 10) Anti-Patterns (forbidden)

- Hidden network side effects via passive atom watchers for business requests.
- Manual duplicated loading/error atoms when async extension already provides them.
- Direct API calls from page components.
- Chaining async without `wrap`.
- Replacing paginated lists on load-more.

## 11) PR Review Checklist

- [ ] Query paths use `withAsyncData`.
- [ ] Mutation paths use `withAsync({ status: true })`.
- [ ] All async boundaries use `wrap`.
- [ ] Derived data uses `computed`.
- [ ] Page components are presentation-only.
- [ ] Pagination appends correctly.
- [ ] Search/filter behavior matches project policy.

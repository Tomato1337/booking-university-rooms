# AGENTS.md — Coding Agent Guide

## Build & Dev Commands

```bash
pnpm dev              # Start Vite dev server (http://localhost:5173)
pnpm build            # Type-check (tsc -b) + production build
pnpm lint             # ESLint across all .ts/.tsx files
```

**Important**: `tsc --noEmit` alone does NOT catch all errors — it uses the root tsconfig
which has `"files": []`. Always use `pnpm build` (runs `tsc -b`) for real type-checking
via project references (`tsconfig.app.json`).

No test runner is configured yet. When added (likely Vitest), single-test will be:

```bash
pnpm exec vitest run src/path/to/file.test.ts
```

## Stack

- **Runtime**: Vite 8 + React 19 + TypeScript 5.9 (strict, ES2023 target, `verbatimModuleSyntax`)
- **State & Routing**: Reatom v1000 (`@reatom/core`, `@reatom/react`) — atoms, `reatomRoute`, `reatomComponent`, `reatomForm`
- **Validation**: Zod 4 (`zod@^4`) — import as `import { z } from "zod/v4"` (NOT `"zod"`)
- **API client**: `openapi-fetch` — typed against auto-generated `schema.d.ts` from OpenAPI spec
- **API mocks**: `openapi-msw` + `msw` — typed MSW handlers for DEV mode
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + shadcn/ui (radix-lyra style)
- **Icons**: `@tabler/icons-react` — never use other icon libraries
- **Primitives**: `radix-ui` — import as `import { X } from "radix-ui"` (NOT `@radix-ui/react-x`)
- **Package manager**: pnpm — ESM (`"type": "module"`)

## Architecture — FEOD (Feature-Sliced + Domain-Driven)

```
src/
  setup.ts        # Reatom init: clearStack() → context.start() → installAuthMiddleware
  main.tsx        # Entry: MSW (DEV) → checkAuthAction → reatomContext.Provider + <App />
  app/
    App.tsx       # reatomComponent — auth guard, shell layout, rootRoute.render()
    routes.ts     # Central route registry (re-exports all page routes + rootRoute)
    index.css     # All design tokens, CSS variables, Tailwind @theme inline
  pages/          # Route-level screens — each page defines its own reatomRoute
    {name}/
      ui/           # Page component + route definition in the same file
      index.ts      # PUBLIC API — exports route (e.g. dashboardRoute)
  modules/        # Domain-specific bounded contexts (auth, bookings, rooms, ...)
    {name}/
      domain/         # Types (from OpenAPI), Zod schemas, mappers — pure TS, no React
      infrastructure/ # API functions (openapi-fetch), middleware, storage, mocks/
      application/    # Reatom atoms/actions, reatomForm, state orchestration
      ui/             # Domain-specific React components
      index.ts        # PUBLIC API — the only valid import target
  shared/
    api/
      client.ts     # openapi-fetch createClient<paths> — typed API client
      schema.d.ts   # Auto-generated from OpenAPI spec (openapi-typescript)
    mocks/
      browser.ts    # MSW setupWorker (DEV only)
      http.ts       # createOpenApiHttp<paths> — typed MSW request helpers
      utils.ts      # Error factories (to401, to404, to500, neverResolve)
    router.ts       # rootRoute (reatomRoute with outlet)
    ui/             # Generic reusable components (Button, Badge, Card, ...)
    lib/            # Utilities (cn(), etc.)
    hooks/          # Generic hooks
```

### Init Pipeline

```
setup.ts                          main.tsx bootstrap()
────────                          ────────────────────
clearStack()                      if (DEV) startMockWorker(...authMockHandlers)
context.start() → rootFrame       rootFrame.run(checkAuthAction)
installAuthMiddleware()           createRoot → <reatomContext.Provider> → <App />
```

`main.tsx` MUST `import "./setup"` as the very first import. Bootstrap is async to await MSW init in DEV.

### Module Anatomy (reference: `modules/auth/`)

Every domain module with business logic SHOULD have all 4 layers:

```
modules/auth/
  domain/
    types.ts          # Type aliases from OpenAPI + app-specific types
    schemas.ts        # Zod 4 validation schemas (forms, runtime checks)
  infrastructure/
    auth-api.ts       # API functions via apiClient.POST/GET/etc.
    auth-middleware.ts # openapi-fetch middleware (JWT inject, 401 refresh)
    token-storage.ts  # In-memory token state + auth failure callback
    mocks/
      data.ts         # Mock state (tokens, users) + simulators
      handlers.ts     # MSW handlers via openapi-msw http helper
  application/
    auth-atoms.ts     # Reatom atoms + async actions (login, register, checkAuth)
    auth-forms.ts     # reatomForm instances with Zod schema validation
  index.ts            # PUBLIC barrel — exports only what other layers need
```

**Layer rules**:

- `domain/` — zero dependencies on other layers. Pure TS. Types + schemas only.
- `infrastructure/` — depends on `domain/` (types) + `shared/api` (client). No React.
- `application/` — depends on `domain/` + `infrastructure/`. Reatom atoms/actions. No React.
- `ui/` — depends on `application/` (atoms/forms) + `shared/ui`. React components.
- `index.ts` — re-exports from any layer. Other modules import ONLY from here.

UI-only modules (e.g. `sidebar/`, `rooms/` with only presentational components) can have just `ui/` + `index.ts` until business logic is needed.

### Types from OpenAPI (mandatory pattern)

**ALWAYS** derive types from the auto-generated `shared/api/schema.d.ts` instead of writing types manually. Create thin aliases in `domain/types.ts`:

```ts
import type { components } from "@/shared/api/schema";

// App-specific types (not in OpenAPI) — define directly
export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

// API types — ALWAYS alias from OpenAPI schema, never redefine manually
export type User = components["schemas"]["User"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type RegisterRequest = components["schemas"]["RegisterRequest"];
```

**Why**: OpenAPI schema is auto-generated from the backend spec (`docs/openapi.yaml` → `pnpm exec openapi-typescript`). Manual types drift from the actual API. Aliases stay in sync automatically when the schema is regenerated.

**When to create app-specific types**: Only for frontend-only concepts not in the API (e.g. `AuthStatus`, `TimeSlotStatus` for UI state, form-specific unions). You can also create mapped types based on API types if needed (e.g. `type UserProfile = Pick<User, "id" | "name" | "avatarUrl">`).

### Import Rules (strict)

1. **Layer dependency**: `app` → `pages` → `modules` → `shared`. Never import upward.
2. **Module boundary**: Import from `@/modules/{name}` (the `index.ts`), never deep-import.
3. **Shared is standalone**: `shared/` cannot import from `modules/`, `pages/`, or `app/`.
4. **Path alias**: Always use `@/` prefix (maps to `./src/*`).
5. **Within a module**: layers import downward only: `ui → application → infrastructure → domain`.

### Reatom Patterns

- **Initialization**: `src/setup.ts` calls `clearStack()` before anything, then `context.start()`.
  `src/main.tsx` must `import "./setup"` as the very first import.
- **Components**: Use `reatomComponent(() => ..., "Name")` — auto-subscribes to atoms.
  Use `useWrap()` for event handlers inside `reatomComponent` to preserve Reatom context.
- **Async actions**: Use `action(async () => { ... }, "name")`. Inside async actions, wrap
  every async call with `await wrap(somePromise)` to maintain Reatom transaction context.
- **Routing**: Routes defined via `rootRoute.reatomRoute({ path, render }, "name")`.
  Route + page component live in the same file (`pages/{name}/ui/{Name}Page.tsx`).
  Navigation: `route.go()` programmatic, `route.path()` for hrefs, `route.match()` for active state.
- **Route registry**: All routes re-exported through `src/app/routes.ts`. Importing a route
  from `@/pages/{name}` triggers its registration with the router.

More info about Reatom here — https://raw.githubusercontent.com/reatom/reatom/refs/heads/v1000/summary.md

### Reatom Form Patterns

Forms use `reatomForm` from `@reatom/core` + Zod schema from `domain/schemas.ts`:

```ts
// application/auth-forms.ts
import { reatomField, reatomForm, wrap } from "@reatom/core";
import { loginSchema } from "../domain/schemas";
import { loginAction } from "./auth-atoms";

export const loginForm = reatomForm(
  { email: "", password: "" }, // initial values → auto-creates fields
  {
    name: "loginForm",
    validateOnBlur: true, // or validateOnChange: true
    schema: loginSchema, // Zod schema for form-level validation
    onSubmit: async (values) => {
      await wrap(loginAction(values)); // wrap() for async Reatom context
    },
  },
);
```

**Custom field validation** (e.g. confirmPassword cross-field check):

```ts
confirmPassword: reatomField("", {
  validate: ({ state }) =>
    state && state !== registerForm.fields.password() ? "Passwords do not match" : "",
}),
```

**In UI** — use `bindField()` to connect form fields to inputs:

```tsx
// Destructure error separately — it must NOT be spread onto DOM elements
const { error: emailError, ...emailBind } = bindField(fields.email)

<Input {...emailBind} aria-invalid={!!emailError} />
{emailError && <p className={errorClassName}>{emailError}</p>}
```

**Validation flow**: `field.validate()` → if any truthy → STOP. Otherwise → `schema.parse()` → `onSubmit()`.

### API & Infrastructure Patterns

**API client** (`shared/api/client.ts`): `openapi-fetch` typed against `paths` from auto-generated schema:

```ts
import createClient from "openapi-fetch";
import type { paths } from "./schema";
export const apiClient = createClient<paths>({ baseUrl: "/api", credentials: "same-origin" });
```

**Module API functions** (`infrastructure/{name}-api.ts`): Thin wrappers around `apiClient`:

```ts
import { apiClient } from "@/shared/api/client";
export function login(body: LoginRequest) {
  return apiClient.POST("/auth/login", { body });
}
```

**MSW mocks** (`infrastructure/mocks/`): Each module provides its own typed handlers:

```ts
// handlers.ts — uses openapi-msw for typed request/response
import { http } from "@/shared/mocks/http"  // createOpenApiHttp<paths>
export const authLogin = {
  default: http.post("/auth/login", async ({ request, response }) => { ... }),
}
export const authMockHandlers = [authLogin.default, ...]
```

Mock handlers are registered in `main.tsx` bootstrap: `await startMockWorker(...authMockHandlers)`.

## Code Style

### TypeScript

- **Strict mode** with `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`.
- Use `type` keyword for type-only imports: `import type { Foo } from "..."`.
- Prefer `interface` for component props. Export both the component and its props type.
- Use `React.ComponentProps<"element">` intersection for extending HTML element props.
- No enums — use union string literal types or `as const` objects.

### Components

- **Function declarations** for shared UI: `function Button() {}`.
- **`reatomComponent`** for anything that reads atoms (pages, sidebar, domain components).
- Every component gets a `data-slot="component-name"` attribute on its root element.
- Use `cva()` for variant definitions, `cn()` from `@/shared/lib/utils` for class merging.
- Props: `React.ComponentProps<"element"> & VariantProps<typeof variants> & { custom?: ... }`.

### Naming

- **Files**: `kebab-case.tsx` for shared UI, `PascalCase.tsx` for pages and domain components.
- **Components**: `PascalCase` — `Button`, `MetricCard`, `BookingRow`.
- **Variants**: `camelCase` — `buttonVariants`, `badgeVariants`.
- **CSS variables**: `--kebab-case` — `--surface-container-high`, `--primary-dim`.
- **Types/Interfaces**: `PascalCase` — `RoomCardProps`, `TimeSlot`.
- **Atoms/Actions**: `camelCase` with domain prefix — `timerDurationAtom`, `startTimer`.

### Formatting

- No semicolons.
- Double quotes for imports and JSX attributes.
- 2-space indentation.
- Trailing commas in multi-line structures.

### Import Order

```tsx
// 1. Side-effect imports (CSS, setup)
import "./index.css";

// 2. React / type-only
import type { ReactNode } from "react";

// 3. External libraries (reatom, radix-ui, cva, tabler icons)
import { urlAtom, withChangeHook } from "@reatom/core";
import { reatomComponent } from "@reatom/react";
import { IconUser } from "@tabler/icons-react";

// 4. Internal: pages (routes)
import { dashboardRoute } from "@/pages/dashboard";

// 5. Internal: modules (via public API)
import { BookingRow } from "@/modules/bookings";

// 6. Internal: shared
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

// 7. Relative imports (siblings)
import { UserCard } from "./UserCard";
```

## Design System — Brutalist Concierge (Dark-Only)

1. **Dark theme ONLY** — no light mode, no `prefers-color-scheme`, no `dark:` prefixes.
2. **All colors via CSS variables in OKLCH** — NO hardcoded hex in components.
3. **No borders for sectioning** — use background color shifts between surface layers.
4. **No drop shadows** — tonal layering only.
5. **Border radius**: `0.125rem` (2px) — brutalist sharp corners.
6. **Transitions**: `duration-150 ease-linear` — machine-like snapping.
7. **Font**: Inter Variable (`--font-sans`).
8. **NOT Next.js RSC** — no `"use client"` directives.

### Key Tokens (in `src/app/index.css`)

| Token                                       | Role                    | Hue |
| ------------------------------------------- | ----------------------- | --- |
| `--primary`                                 | Electric Violet accent  | 280 |
| `--secondary`                               | "Occupied" red          | 25  |
| `--tertiary`                                | "Pending" yellow        | 85  |
| `--surface` → `--surface-container-highest` | 6-level tonal hierarchy | 60  |

Surface order: `lowest` (black) < `surface` < `low` < `container` < `high` < `highest`.

### shadcn Components

- Config: `components.json` (style `radix-lyra`, aliases → `@/shared/ui`).
- Add: `pnpm exec shadcn@latest add <component>` — verify registry availability first.
- Post-gen: remove shadows, reduce radius, apply surface tokens, add `data-slot`.

## Error Handling

- No try/catch in components — use React error boundaries at page level.
- API errors handled in `application/` layer (Reatom actions set error atoms).
- Form validation via Zod schemas in `domain/` layer, wired through `reatomForm({ schema })`.
- Server errors displayed via dedicated error atoms (e.g. `authErrorAtom`), not form field errors.

## Key Files

| File                         | Purpose                                                               |
| ---------------------------- | --------------------------------------------------------------------- |
| `src/setup.ts`               | Reatom init: `clearStack` → `context.start` → `installAuthMiddleware` |
| `src/main.tsx`               | Bootstrap: MSW (DEV) → `checkAuthAction` → render                     |
| `src/app/App.tsx`            | Auth guard + shell layout + route rendering                           |
| `src/app/routes.ts`          | Central route registry (re-exports all routes)                        |
| `src/shared/router.ts`       | Root `reatomRoute` definition                                         |
| `src/shared/api/client.ts`   | `openapi-fetch` typed API client                                      |
| `src/shared/api/schema.d.ts` | Auto-generated OpenAPI types (DO NOT edit manually)                   |
| `src/shared/mocks/http.ts`   | `openapi-msw` typed MSW helpers                                       |
| `src/app/index.css`          | All design tokens, CSS variables, Tailwind theme                      |
| `src/shared/ui/`             | All generic UI components                                             |
| `src/modules/*/index.ts`     | Module public APIs (only valid import target)                         |
| `components.json`            | shadcn/ui configuration                                               |
| `vite.config.ts`             | Vite + Tailwind + path aliases                                        |

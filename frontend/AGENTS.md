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
- **State & Routing**: Reatom v1000 (`@reatom/core`, `@reatom/react`) — atoms, `reatomRoute`, `reatomComponent`
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + shadcn/ui (radix-lyra style)
- **Icons**: `@tabler/icons-react` — never use other icon libraries
- **Primitives**: `radix-ui` — import as `import { X } from "radix-ui"` (NOT `@radix-ui/react-x`)
- **Package manager**: pnpm — ESM (`"type": "module"`)

## Architecture — FEOD (Feature-Sliced + Domain-Driven)

```
src/
  setup.ts        # Reatom init: clearStack() → context.start() → connectLogger
  main.tsx        # Entry: reatomContext.Provider wrapping <App />
  app/
    App.tsx       # reatomComponent — shell layout, rootRoute.render(), urlAtom redirect
    routes.ts     # Central route registry (re-exports all page routes + rootRoute)
    index.css     # All design tokens, CSS variables, Tailwind @theme inline
  pages/          # Route-level screens — each page defines its own reatomRoute
    {name}/
      ui/           # Page component + route definition in the same file
      index.ts      # PUBLIC API — exports route (e.g. dashboardRoute)
  modules/        # Domain-specific bounded contexts (bookings, rooms, sidebar, ...)
    {name}/
      domain/         # Types, Zod schemas, mappers — pure TS, no React
      infrastructure/ # API requests, SSE, storage
      application/    # Reatom atoms/actions, React Query hooks, state management
      ui/             # Domain-specific React components
      index.ts        # PUBLIC API — the only valid import target
  shared/
    router.ts     # rootRoute (reatomRoute with outlet)
    ui/           # Generic reusable components (Button, Badge, Card, ...)
    lib/          # Utilities (cn(), etc.)
    hooks/        # Generic hooks
```

### Import Rules (strict)

1. **Layer dependency**: `app` → `pages` → `modules` → `shared`. Never import upward.
2. **Module boundary**: Import from `@/modules/{name}` (the `index.ts`), never deep-import.
3. **Shared is standalone**: `shared/` cannot import from `modules/`, `pages/`, or `app/`.
4. **Path alias**: Always use `@/` prefix (maps to `./src/*`).

### Reatom Patterns

- **Initialization**: `src/setup.ts` calls `clearStack()` before anything, then `context.start()`.
  `src/main.tsx` must `import "./setup"` as the very first import.
- **Components**: Use `reatomComponent(() => ..., "Name")` — auto-subscribes to atoms.
  Use `wrap()` for event handlers to preserve Reatom context.
- **Routing**: Routes defined via `rootRoute.reatomRoute({ path, render }, "name")`.
  Route + page component live in the same file (`pages/{name}/ui/{Name}Page.tsx`).
  Navigation: `route.go()` programmatic, `route.path()` for hrefs, `route.match()` for active state.
- **Route registry**: All routes re-exported through `src/app/routes.ts`. Importing a route
  from `@/pages/{name}` triggers its registration with the router.
more info about Reatom here - https://raw.githubusercontent.com/reatom/reatom/refs/heads/v1000/summary.md

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
import "./index.css"

// 2. React / type-only
import type { ReactNode } from "react"

// 3. External libraries (reatom, radix-ui, cva, tabler icons)
import { urlAtom, withChangeHook } from "@reatom/core"
import { reatomComponent } from "@reatom/react"
import { IconUser } from "@tabler/icons-react"

// 4. Internal: pages (routes)
import { dashboardRoute } from "@/pages/dashboard"

// 5. Internal: modules (via public API)
import { BookingRow } from "@/modules/bookings"

// 6. Internal: shared
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"

// 7. Relative imports (siblings)
import { UserCard } from "./UserCard"
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

| Token | Role | Hue |
|-------|------|-----|
| `--primary` | Electric Violet accent | 280 |
| `--secondary` | "Occupied" red | 25 |
| `--tertiary` | "Pending" yellow | 85 |
| `--surface` → `--surface-container-highest` | 6-level tonal hierarchy | 60 |

Surface order: `lowest` (black) < `surface` < `low` < `container` < `high` < `highest`.

### shadcn Components

- Config: `components.json` (style `radix-lyra`, aliases → `@/shared/ui`).
- Add: `pnpm exec shadcn@latest add <component>` — verify registry availability first.
- Post-gen: remove shadows, reduce radius, apply surface tokens, add `data-slot`.

## Error Handling

- No try/catch in components — use React error boundaries at page level.
- API errors in `application/` layer (Reatom actions or React Query `onError`).
- Form validation via Zod schemas in `domain/` layer.

## Key Files

| File | Purpose |
|------|---------|
| `src/setup.ts` | Reatom initialization (`clearStack`, `context.start`) |
| `src/main.tsx` | Entry point with `reatomContext.Provider` |
| `src/app/App.tsx` | Shell layout, route rendering, URL redirect |
| `src/app/routes.ts` | Central route registry |
| `src/shared/router.ts` | Root `reatomRoute` definition |
| `src/app/index.css` | All design tokens, CSS variables, Tailwind theme |
| `src/shared/ui/` | All generic UI components |
| `src/modules/*/index.ts` | Module public APIs |
| `components.json` | shadcn/ui configuration |
| `vite.config.ts` | Vite + Tailwind + path aliases |

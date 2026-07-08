# Rewrite plan

Source inspected: `../noob-components`

This file turns the audit and brainstorm notes into an execution order.

## Goals

1. Split the current monolith into a workspace-based UI package and admin package.
2. Simplify the toolchain to one modern build path.
3. Improve component ergonomics without throwing away the existing deep work in virtualization and measurement.
4. Untangle admin state, query ownership, transport, and theming so the frontend and Spring backend can evolve separately.

## Proposed workspace shape

### Public packages

- `@noob-naive-ui/ui`
  - value-add composites and specialized widgets
  - internal measurement/virtualization/JSON helpers
  - theme/provider bridge helpers for Naive UI
  - component resolvers and composable auto-import support
- `@noob-naive-ui/admin`
  - admin shell runtime
  - login/auth UI that consumes frontend-ready auth state and submit handlers
  - route/menu visibility application from frontend-ready inputs
  - shell-level layout/theme/language/font-size state

Naive UI is a peer, directly co-consumed foundation for internal teams. The public goal of `@noob-naive-ui/ui` is not Naive wrapper parity or Naive re-exports; it is the layer where your product adds composites, hooks, token plumbing, and specialized admin-oriented widgets.
### Internal workspace package if needed

- `@noob-naive-ui/internal-shared` or equivalent internal-only package [INFERENCE]
  - frontend-only shared TS contracts
  - route key / navigation tree utilities
  - shell runtime helper types
  - other backend-agnostic helpers proved reusable across `ui` and `admin`

Use the third package only if shared code starts leaking awkwardly across `ui` and `admin`. Do not create it by default unless the first extraction proves it necessary.

## Package-boundary decisions

### `@noob-naive-ui/ui`

Should own:

- current `packages/base` successors that add durable product value
- component-local composables that add durable product value
- `list-table-v2` successor
- `json-view` successor
- auto-import resolver
- theme/provider bridge helpers for Naive UI consumption
- token-consumer primitives and specialized widgets relevant to UI components

Should not own:

- app auth/session state
- admin route manifests
- API clients for business endpoints
- admin CRUD views
- Naive UI wrapper parity or broad Naive re-exports

### `@noob-naive-ui/admin`

Should own:

- page shell runtime and shell composition primitives
- auth shell and basic login flows as UI/runtime concerns only
- route shells, menu composition helpers, and route/menu visibility application from frontend-ready inputs
- Pinia stores for layout, theme, language, font size, and other shell-level state
- admin theme application at app shell

Should not own:

- concrete business/admin operation pages
- role/permission/dictionary/config CRUD pages
- backend-shaped query layers for business operations
- backend user/session models or session DTOs
- backend permission payloads or backend route/menu DTOs
- reference-data and RBAC assumptions tied to one backend schema
- low-level reusable UI widgets that can live in `@noob-naive-ui/ui`
- transport primitives if they become shared across packages

## Migration order

### Phase 0 — freeze the target seams in docs

Deliverables:

- final package names
- export map sketch
- decision on whether an internal shared package exists from day one
- migration glossary mapping old root exports to new homes

Why first:

- the current monolith exports `Api`, `Http`, `Store`, `Lang`, `Views`, `Common`, `Element`, `Index`, `components`, and more from one root surface (`../noob-components/package.json:20-81`, `../noob-components/index.ts:1-2`, `../noob-components/plugs/index.ts:1-11`)
- without an explicit map, implementation will drift and re-create the same sprawl

### Phase 1 — workspace and build simplification

Target:

- one pnpm workspace
- one modern Vite path
- remove Vue CLI/Babel dual-build complexity

Tasks:

1. Create workspace root and package manifests.
2. Move from monolithic manual entry enumeration to per-package Vite configs or package-local entries.
3. Remove Vue CLI build path once the new examples/docs app is working.
4. Establish TypeScript project references if needed. [INFERENCE]

Why here:

- the current repo maintains both `vite.config.ts` and `vue.config.js`/`babel.config.js`, and Vite lib build manually enumerates the monolithic export surface (`../noob-components/vite.config.ts:10-95`, `../noob-components/vue.config.js:6-42`, `../noob-components/babel.config.js:1-5`)

### Phase 2 — extract shared UI first

Target:

- working `@noob-naive-ui/ui` package with clear export rules

Tasks:

1. Move simple wrappers and low-risk primitives first.
2. Extract internal non-SFC helpers before moving complex components:
   - text measurement
   - JSON flattening
   - virtualization adapter seam
3. Rebuild `list-table-v2` and `json-view` on top of those extracted seams.
4. Add resolver-based auto-import for components and composables.

Why UI first:

- admin depends on reusable shell widgets and data display components
- the component package is the better place to establish token/style conventions before the admin shell consumes them

### Phase 3 — Naive UI foundation migration, but with constrained scope

Target:

- establish Naive UI as the settled visual foundation for the admin-first rewrite

Recommended order:

1. Introduce a Naive UI foundation layer in `@noob-naive-ui/ui`:
   - config-provider integration
   - theme-overrides bridge
   - resolver/import setup
2. Replace handwritten virtualization with TanStack Virtual where it simplifies both `list-table-v2` and `json-view`. [INFERENCE]
3. Preserve pretext-based width/height measurement where it still pays off.
4. Audit current EP-era wrappers and admin composites into three buckets:
   - direct Naive replacements
   - rebuild as your own composites on top of Naive
   - delete instead of porting

Why:

- the user has chosen Naive UI as a clean-break foundation constraint
- the important migration surface is not primitive controls alone; it includes theme-provider ownership, component coverage gaps, and admin composite redesign
- the main immediate gains still come from better seams and less custom infrastructure, not from mechanically porting every old wrapper one-for-one

### Phase 4 — admin runtime extraction

Target:

- working `@noob-naive-ui/admin` package consuming `@noob-naive-ui/ui` as a backend-decoupled shell runtime

Tasks:

1. Move route shells, head/menu components, common login shells, and shell composition helpers.
2. Split Vuex concerns into Pinia stores focused on shell/runtime state:
   - layout/theme/language
   - navigation visibility state
3. Define explicit frontend runtime contracts for:
   - login form submission and login-page state
   - frontend-ready auth status
   - visible route keys / route-visibility inputs
   - frontend-ready menu/navigation tree
4. Keep concrete backend operations and business admin pages out of the package.

Why this order:

- the new `@noob-naive-ui/admin` is a shell/runtime package, not a bundled admin-operations product
- moving shell structure and store ownership is already enough change
- backend-specific operations should land in starters/templates or app code instead of re-entering the shared package

### Phase 5 — starter/template backend integrations

Target:

- backend-specific starters/templates that consume `@noob-naive-ui/admin`, `@noob-naive-ui/ui`, and Naive UI directly

Tasks:

1. Introduce thin transport client(s) and backend-specific API modules in the starter/app layer.
2. Introduce TanStack Query wrappers / query-options layer for backend-owned server state in the starter/app layer.
3. Implement concrete role/permission/dictionary/config pages only in backend-specific starters or app code.
4. Derive frontend-ready auth state, visible route keys, and menu/navigation trees in the starter/app layer.
5. Remove global loading/message behavior from the transport core.

Why after runtime extraction:

- the package/runtime seam should exist before backend-specific integrations are designed
- this keeps `@noob-naive-ui/admin` decoupled from backend contracts and business operations
- the new app structure and Pinia ownership should exist before backend-specific query ownership is introduced
- otherwise state migration and backend-owned server-state migration will blur together again

### Phase 6 — theming rewrite at app-shell level

Target:

- centralized runtime tokens
- Tailwind CSS 4 theme variable strategy
- limited third-party override surfaces

Tasks:

1. Define semantic tokens at app root.
2. Emit CSS variables from the app shell.
3. Map Tailwind utilities and component styles to those tokens.
4. Isolate Element Plus or third-party bridge overrides in dedicated theme bridge files.
5. Remove scattered SFC-local token duplication over time.

Why after shell extraction:

- theming belongs at the app-shell seam
- the current breakage comes from token consumption being scattered across shell SFCs

### Phase 7 — compatibility and migration support

Target:

- predictable upgrade path for consumers of the current monolith

Tasks:

1. Publish migration map:
   - old root imports → new package imports
   - old namespaces (`Views`, `Common`, `Element`, `Api`, etc.) → new homes
2. Decide whether any compatibility package or temporary re-export layer is worth shipping. [INFERENCE]
3. Document auto-import setup for `@noob-naive-ui/ui` and app setup for `@noob-naive-ui/admin`.

## What not to combine in one step

Avoid these combined refactors:

- Vuex → Pinia **and** axios wrapper redesign in one pass
- admin shell move **and** theme rewrite in one pass
- UI package extraction **and** full Naive UI migration of every legacy component in one pass
- virtualization rewrite **and** table API redesign in one pass

These are distinct seams. Combining them hides failures and makes rollback harder.

## Recommended first implementation slice

If starting immediately, the safest first slice is:

1. Create pnpm workspace skeleton.
2. Stand up `@noob-naive-ui/ui` and `@noob-naive-ui/admin` package boundaries.
3. Prove direct Naive UI co-consumption plus a thin `@noob-naive-ui/ui` value-add layer in one vertical slice.
4. Prove package-local Vite builds plus Naive provider/resolver integration.
5. Extract `list-table-v2` helpers into internal modules without changing behavior.

This creates the structure needed for the harder rewrites without forcing all architecture bets at once.

## Decision summary

- **Two public packages:** yes.
- **Internal shared package:** maybe, only if extraction pressure demands it.
- **UI foundation in iteration one:** Naive UI, directly co-consumed by internal teams, with a dedicated provider/theme bridge and resolver setup in `@noob-naive-ui/ui`.
- **`@noob-naive-ui/ui` surface:** value-add composites, hooks, token/theme helpers, and specialized widgets only — not Naive wrapper parity or Naive re-exports.
- **Virtualization direction:** replace handwritten scroll math first, preserve useful measurement logic.
- **Admin runtime state direction:** `@noob-naive-ui/admin` owns Pinia-based shell state and consumes frontend-ready auth status plus navigation/route-visibility inputs; backend-owned query layers stay in starters/app code.
- **Theme direction:** root-level semantic tokens + Tailwind CSS 4 variable mapping + Naive UI theme-overrides integration.

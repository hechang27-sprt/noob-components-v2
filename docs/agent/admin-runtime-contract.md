# `@noob-naive-ui/admin` runtime contract

Source context:

- `docs/agent/admin-rewrite-brainstorm.md`
- `docs/agent/rewrite-plan.md`
- `../noob-components/packages/manage/*`

Purpose: finish Phase 0 by freezing the frontend-only contract for `@noob-naive-ui/admin`.

This document is intentionally **not** a backend adapter spec. It defines what the shared admin runtime may consume and expose **without learning anything about backend DTOs, backend routes, session payloads, or permission schemas**.

## Problem statement

The old `packages/manage` surface is too backend-coupled:

- routing is exported as a packaged page catalog (`Views.routes`) and injected into app router setup (`../noob-components/examples/config/router.ts:2-26`, `:64-66`)
- the example app imports `Index`, `Views`, and other package surfaces directly into app assembly (`../noob-components/examples/App.vue:18-38`)
- runtime shell code fetches backend-owned user/session data directly and polls it (`../noob-components/packages/manage/router/index.vue:108-155`)

The rewrite direction is stricter:

- `@noob-naive-ui/admin` is a **frontend shell/runtime only**
- starters/apps derive frontend-ready state from backend integrations
- `@noob-naive-ui/admin` consumes that state and renders/administers shell behavior

## Non-goals

`@noob-naive-ui/admin` must **not** define or depend on:

- backend route DTOs
- backend menu DTOs
- backend permission payloads
- backend user/session models
- login request/response DTOs
- transport client details
- TanStack Query ownership for backend business operations
- concrete role/permission/dictionary/config CRUD pages

If any of those appear in the shared runtime, the boundary has already failed.

## Runtime responsibilities

`@noob-naive-ui/admin` should own only frontend shell/runtime concerns:

- page shell layout
- navigation/menu rendering
- theme control UI
- language control UI
- cosmetic/style control entry points
- login page UI
- route-visibility application using frontend-ready inputs
- shell-local Pinia state for layout/theme/language and related runtime concerns

## Starter/app responsibilities

Backend-specific starters or app code must own:

- transport/API clients
- TanStack Query setup for backend-owned server state
- login implementation
- session restoration/fetching
- logout implementation
- mapping backend permission/auth/session data into frontend-ready runtime state
- route registry and domain page modules
- derivation of visible route keys and menu/navigation tree

## Contract design rule

The shared runtime consumes only **frontend-ready state and callbacks**.

Good runtime inputs:

- auth status
- login submit handler
- logout handler
- visible route keys
- menu/navigation tree
- current locale
- available locales
- current theme mode / font size

Bad runtime inputs:

- `LoginResponseDto`
- `SessionDto`
- `PermissionPayload`
- backend route arrays
- token refresh response shapes

## Proposed frontend runtime contracts

These are Phase 0 candidate types. They are intentionally frontend-only.

### 1. Auth status

```ts
export type AdminAuthStatus =
  | { kind: 'loading' }
  | { kind: 'anonymous'; reason?: 'signed-out' | 'expired' | 'forbidden' | 'unknown' }
  | {
      kind: 'authenticated'
      userLabel?: string
      avatarUrl?: string
      subtitle?: string
    }
```

Notes:

- no backend user object
- no token/session fields
- just what the shell/login/header needs to render

### 2. Login form values and auth actions

```ts
export type AdminLoginValues = {
  username: string
  password: string
  remember?: boolean
}

export type AdminAuthActions = {
  login: (values: AdminLoginValues) => Promise<void>
  logout: () => Promise<void> | void
}
```

Notes:

- `login` is a callback, not a transport/client contract
- starters/apps decide what happens inside `login`
- `@noob-naive-ui/admin` only owns form UX and pending/error presentation

### 3. Route visibility input

```ts
export type AdminRouteKey = string

export type AdminRouteVisibility = {
  visibleRouteKeys: ReadonlySet<AdminRouteKey>
}
```

Notes:

- no backend permission payloads
- runtime sees only which frontend route keys are visible
- starter/app maps backend authz to these keys

### 4. Menu/navigation tree

For the navigation tree, prefer Naive UI's own type directly:

```ts
import type { MenuOption } from 'naive-ui'

export type AdminMenuTree = MenuOption[]
```

Notes:

- this avoids inventing a parallel menu-node type that would mostly duplicate Naive UI
- the starter/app still owns deriving `MenuOption[]` from its own route registry and backend-derived visibility state
- runtime invariant: `option.key` is the canonical frontend route/menu visibility key used to match `visibleRouteKeys`
- `@noob-naive-ui/admin` only renders and administers shell navigation; it still must not learn backend route/menu DTOs
- this is an acceptable Naive-specific dependency because the navigation layer is already part of the chosen Naive-based runtime

### 5. Theme / language / shell preferences

```ts
export type AdminThemeMode = 'light' | 'dark' | 'system'
export type AdminFontSize = 'small' | 'medium' | 'large'

export type AdminLocaleOption = {
  key: string
  label: string
}

export type AdminShellPreferences = {
  themeMode: AdminThemeMode
  fontSize: AdminFontSize
  locale: string
  availableLocales: AdminLocaleOption[]
  sidebarCollapsed: boolean
}
```

Notes:

- this is shell state, not backend state
- Phase 0 default: runtime-owned local persistence is acceptable for theme/locale/sidebar preferences because these are frontend-local shell concerns

## Proposed `@noob-naive-ui/admin` export surface

This is still conceptual, but it should stay at this level of abstraction.

Possible exports:

- `AdminShell`
- `AdminLoginPage`
- `AdminNavigation`
- `AdminThemeControls`
- `AdminLanguageControls`
- `createAdminRuntimeStore` or equivalent runtime store helpers
  - `AdminAuthStatus`
  - `AdminLoginValues`
  - `AdminAuthActions`
  - `AdminRouteKey`
  - `AdminRouteVisibility`
  - `AdminMenuTree`
  - `AdminShellPreferences`

Possible non-exports:

- no `Views.routes`
- no packaged CRUD/admin page catalog
- no backend API wrappers
- no backend session or permission types

## Boundary examples

### Good

Starter/app code:

- fetches current user from backend
- interprets backend response
- maps it to `AdminAuthStatus`
- maps backend permission data to `visibleRouteKeys`
- maps app route registry to `AdminMenuNode[]`
- passes all of that to `@noob-naive-ui/admin`

`@noob-naive-ui/admin`:

- renders shell, header, nav, login page, theme/lang controls
- hides/shows routes/menu entries based on frontend-ready inputs

### Bad

`@noob-naive-ui/admin`:

- defines a `SessionDto`
- expects backend permission arrays
- fetches current user itself
- ships role/permission/config pages
- owns query keys for backend business operations

## Phase 0 decisions ratified after this contract

The following defaults are now considered decided for Phase 0:

1. `visibleRouteKeys` is the route-visibility contract for Phase 1; no additional route metadata contract is required yet.
2. The runtime may own local persistence of theme/locale/sidebar preferences.
3. `AdminLoginPage` is packaged by default, but starters/apps may replace it while keeping the same runtime contract.
## Phase 0 completion criterion for `@noob-naive-ui/admin`

Phase 0 is complete only when:

- the runtime contract is frontend-only
- starters/apps clearly own backend integration and state derivation
- no planned `@noob-naive-ui/admin` export depends on backend DTOs or business admin pages
- package-vs-starter ownership is explicit enough that implementation cannot silently recouple during Phase 4

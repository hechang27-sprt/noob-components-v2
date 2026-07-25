# Adapter Root-Route Ownership: API Surface, Contracts & Design Options

## 1. Public API Map

### 1.1 `@noob-naive-ui/admin` (`packages/admin/src/index.ts`)

**Exports** (11 named exports, 3 store hooks, 2 components):

| Export | Kind | File | Notes |
|---|---|---|---|
| `AdminAuthIdentity` | type | `runtime-contract.ts:12-17` | `userLabel?`, `avatarUrl?`, `subtitle?` |
| `AdminAuthStatus` | type | `runtime-contract.ts:5-11` | Discriminated union: `loading`, `anonymous`, `authenticated` |
| `AdminFontSize` | type | `runtime-contract.ts:27` | `"small" | "medium" | "large"` |
| `AdminLocaleOption` | type | `runtime-contract.ts:29-32` | `{ key, label }` |
| `AdminLoginValues` | type | `runtime-contract.ts:19-23` | `{ username, password, remember? }` |
| `AdminMenuTree` | type | `runtime-contract.ts:25` | Naive UI `MenuOption[]` |
| `AdminRouteKey` | type | `runtime-contract.ts:26` | `string` |
| `AdminShellPreferences` | type | `runtime-contract.ts:34-41` | `{ themeMode, fontSize, locale, availableLocales, sidebarCollapsed }` |
| `AdminThemeMode` | type | `runtime-contract.ts:28` | `"light" | "dark" | "system"` |
| `useAdminAuthStore` | fn | `stores/auth.ts` | Setup-style Pinia store `admin-auth` |
| `AdminAuthStoreConfig` | type | `stores/auth.ts:10-21` | `{ login, logout }` |
| `useAdminShellPreferencesStore` | fn | `stores/shell-preferences.ts` | Setup-style Pinia store `admin-shell-preferences` |
| `AdminLoginPage` | component | `components/admin-login-page.tsx` | Self-contained login form consuming `useAdminAuthStore` |
| `AdminLoginPageProps` | type | `components/admin-login-page.tsx` | `Record<string, never>` (empty) |
| `AdminShell` | component | `components/admin-shell.tsx` | Full layout with nav, sidebar, tabs, account menu |
| `AdminShellContext` | type | `components/admin-shell.tsx:87-90` | `{ navigate }` |
| `AdminShellDestination` | type | `components/admin-shell.tsx:103-108` | `{ navKey, payload? }` |
| `AdminShellNavigate` | type | `components/admin-shell.tsx:71-75` | `(destination, resolveTabNavigation?) => Promise<void>` |
| `AdminShellNavigation` | type | `components/admin-shell.tsx:176-182` | `{ active, handleNavigation }` |
| `AdminShellNavigationRequest` | type | `components/admin-shell.tsx:143-173` | Discriminated: `open`, `activate`, `close` |
| `AdminShellNavigationResult` | type | `components/admin-shell.tsx:175` | `{ active }` |
| `AdminShellProps` | type | `components/admin-shell.tsx:189-193` | `{ menuOptions?, navigation? }` |
| `AdminShellTab` | type | `components/admin-shell.tsx:124-134` | Internal: descriptor + `index`, `*Pending` |
| `AdminShellTabCandidate` | type | `components/admin-shell.tsx:137-141` | `{ id, nav }` |
| `AdminShellTabDescriptor` | type | `components/admin-shell.tsx:111-121` | `{ id, nav, label, closable? }` |
| `AdminShellTabNavigationDecision` | type | `components/admin-shell.tsx:60-63` | `{ kind: "open" } | { kind: "activate", tabId }` |
| `AdminShellTabNavigationResolver` | type | `components/admin-shell.tsx:65-68` | `(tabs, destination) => AdminShellTabNavigationDecision` |
| `useAdminShell` | fn | `components/admin-shell.tsx:95-101` | `inject`-based composable, throws outside shell |

**Dependencies** (package.json):
- Peers: `naive-ui`, `pinia`, `pro-naive-ui`, `vue`
- Implementation: `@noob-naive-ui/ui`, `@vicons/ionicons5`, `zod`
- Externalized at build: all peers + all impl deps

**Key constraints:**
- Zero router imports. Package knows nothing about `vue-router`.
- `AdminShell` renders authenticated layout only — no login rendering.
- `AdminLoginPage` independently reads `useAdminAuthStore`.
- `AdminShellProps.navigation` is optional — shell can render without any routing.

### 1.2 `@noob-naive-ui/admin-vue-router` (`packages/admin-vue-router/src/index.ts`)

**Exports** (12 named):

| Export | Kind | File | Notes |
|---|---|---|---|
| `VueRouterNavParams` | type | `index.ts:24-31` | `{ params?, query?, hash?, state? }` |
| `AdminRouteUrlCodec<TSchema>` | type | `index.ts:34-56` | `{ payloadSchema, encode, decode }` |
| `defineAdminRouteUrlCodec` | fn | `index.ts:61-73` | Factory with schema-inferred types |
| `AdminRouteDefinition<TSchema>` | type | `index.ts:76-82` | `{ route: Omit<RouteRecordRaw, "name">, codec? }` |
| `AdminRouteDefinitions` | type | `index.ts:85-87` | `Readonly<Record<string, AdminRouteDefinition>>` |
| `AdminRouteRegistryNavKey<T>` | type | `index.ts:96-98` | Extracted `keyof T & string` |
| `AdminRouteRegistry<T>` | type | `index.ts:101-131` | `{ navKeys, getDefinition, toLocation, fromRoute, toRouteRecords }` |
| `defineAdminRouteRegistry` | fn | `index.ts:139-207` | Binds host definitions; generates named routes |
| `AdminShellVueRouterNavigationOptions<T>` | type | `index.ts:229-246` | `{ router, registry, describeDestination, createPageId, getNavigationScopeId, homeDestination? }` |
| `AdminShellVueRouterNavigation` | type | `index.ts:249-299` | `AdminShellNavigation & { toScopedLocation, installScopeGuard, enterScope }` |
| `createAdminShellVueRouterNavigation` | fn | `index.ts:307-533` | Core factory returning the adapter |

**Dependencies** (package.json):
- Peers: `@noob-naive-ui/admin`, `vue`, `vue-router`, `zod`
- Externalized at build: all peers

**Key constraints:**
- Requires an existing `Router` — does not create one.
- Does not own route records for `/`, `/login`, or any application routes.
- Owns history-state namespace `_noobAdminShell` for scope metadata.
- Owns scope guard via `installScopeGuard()` — but only for routes recognized by the bound registry.
- Owns `enterScope(destination)` — stamps the first protected route after login.

## 2. Current Dependency Graph

```
apps/demo
  ├── @noob-naive-ui/admin           (stores, components, types)
  │     ├── vue (peer)
  │     ├── pinia (peer)
  │     ├── naive-ui (peer)
  │     ├── pro-naive-ui (peer)
  │     ├── @noob-naive-ui/ui (impl)
  │     ├── @vicons/ionicons5 (impl)
  │     └── zod (impl)
  ├── @noob-naive-ui/admin-vue-router (adapter layer)
  │     ├── @noob-naive-ui/admin (peer)
  │     ├── vue (peer)
  │     ├── vue-router (peer)
  │     └── zod (peer)
  └── vue-router (direct)
```

**Flow of ownership:**

```
[app] creates Router, RouteRecordRaw[]
[app] defines login/shell routes, auth guards
[app] creates AdminShellVueRouterNavigation (passes router, registry)
[app] installs guard: installDemoRouterGuards (auth-first, then scope)
[app] provides navigation via InjectionKey

[adapter] converts AdminShellDestination <-> Vue Router locations
[adapter] installs scope guard (only on registry routes)
[adapter] provides toScopedLocation, enterScope, installScopeGuard

[admin-shell] owns tabs, menu, account UI, preferences
[admin-shell] reads useAdminAuthStore for identity/logout
[admin-shell] with navigation: renders tabs, delegates to handleNavigation
[admin-shell] without navigation: layout-only, no tabs
```

## 3. Auth / Store Contracts

### 3.1 Auth Store (`packages/admin/src/stores/auth.ts`)

- **Store ID:** `admin-auth` (Pinia)
- **Configuration:** `configure({ login, logout })` — called once by host
- **Reactive state:** `status: Ref<AdminAuthStatus>`, `loginPending`, `logoutPending`, `loginError`
- **Actions:** `login(values)`, `logout()`
- **Status transitions:** Package-owned. Host callbacks return `AdminAuthIdentity`; package transitions state after success.
- **Non-persistent.** Auth resets on page reload.
- **No `isAuthenticated` computed** — consumers inspect `status.kind`.

### 3.2 Shell Preferences Store (`packages/admin/src/stores/shell-preferences.ts`)

- **Store ID:** `admin-shell-preferences` (Pinia)
- **Configuration:** `initialize(options)` — called once by host
- **Persistent fields:** `themeMode`, `fontSize`, `locale`, `sidebarCollapsed` → localStorage key `@noob-naive-ui/admin:shell-preferences`
- **Runtime-only:** `availableLocales`
- **Normalization:** `packages/admin/src/runtime/shell-preferences.ts` — Zod-based; treats persisted data as `unknown`

### 3.3 Auth Contract Boundaries

```
[host login callback]
  ├── validates credentials
  ├── rotates navigationScopeId (demo: crypto.randomUUID())
  └── returns AdminAuthIdentity { userLabel? }

[package auth store]
  ├── sets loginPending=true before callback
  ├── awaits callback
  ├── transitions status to { kind: "authenticated", ...identity }
  └── sets loginPending=false, clears loginError

[host post-login]
  └── calls navigation.enterScope(destination)
```

## 4. Navigation / History Scope Behavior

### 4.1 History State Namespace

- Owned by adapter: `_noobAdminShell` (constant in `index.ts:210`)
- Schema: `{ scopeId: string, tab: { id, label, closable? } }`
- Enforced: `toScopedLocation` throws if route codec state already uses the key

### 4.2 Scope Guard (`installScopeGuard`)

**Current behavior** (lines 401-442):
1. Bypasses non-registry routes entirely (`return true`)
2. Admits `pendingScopeEntry` (set by `enterScope`) — one-time
3. Reads `scopeId` from history state
4. Current-scope entries → `return true`
5. Stale/missing scope → replaces with scoped home destination
6. Loop prevention: `replacementInFlight` flag cleared on re-entry

**Critical constraint:** The guard only acts on routes recognized by the bound registry. `/login` and other public routes bypass it entirely.

### 4.3 `enterScope`

**Current behavior** (lines 457-463):
1. Creates descriptor for destination via `describeDestination`
2. Sets `pendingScopeEntry` (one-time admission flag)
3. Calls `router.replace(toScopedLocation(descriptor))`

**Caller responsibility:** The host (demo `DemoLoginRoute`) must:
1. Subscribe to auth status
2. Call `enterScope` after `authenticated` transition
3. Provide the resolved post-login destination

### 4.4 Current Demo Flow

```
App startup:
  1. Create Pinia, Router, navigationScopeId Ref
  2. Configure auth store { login, logout }
  3. Initialize preferences store
  4. Create adapter: createAdminShellVueRouterNavigation({ router, registry, ... })
  5. Install guards: installDemoRouterGuards(router, pinia, navigation)
  6. Provide navigation via InjectionKey

Auth guard (host-owned):
  - Anonymous → protected route → redirect /login?redirectUrl=<fullPath>
  - Authenticated → /login → redirect dashboard

Scope guard (adapter-owned):
  - Non-registry route → pass through
  - Current-scope registry route → pass through
  - Stale/missing scope registry route → replace with scoped dashboard

Post-login:
  - Auth store transitions to authenticated
  - DemoLoginRoute.$subscribe detects change
  - Resolves safe redirectUrl → AdminShellDestination
  - Calls navigation.enterScope(destination)
  - Router replaces to scoped location
```

## 5. Extension Points

### 5.1 Current Extension Points

| Point | Location | Host role |
|---|---|---|
| Route registry | `defineAdminRouteRegistry(defs)` | Host defines route records and codecs |
| Tab presentation | `describeDestination(id, dest)` | Host resolves labels/closability |
| Page identity | `createPageId()` | Host generates UUIDs |
| Navigation scope | `getNavigationScopeId()` | Host returns current session ID |
| Home destination | `homeDestination?` | Host designates fallback route |
| Auth callbacks | `auth.configure({ login, logout })` | Host implements login/logout effects |
| Preferences | `preferences.initialize(defaults)` | Host supplies locale options |

### 5.2 Missing Extension Points (Would Be Added With Root-Route Ownership)

If the adapter owned root routes, it would need:
- **Login route definition** — path, component, guards
- **Shell root route definition** — layout, `requiresAuth` meta
- **Router creation** — `createRouter(history, routes)` or route injection
- **Auth guard integration** — currently host-owned in `installDemoRouterGuards`

## 6. What Changes If Adapter Owns Root Routes

### 6.1 Option A: Adapter Provides Route Records (Minimal)

**What changes:**
- New export: `createAdminRootRoutes(options)` → returns `RouteRecordRaw[]` containing `/` shell route and `/login` route
- Host calls: `routes: [...createAdminRootRoutes(options), ...registry.toRouteRecords()]`
- Auth guard ownership _could_ stay with host, or move to adapter

**Files changed:**
- `packages/admin-vue-router/src/index.ts` — new factory
- `apps/demo/src/router.ts` — replace hardcoded routes with adapter-provided ones
- `apps/demo/src/main.ts` — potentially remove `installDemoRouterGuards` auth part

**Risks:**
- **Low** — additive API, backward-compatible
- Route `component` values: adapter would need to import `AdminShell` and `AdminLoginPage` from `@noob-naive-ui/admin` → adds import dependency
- Route path conventions: host and adapter must agree on `/login`, `/` paths
- Auth guard needs `useAdminAuthStore` which needs `pinia` instance → adapter must either:
  - Accept pinia reference (adds pinia peer dep), or
  - Delegate guard logic to host callback

### 6.2 Option B: Adapter Creates Router (Maximal)

**What changes:**
- New export: `createAdminRouter(options)` → returns `Router` with all routes, guards, and scope repair installed
- Host calls only: `const router = createAdminRouter({ routes: registry.toRouteRecords(), ... })`
- `createAdminShellVueRouterNavigation` becomes internal to router creation

**Files changed:**
- `packages/admin-vue-router/src/index.ts` — new `createAdminRouter`
- `apps/demo/src/router.ts` — likely removed or drastically simplified
- `apps/demo/src/main.ts` — replace `createDemoRouter()` + `installDemoRouterGuards()` with single call

**Risks:**
- **Medium** — structural change, removes host control
- Adapter now owns `createRouter` call → must accept `RouterHistory` (or default)
- Auth guard inside adapter needs auth store → pinia becomes required peer dep
- Host loses ability to add non-admin routes between login and shell (e.g., a public landing page)
- Host loses ability to customize guard behavior (e.g., role checks after auth)

### 6.3 Option C: Adapter Provides Guard + Route Registry (Hybrid)

**What changes:**
- New exports:
  - `createAdminAuthGuard(options)` → `beforeEach` guard factory
  - `createAdminShellRoute(options)` → `RouteRecordRaw` for the shell wrapper
  - `createAdminLoginRoute(options)` → `RouteRecordRaw` for login
- Host composes: `routes: [createAdminLoginRoute(), createAdminShellRoute({ children: registry.toRouteRecords() })]`
- Host calls: `createAdminAuthGuard({ router, pinia, navigation })` instead of own guard

**Files changed:**
- `packages/admin-vue-router/src/index.ts` — three new factories
- `apps/demo/src/router.ts` — use adapter helpers for route composition
- `apps/demo/src/main.ts` — use `createAdminAuthGuard` instead of `installDemoRouterGuards`

**Risks:**
- **Low-Medium** — additive, but auth guard changes are behavioral
- Auth guard needs config for: login route name, home route name, redirect query param name
- Pinia peer dep required for `useAdminAuthStore(pinia)` in guard
- Host loses flexibility for auth guard customization (e.g., MFA checks)

### 6.4 Comparison Matrix

| Dimension | Option A (Routes) | Option B (Router) | Option C (Hybrid) |
|---|---|---|---|
| Host retains router creation | Yes | No | Yes |
| Host retains auth guard | Optional | No | No |
| Host can add non-admin routes | Yes | Via callback | Yes |
| Adapter owns login route | Yes | Yes | Yes |
| Adapter owns shell route | Yes | Yes | Yes |
| New adapter exports | +1 factory | +1 factory | +3 factories |
| New adapter peer deps | None | pinia | pinia |
| Backward compatibility | Full | Breaking | Full |
| Demo app changes | `router.ts` lines | `router.ts`, `main.ts` | `router.ts`, `main.ts` |

## 7. Compatibility Risks (All Options)

### 7.1 Route Name Collisions

Current demo uses `LOGIN_ROUTE_NAME = "login"` and `HOME_ROUTE_NAME = "dashboard"`. The adapter would need to either:
- Use configurable names (default `"login"`, `"dashboard"`)
- Use well-known constants that hosts must not conflict with

### 7.2 Auth Store Access From Adapter

Currently, `@noob-naive-ui/admin-vue-router` does not import `@noob-naive-ui/admin`'s auth store. Peer dep `@noob-naive-ui/admin` gives access to `useAdminAuthStore`, but:
- Pinia must be active before the store is used
- Guard functions run outside component setup → must use `pinia` instance arg: `useAdminAuthStore(pinia)`
- This requires pinia as a peer dep (currently not listed)

### 7.3 Two Guards on the Same Router

Current demo installs two `beforeEach` guards: auth guard, then scope guard. If adapter owns both, the combined guard must correctly order: auth → (enterScope creates pendingScopeEntry) → scope guard admits it → proceed.

### 7.4 Login Route Handling

The login route is public — no shell, no tabs. The adapter's scope guard must recognize it and bypass. Currently the scope guard only checks registry membership (`fromRoute` returns null for non-registry routes). Login is not in the registry, so it already bypasses.

If adapter creates the login route, the scope guard must still bypass it. This is achievable by keeping login outside the registry.

### 7.5 Demo Apps as Contract Validation

The `apps/demo` directory serves as the primary integration test. Any change must:
- Keep `pnpm --filter demo typecheck` passing
- Keep `pnpm --filter demo build` passing
- Preserve the browser behavior contract from `runtime-integration-contract.md`
- Not break `@noob-naive-ui/admin` or `@noob-naive-ui/admin-vue-router` unit tests

## 8. Exact File/Symbol Evidence

### 8.1 What Demo Currently Owns (Must Not Regress)

| File | Symbol | Responsibility |
|---|---|---|
| `apps/demo/src/router.ts:10-11` | `LOGIN_ROUTE_NAME`, `HOME_ROUTE_NAME` | Route name constants |
| `apps/demo/src/router.ts:14-25` | `demoRoutes` | Route tree composition |
| `apps/demo/src/router.ts:28-30` | `createDemoRouter()` | Router creation |
| `apps/demo/src/router.ts:39-62` | `installDemoRouterGuards()` | Auth + scope guard installation |
| `apps/demo/src/main.ts:24` | `navigationScopeId` | Scope ID rotation |
| `apps/demo/src/main.ts:30-43` | `login(values)` callback | Credential validation + scope rotation |
| `apps/demo/src/main.ts:46` | `logout()` callback | Logout effect |
| `apps/demo/src/main.ts:49-57` | `createAdminShellVueRouterNavigation(...)` | Adapter creation |
| `apps/demo/src/main.ts:59` | `installDemoRouterGuards(...)` | Guard installation |
| `apps/demo/src/components/demo-login-route.tsx:30-37` | `resolvePostLoginDestination()` | Redirect URL validation |
| `apps/demo/src/components/demo-login-route.tsx:40-43` | `redirectAfterLogin()` | Post-login navigation |
| `apps/demo/src/components/demo-shell-route.tsx:23-26` | Auth subscribe → logout redirect | Session termination routing |

### 8.2 What Adapter Currently Owns (Must Not Regress)

| File | Symbol | Responsibility |
|---|---|---|
| `packages/admin-vue-router/src/index.ts:210` | `DEFAULT_ADMIN_SHELL_HISTORY_STATE_KEY` | History namespace constant |
| `packages/admin-vue-router/src/index.ts:213-216` | `persistedAdminShellTabSchema` | Tab metadata schema |
| `packages/admin-vue-router/src/index.ts:219-222` | `persistedAdminShellStateSchema` | Scope metadata schema |
| `packages/admin-vue-router/src/index.ts:307-533` | `createAdminShellVueRouterNavigation()` | Core adapter factory |
| `packages/admin-vue-router/src/index.ts:335-342` | `readScopeId()` | Scope ID extraction |
| `packages/admin-vue-router/src/index.ts:349-397` | `toScopedLocation()`, `currentDescriptor()`, `descriptorForRequest()` | Location/metadata composition |
| `packages/admin-vue-router/src/index.ts:401-442` | `installScopeGuard()` | History-scope repair |
| `packages/admin-vue-router/src/index.ts:457-463` | `enterScope()` | Explicit post-login entry |

### 8.3 What Package `admin` Must Never Know About

Per `runtime-contract.md` spec:
- Router API imports
- Route records
- Path patterns (`/login`, `/:id`)
- Redirect logic
- Auth guard installation
- History state parsing
- Scope IDs

## 9. Recommendations

### 9.1 Preferred: Option C (Hybrid — Guard + Route Factories)

**Rationale:**
- Host retains router creation and can insert non-admin routes
- Adapter provides standard login/shell route factories → reduces duplication
- Adapter provides standard auth guard → reduces duplication, ensures correct ordering
- Backward-compatible: existing demo can adopt incrementally
- Keeps `@noob-naive-ui/admin` pure (no router knowledge)

**Required new exports:**
1. `createAdminLoginRoute(options): RouteRecordRaw` — path, component (`AdminLoginPage`), optional props
2. `createAdminShellRoute(options): RouteRecordRaw` — path (`/`), component wrapper, `meta.requiresAuth`
3. `createAdminAuthGuard(options): (router: Router) => () => void` — auth+scope guard composition

**Required new deps for `admin-vue-router`:**
- `pinia` as peer dep (for `useAdminAuthStore(pinia)` in guard)
- Import `AdminLoginPage` component type from `@noob-naive-ui/admin` (peer dep)

### 9.2 Fallback: Option A (Route Factories Only)

If pinia peer dep is undesirable, only provide route factories. Host keeps auth guard ownership but gets standardized route records. This still reduces demo boilerplate.

### 9.3 Don't: Option B (Router Creation)

Too opinionated. Hosts that need middleware, scroll behavior, custom history modes, or non-admin route segments are locked out.

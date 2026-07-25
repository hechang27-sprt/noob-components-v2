# Exact File/Symbol Evidence

All paths relative to repo root `/home/hechang27/Documents/sprt/noob-components-v2`.

## Host Code to Remove (or Refactor)

### 1. `apps/demo/src/router.ts` — ENTIRE FILE (delete)
- **Lines 1-84**: `createDemoRouter()`, `demoRoutes`, `LOGIN_ROUTE_NAME`, `HOME_ROUTE_NAME`, `installDemoRouterGuards()`
- **Dependencies on this file**:
  - `apps/demo/src/main.ts:4` imports `createDemoRouter, installDemoRouterGuards`
  - `apps/demo/src/main.ts:32` calls `createDemoRouter()`
  - `apps/demo/src/main.ts:72` calls `installDemoRouterGuards(router, pinia, navigation)`
  - No other files import from `./router`

### 2. `apps/demo/src/main.ts` — partial refactor
- **Line 4**: import from `./router` — remove
- **Line 32**: `const router = createDemoRouter();` → replace with `createAdminRouter({...})`
- **Lines 63-70**: `createAdminShellVueRouterNavigation({...})` — keep, already adapter API
- **Line 72**: `installDemoRouterGuards(router, pinia, navigation);` → replace with `installAdminGuards(router, { pinia, navigation });`

### 3. `apps/demo/src/components/demo-login-route.tsx` — partial refactor
- **Lines 23-41**: `resolvePostLoginDestination()` — replace with adapter `resolvePostLoginDestination()`
- **Lines 48-52**: `redirectAfterLogin()` — simplified to use adapter helper
- **Lines 55-57**: `auth.$subscribe` / redirect call — unchanged
- **Line 58**: `<AdminLoginPage />` — unchanged

### 4. `apps/demo/src/components/demo-shell-route.tsx` — NO CHANGES
- Uses only: `AdminShell`, `useAdminAuthStore`, `RouterView`, `useRouter`, `navigation`, `menuOptions`
- All are existing package/adapter/host APIs

## Adapter Code to Add

### `packages/admin-vue-router/src/index.ts` — add at end

#### New imports needed:
```ts
import { useAdminAuthStore } from "@noob-naive-ui/admin";
import type { Pinia } from "pinia";
import type { Component, RouterHistory } from "vue-router";
import { createRouter, createWebHistory } from "vue-router";
```

Note: `vue-router` is already imported (types `HistoryState`, `RouteLocationNamedRaw`, `RouteLocationNormalizedLoaded`, `RouteRecordRaw`, `Router`). Need to add `createRouter`, `createWebHistory`, `Component`, `RouterHistory`.

#### New type: `AdminRouterFactoryOptions`
#### New function: `createAdminRouter(options): Router`
#### New type: `AdminGuardOptions`
#### New function: `installAdminGuards(router, options): () => void`
#### New type: `PostLoginOptions`
#### New function: `resolvePostLoginDestination(router, registry, redirectUrl, options): AdminShellDestination`

#### Updated barrel exports:
- `packages/admin-vue-router/src/index.ts` is the sole source file
- No separate barrel — all exports already from `index.ts`

### `packages/admin-vue-router/package.json` — verify dependencies
- Current deps: `@noob-naive-ui/admin` (workspace), `vue-router` (peer), `vue` (peer), `zod` (dep)
- `pinia` is NOT currently a dependency — `installAdminGuards` needs it
- **Action**: Add `pinia` as peer dependency (already a peer of `@noob-naive-ui/admin`)

## Tests to Add

### `packages/admin-vue-router/tests/navigation.test.ts` — add describe block

New test suite: `describe("router factory and guards", () => {...})`

Tests (matching acceptance scenarios):
1. `createAdminRouter` produces correct route tree structure
2. `createAdminRouter` respects `loginPath`/`loginRouteName`/`shellPath`/`homeRouteName` overrides
3. `createAdminRouter` accepts custom `history`
4. `installAdminGuards` blocks anonymous → protected
5. `installAdminGuards` permits authenticated → protected
6. `installAdminGuards` redirects authenticated → login to home
7. `installAdminGuards` returns cleanup that unregisters both guards
8. Auth guard runs before scope guard (anonymous → protected never hits scope guard)
9. `resolvePostLoginDestination` resolves valid redirect
10. `resolvePostLoginDestination` falls back for login/external/malformed/non-string
11. `resolvePostLoginDestination` falls back for routes outside registry
12. `resolvePostLoginDestination` falls back for public (non-requiresAuth) routes

## Specs to Update

### `.trellis/spec/demo/frontend/runtime-integration-contract.md`
- **Line 28**: `navigation.installScopeGuard()` → update to show `installAdminGuards(router, ...)`
- **Lines 31-39**: Update host-owned responsibilities to reflect moved items
- **Lines 78-79**: Code example — update to new API

### `.trellis/spec/admin/frontend/runtime-contract.md`
- **Line 29-30**: Update to reflect adapter-ownership boundary

## Files NOT Touched

| File | Reason |
|------|--------|
| `packages/admin/src/**` | Admin core — router-free contract preserved |
| `packages/admin-vue-router/src/index.ts` (existing code) | Adapter internals unchanged, only additions |
| `apps/demo/src/App.tsx` | Host-owned providers — unchanged |
| `apps/demo/src/route-registry.tsx` | Host-owned registry — unchanged |
| `apps/demo/src/admin-navigation.ts` | Host-owned tab presentation — unchanged |
| `apps/demo/src/navigation-context.ts` | Host-owned DI — unchanged |
| `apps/demo/src/style.css` | Unchanged |
| `apps/demo/vite.config.ts` | Unchanged |
| `apps/demo/package.json` | Unchanged (no new deps) |

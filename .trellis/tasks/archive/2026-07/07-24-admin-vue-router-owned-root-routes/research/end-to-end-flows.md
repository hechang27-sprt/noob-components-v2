# End-to-End Flow Trace

## Flow 1: Anonymous → Login → Protected

### Step 1: User navigates to `/reports` while anonymous

1. `createDemoRouter()` in `apps/demo/src/router.ts:47-49` creates the router with two top-level routes:
   - `/login` → `DemoLoginRoute`
   - `/` → `DemoShellRoute` (meta: `requiresAuth: true`), children from `demoRouteRegistry.toRouteRecords()`
2. Router resolves `/reports` → matches `DemoShellRoute` child `reports` (relative path `"reports"`)
3. `installDemoRouterGuards()` (router.ts:62-82) auth guard fires:
   - `to.matched.some(record => record.meta.requiresAuth === true)` → `true`
   - `auth.status.kind !== "authenticated"` → `true`
   - Returns `{ name: "login", query: { redirectUrl: "/reports" } }`
4. Router navigates to `/login?redirectUrl=%2Freports`
5. `DemoLoginRoute` (`demo-login-route.tsx`) renders `<AdminLoginPage />`

### Step 2: User submits login form

1. `AdminLoginPage` (`admin-login-page.tsx`) calls `store.login(values)` from its `submit()` function
2. `useAdminAuthStore.login()` (`stores/auth.ts`) invokes `config.login(values)` — the host callback configured in `main.ts:43-48`
3. Host callback validates credentials, rotates `navigationScopeId`, returns `{ userLabel: username }`
4. Store converts to `{ kind: "authenticated", userLabel: username }`

### Step 3: Auth store subscriber triggers redirect

1. `DemoLoginRoute` has `auth.$subscribe((_mutation, state) => { redirectAfterLogin(state.status.kind) })`
2. `redirectAfterLogin()` (`demo-login-route.tsx:48-52`):
   - Checks `kind === "authenticated"` and `!redirectPending`
   - Calls `navigation.enterScope(resolvePostLoginDestination())`
3. `resolvePostLoginDestination()` (`demo-login-route.tsx:23-41`):
   - Reads `route.query.redirectUrl` → `"/reports"`
   - Validates: starts with `/`, not `//`
   - `router.resolve("/reports")` → resolves to `reports` route
   - Verifies not login and at least one matched route has `requiresAuth: true`
   - `demoRouteRegistry.fromRoute(resolved)` → `{ navKey: "reports" }`
4. `navigation.enterScope({ navKey: "reports" })`:
   - Creates descriptor via `describeDestination(createPageId(), destination)`
   - Sets `pendingScopeEntry` flag (scope guard bypass)
   - Calls `router.replace(toScopedLocation(descriptor))` with stamped `_noobAdminShell` state
5. User sees `AdminShell` with Reports tab active

## Flow 2: Authenticated user → `/login`

1. User navigates to `/login` while authenticated
2. Auth guard (`router.ts:78-80`): `to.name === "login" && auth.status.kind === "authenticated"` → `{ name: "dashboard" }`
3. Router navigates to `/` → Dashboard page

## Flow 3: Logout from AdminShell

1. User clicks "Sign out" in account dropdown
2. `AdminShell` (`admin-shell.tsx`) calls `auth.logout()`
3. `useAdminAuthStore.logout()` invokes `config.logout()` then transitions to `{ kind: "anonymous", reason: "signed-out" }`
4. `DemoShellRoute` (`demo-shell-route.tsx:21-24`) has `auth.$subscribe` → `state.status.kind === "anonymous"` → `router.replace({ name: "login" })`
5. Router navigates to `/login` showing `AdminLoginPage` without `AdminShell`

## Flow 4: History scope repair (stale Back navigation)

1. User is on `dashboard` (current scope), navigates to `reports`
2. Session expires, login creates new scope ID
3. User presses browser Back → lands on old `reports` entry with old scope
4. `installScopeGuard()` (adapter `index.ts`) fires on `router.beforeEach`:
   - `registry.fromRoute(to, state)` → recognizes `reports`
   - `readScopeId(state)` → old scope ≠ current
   - Creates/caches home descriptor: `describeDestination(createPageId(), { navKey: "dashboard" })`
   - Sets `replacementInFlight = true` (loop prevention)
   - Returns `{ name: "dashboard", replace: true, state: { _noobAdminShell: { scopeId, tab } } }`
5. User lands on repaired Dashboard

## Flow 5: Authenticated deep link with valid redirect

1. Anonymous user navigates to `/detail/quarterly-2024`
2. Auth guard: `requiresAuth` match → redirect to `/login?redirectUrl=%2Fdetail%2Fquarterly-2024`
3. After login, `resolvePostLoginDestination()`:
   - `router.resolve("/detail/quarterly-2024")` → `detail` route
   - `demoRouteRegistry.fromRoute(resolved)` → `{ navKey: "detail", payload: { reportId: "quarterly-2024" } }`
4. `enterScope({ navKey: "detail", payload: { reportId: "quarterly-2024" } })`
5. User lands on detail page

## Flow 6: Malformed redirect fallback

1. Anonymous user navigates to `/dashboard` with `?redirectUrl=//evil.com`
2. After login, `resolvePostLoginDestination()`:
   - `redirectUrl.startsWith("//")` → true → falls back to `{ navKey: "dashboard" }`

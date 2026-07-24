# Clean Cutover Recommendation

## Summary

The adapter (`@noob-naive-ui/admin-vue-router`) should own router creation, top-level route records (`/login`, `/` shell parent), auth guard, and combined guard installation. The host provides route components, registry, auth callbacks, menu, and tab presentation — all configuration that is already host-owned today.

## Recommended API (New Adapter Exports)

```ts
// packages/admin-vue-router/src/index.ts — new exports

/** Options for the adapter-owned router factory. */
export type AdminRouterFactoryOptions = {
  /** Host-owned route registry (domain routes as shell children). */
  registry: AdminRouteRegistry<any>;

  /** Host-owned login route component (wraps AdminLoginPage + redirect logic). */
  loginComponent: Component;

  /** Host-owned shell layout component (wraps AdminShell + inner RouterView). */
  shellComponent: Component;

  /** Adapter-owned: login route path. Default: "/login". */
  loginPath?: string;

  /** Adapter-owned: login route name. Default: "login". */
  loginRouteName?: string;

  /** Adapter-owned: shell layout path. Default: "/". */
  shellPath?: string;

  /** Adapter-owned: designated home route name. Default: "dashboard". */
  homeRouteName?: string;

  /** Optional history override. Default: createWebHistory(). */
  history?: RouterHistory;
};

/**
 * Creates a Vue Router with adapter-owned public login + protected shell routes.
 *
 * Route tree:
 *   - "/login" → loginComponent (public)
 *   - "/" → shellComponent (meta: requiresAuth, children: registry routes)
 *
 * The host still owns the Router instance lifecycle (pinia plugin, app.use).
 */
export function createAdminRouter(options: AdminRouterFactoryOptions): Router;

/** Options for the combined guard installer. */
export type AdminGuardOptions = {
  /** Application Pinia instance. */
  pinia: Pinia;

  /** Adapter-owned: home route name for authenticated→login redirect. Default: "dashboard". */
  homeRouteName?: string;

  /** Adapter-owned: login route name for anonymous→protected redirect. Default: "login". */
  loginRouteName?: string;

  /** Adapter-owned: navigation adapter with scope guard capability. */
  navigation: AdminShellVueRouterNavigation;
};

/**
 * Installs auth guard + scope guard in the correct order.
 *
 * Auth guard (runs first):
 *   1. Anonymous + requiresAuth → redirect /login?redirectUrl=to.fullPath
 *   2. Authenticated + /login → redirect home
 *
 * Scope guard (runs second):
 *   Adapts stale/missing history scope for recognized registry routes.
 *
 * @returns Cleanup function that unregisters both guards.
 */
export function installAdminGuards(
  router: Router,
  options: AdminGuardOptions,
): () => void;

/** Options for post-login redirect resolution. */
export type PostLoginOptions = {
  /** Adapter-owned: login route name. Default: "login". */
  loginRouteName?: string;

  /** Adapter-owned: home destination fallback. */
  homeDestination: AdminShellDestination;
};

/**
 * Resolves a safe post-login destination from an untrusted redirect URL.
 *
 * Validation:
 *   1. Must be a non-empty string starting with "/" (not "//")
 *   2. Router-resolved route must not be the login route
 *   3. At least one matched route must have meta.requiresAuth
 *   4. Registry must recognize the resolved route
 *
 * Falls back to homeDestination on any failure.
 *
 * @returns A safe AdminShellDestination for enterScope().
 */
export function resolvePostLoginDestination(
  router: Router,
  registry: AdminRouteRegistry<any>,
  redirectUrl: unknown,
  options: PostLoginOptions,
): AdminShellDestination;
```

## What the Demo Host Becomes

### `apps/demo/src/main.ts` (proposed)

```ts
import { useAdminAuthStore, useAdminShellPreferencesStore, type AdminLoginValues } from "@noob-naive-ui/admin";
import { createAdminRouter, installAdminGuards, createAdminShellVueRouterNavigation } from "@noob-naive-ui/admin-vue-router";
import { createPinia } from "pinia";
import { createApp, ref } from "vue";
import "@noob-naive-ui/admin/style.css";
import App from "./App";
import { DemoLoginRoute } from "./components/demo-login-route";
import { DemoShellRoute } from "./components/demo-shell-route";
import { describeDemoDestination } from "./admin-navigation";
import { demoNavigationKey } from "./navigation-context";
import { demoRouteRegistry } from "./route-registry";
import "./style.css";

const pinia = createPinia();
const navigationScopeId = ref(crypto.randomUUID());

// Adapter-owned router factory
const router = createAdminRouter({
  registry: demoRouteRegistry,
  loginComponent: DemoLoginRoute,
  shellComponent: DemoShellRoute,
});

const auth = useAdminAuthStore(pinia);
const preferences = useAdminShellPreferencesStore(pinia);

async function login(values: AdminLoginValues) { /* unchanged */ }
async function logout(): Promise<void> {}

auth.configure({ login, logout });
preferences.initialize({
  defaults: {
    availableLocales: [
      { key: "en", label: "English" },
      { key: "zh-CN", label: "简体中文" },
    ],
  },
});

const navigation = createAdminShellVueRouterNavigation({
  router,
  registry: demoRouteRegistry,
  describeDestination: describeDemoDestination,
  createPageId: () => crypto.randomUUID(),
  getNavigationScopeId: () => navigationScopeId.value,
  homeDestination: { navKey: "dashboard" },
});

// Adapter-owned guard installation
installAdminGuards(router, { pinia, navigation });

createApp(App)
  .use(pinia)
  .use(router)
  .provide(demoNavigationKey, navigation)
  .mount("#app");
```

### `apps/demo/src/router.ts` — DELETED
The entire file is replaced by `createAdminRouter()` + `installAdminGuards()`.

### `apps/demo/src/components/demo-login-route.tsx` (proposed, simplified)

```ts
import { AdminLoginPage, useAdminAuthStore } from "@noob-naive-ui/admin";
import { resolvePostLoginDestination } from "@noob-naive-ui/admin-vue-router";
import { defineComponent } from "vue";
import { useRoute, useRouter } from "vue-router";
import { requireDemoNavigation } from "../navigation-context";
import { demoRouteRegistry } from "../route-registry";

export const DemoLoginRoute = defineComponent(() => {
  const auth = useAdminAuthStore();
  const route = useRoute();
  const router = useRouter();
  const navigation = requireDemoNavigation();
  let redirectPending = false;

  async function redirectAfterLogin(kind: typeof auth.status.kind): Promise<void> {
    if (kind !== "authenticated" || redirectPending) return;
    redirectPending = true;
    const destination = resolvePostLoginDestination(
      router,
      demoRouteRegistry,
      route.query.redirectUrl,
      { homeDestination: { navKey: "dashboard" } },
    );
    await navigation.enterScope(destination);
  }

  auth.$subscribe((_mutation, state) => { void redirectAfterLogin(state.status.kind); });
  void redirectAfterLogin(auth.status.kind);
  return () => <AdminLoginPage />;
}, { name: "DemoLoginRoute" });
```

### `apps/demo/src/components/demo-shell-route.tsx` (unchanged)
Only uses `AdminShell`, `useAdminAuthStore`, `RouterView`, `useRouter`, `navigation`. These are all already package/adapter/host APIs. No change needed.

## Acceptance Scenarios

### Scenario 1: Router Factory Produces Correct Tree
- **Given** a registry with `dashboard`, `reports`, `settings`, `detail`
- **When** `createAdminRouter()` is called with `loginComponent` and `shellComponent`
- **Then** the router has routes:
  - `/login` → loginComponent (no meta)
  - `/` → shellComponent (meta: `{ requiresAuth: true }`) with children `""` (dashboard), `"reports"`, `"settings"`, `"detail/:reportId"`

### Scenario 2: Auth Guard Blocks Anonymous
- **Given** auth status is `{ kind: "anonymous" }`
- **When** navigating to `/reports` (protected child)
- **Then** guard redirects to `/login?redirectUrl=%2Freports`

### Scenario 3: Auth Guard Permits Authenticated
- **Given** auth status is `{ kind: "authenticated" }`
- **When** navigating to `/reports`
- **Then** guard returns `true` — navigation proceeds

### Scenario 4: Auth Guard Redirects Authenticated from Login
- **Given** auth status is `{ kind: "authenticated" }`
- **When** navigating to `/login`
- **Then** guard redirects to `/` (dashboard)

### Scenario 5: Scope Guard + Auth Guard Ordering
- **Given** both guards installed via `installAdminGuards()`
- **When** an anonymous user navigates to a protected route
- **Then** auth guard fires first and redirects to `/login`; scope guard never sees the protected route

### Scenario 6: Guard Cleanup
- **Given** guards installed via `installAdminGuards()`
- **When** the returned cleanup function is called
- **Then** both guards are unregistered; subsequent navigation is ungated

### Scenario 7: Redirect Resolution — Valid
- **Given** redirect URL `"/reports"` and registry with `reports` route
- **When** `resolvePostLoginDestination(router, registry, "/reports", options)` is called
- **Then** returns `{ navKey: "reports" }`

### Scenario 8: Redirect Resolution — Login Target
- **Given** redirect URL `"/login"`
- **When** `resolvePostLoginDestination()` is called
- **Then** returns home destination (fallback)

### Scenario 9: Redirect Resolution — External
- **Given** redirect URL `"//evil.com"`
- **When** `resolvePostLoginDestination()` is called
- **Then** returns home destination (fallback)

### Scenario 10: Redirect Resolution — Malformed
- **Given** redirect URL `123` (not a string)
- **When** `resolvePostLoginDestination()` is called
- **Then** returns home destination (fallback)

### Scenario 11: Overridable Route Names
- **Given** `createAdminRouter({ loginRouteName: "signin", homeRouteName: "home" })`
- **When** anonymous navigates to protected route
- **Then** guard redirects to `{ name: "signin" }` with redirect query

### Scenario 12: Custom History
- **Given** `createAdminRouter({ history: createMemoryHistory() })`
- **When** router is used in tests
- **Then** navigation works with memory history

### Scenario 13: Demo Builds and Typechecks
- **Given** the cutover is applied to `apps/demo`
- **When** `pnpm --filter demo typecheck && pnpm --filter demo build`
- **Then** both pass without errors

### Scenario 14: Existing Adapter Tests Pass
- **Given** new exports added to adapter
- **When** `pnpm --filter @noob-naive-ui/admin-vue-router test`
- **Then** all existing tests pass + new tests for router factory, guard, redirect resolution

### Scenario 15: Browser Smoke — Full Flow
- Anonymous deep link → login page without shell → login → protected page with shell
- Authenticated → /login → redirects home
- Logout → /login without shell
- Stale Back → scope repair to dashboard
- Valid redirect URL → restores correct destination
- Malformed redirect → falls back to dashboard
- No console errors/warnings
- No API requests

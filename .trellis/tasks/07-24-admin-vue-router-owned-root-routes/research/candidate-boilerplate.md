# Candidate Boilerplate to Move into Adapter

## 1. Router Factory

**Current host code** (`router.ts:47-49`):
```ts
export function createDemoRouter(): Router {
  return createRouter({ history: createWebHistory(), routes: demoRoutes });
}
```

**Candidate adapter API**:
```ts
// Options the adapter would accept
type AdminRouterOptions = {
  registry: AdminRouteRegistry<any>;
  loginComponent: Component;
  shellComponent: Component;
  homeRouteName?: string;       // default: "dashboard"
  loginRouteName?: string;      // default: "login"
  loginPath?: string;           // default: "/login"
  shellPath?: string;           // default: "/"
  history?: RouterHistory;      // default: createWebHistory()
};

// Factory
function createAdminRouter(options: AdminRouterOptions): Router;
```

**What moves:**
- `createRouter(createWebHistory())` call
- Top-level route tree composition (login + shell parent + registry children)
- Route name constants (`login`, `dashboard`, `home`)
- `meta: { requiresAuth: true }` on shell route

**What stays host-owned:**
- `loginComponent` (wraps `AdminLoginPage` + redirect resolution) — host provides
- `shellComponent` (wraps `AdminShell` + menu + logout redirect) — host provides
- `registry` — host defines
- Optional `history` override — host may supply

**Risk:** Low. Purely mechanical composition of pre-existing primitives.

## 2. Auth Guard

**Current host code** (`router.ts:61-83`):
```ts
const removeAuthGuard = router.beforeEach((to) => {
  const protectedTarget = to.matched.some(r => r.meta.requiresAuth === true);
  if (protectedTarget && auth.status.kind !== "authenticated") {
    return { name: LOGIN_ROUTE_NAME, query: { redirectUrl: to.fullPath } };
  }
  if (to.name === LOGIN_ROUTE_NAME && auth.status.kind === "authenticated") {
    return { name: HOME_ROUTE_NAME };
  }
  return true;
});
```

**Candidate adapter API**:
```ts
// Combined guard installer
function installAdminGuards(
  router: Router,
  options: {
    pinia: Pinia;
    homeRouteName?: string;    // default: "dashboard"
    loginRouteName?: string;   // default: "login"
    homeDestination?: AdminShellDestination;  // for scope guard
  }
): () => void;
```

**What moves:**
- `router.beforeEach` auth-gating logic
- Guards ordering (auth guard before scope guard)
- Return function that removes both guards

**What stays host-owned:**
- Nothing; `useAdminAuthStore(pinia)` can be called inside the adapter since it imports `@noob-naive-ui/admin`

**Risk:** Low. Auth guard logic is purely generic: check meta → redirect, check authenticated-on-login → redirect home. No app-specific policy.

## 3. Login Route Redirect Restoration

**Current host code** (`demo-login-route.tsx:23-41`):
```ts
function resolvePostLoginDestination(): AdminShellDestination {
  const redirectUrl = route.query.redirectUrl;
  if (typeof redirectUrl !== "string" || !redirectUrl.startsWith("/") || redirectUrl.startsWith("//"))
    return { navKey: "dashboard" };
  const resolved = router.resolve(redirectUrl);
  if (resolved.name === "login" || !resolved.matched.some(r => r.meta.requiresAuth === true))
    return { navKey: "dashboard" };
  return demoRouteRegistry.fromRoute(resolved, {}) ?? { navKey: "dashboard" };
}
```

**Candidate adapter API:**
The adapter already has `enterScope(destination)`. The redirect resolution logic could be exposed as a method on the adapter:

```ts
// On AdminShellVueRouterNavigation
resolvePostLoginRedirect(redirectUrl: unknown): AdminShellDestination
```

**What moves:**
- URL validation (string, starts with `/`, not `//`)
- Router resolution + login/requiresAuth checks
- Fallback to `homeDestination`

**What stays host-owned:**
- The login route component wrapping `AdminLoginPage` (host decides UI around it)
- The auth-status subscription + calling `enterScope()`

**Risk:** Medium-low. The validation logic depends on:
- `homeDestination` (already adapter-owned)
- `loginRouteName` (would be adapter-owned)
- `registry.fromRoute()` (already adapter-owned)
- `requiresAuth` meta (adapter already stamps this on shell children)

## 4. Shell Route Logout Redirect

**Current host code** (`demo-shell-route.tsx:21-24`):
```ts
auth.$subscribe((_mutation, state) => {
  if (state.status.kind === "anonymous") {
    void router.replace({ name: "login" });
  }
});
```

**What moves:** This is trivial — adapter could provide a composable `useAdminLogoutEffect(router, loginRouteName?)` that subscribes and navigates. Or it could be folded into the shell route component via a hook.

**What stays host-owned:** The shell component wrapper (menu, layout composition).

**Risk:** Low. Purely mechanical.

## 5. Guard Installation Orchestration

**Current host code** (`main.ts:72`):
```ts
installDemoRouterGuards(router, pinia, navigation);
```

**Candidate:** Single adapter call `installAdminGuards(router, { pinia, homeDestination })` that installs both auth guard and scope guard in correct order.

**Risk:** Low. Just consolidates two existing guards.

## 6. Navigation Adapter Creation

**Current host code** (`main.ts:63-70`):
```ts
const navigation = createAdminShellVueRouterNavigation({
  router,
  registry: demoRouteRegistry,
  describeDestination: describeDemoDestination,
  createPageId: () => crypto.randomUUID(),
  getNavigationScopeId: () => navigationScopeId.value,
  homeDestination: { navKey: "dashboard" },
});
```

**What could move:** Only `homeDestination`, `loginRouteName`, `loginPath` could have defaults. The rest are irreducibly host-owned (registry, describeDestination, createPageId, getNavigationScopeId, router).

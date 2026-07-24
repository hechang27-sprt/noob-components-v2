# Auth Guard Integration: Current State & Design Options

## 1. Current Guard Architecture

### 1.1 Two Guards, Ordered

```
beforeEach #1: Auth Guard (host-owned, demo: installDemoRouterGuards)
  - Checks meta.requiresAuth
  - Checks auth.status.kind
  - Redirects: anonymous → /login?redirectUrl=..., authenticated → home

beforeEach #2: Scope Guard (adapter-owned, createAdminShellVueRouterNavigation)
  - Checks pendingScopeEntry (one-time post-enterScope admission)
  - Checks if route is in registry (registry.fromRoute)
  - Non-registry → bypass
  - Current scope → pass
  - Stale scope → replace with home
```

### 1.2 Why Order Matters

1. **Auth must run first:** If scope guard sees a stale scope on a protected route, it replaces with dashboard. But if the user is anonymous, the auth guard redirects to login. If scope guard ran first, it would stamp a scoped dashboard entry that the auth guard then redirects away from — creating history pollution.

2. **Scope guard must see post-login entry:** After `enterScope`, `pendingScopeEntry` is set. The scope guard must run after auth to admit this stamped entry.

3. **Current ordering in demo** (router.ts:59):
```ts
installDemoRouterGuards(router, pinia, navigation);
// Inside: router.beforeEach(authGuard) then navigation.installScopeGuard()
// Vue Router executes beforeEach guards in registration order
```

### 1.3 Auth Guard Implementation (Demo)

```ts
// apps/demo/src/router.ts:39-62
const removeAuthGuard = router.beforeEach((to) => {
  const protectedTarget = to.matched.some(
    (record) => record.meta.requiresAuth === true,
  );
  if (protectedTarget && auth.status.kind !== "authenticated") {
    return { name: LOGIN_ROUTE_NAME, query: { redirectUrl: to.fullPath } };
  }
  if (to.name === LOGIN_ROUTE_NAME && auth.status.kind === "authenticated") {
    return { name: HOME_ROUTE_NAME };
  }
  return true;
});
```

### 1.4 Post-Login Flow

```ts
// apps/demo/src/components/demo-login-route.tsx:30-49
auth.$subscribe((_mutation, state) => {
  void redirectAfterLogin(state.status.kind);
});

async function redirectAfterLogin(kind) {
  if (kind !== "authenticated" || redirectPending) return;
  redirectPending = true;
  await navigation.enterScope(resolvePostLoginDestination());
}
```

**Key detail:** `enterScope` uses `router.replace`, so there is NO `beforeEach` triggered for this navigation that the scope guard must admit — it replaces the current entry directly. But `installScopeGuard` is registered as `beforeEach` — `router.replace` still triggers it.

## 2. What an Adapter-Owned Auth Guard Needs

### 2.1 Required Configuration

```ts
type AdminAuthGuardOptions = {
  /** Pinia instance for resolving the package auth store. */
  pinia: Pinia;

  /** Route name identifying the public login page. */
  loginRouteName: string;

  /** Route name identifying the protected home/dashboard page. */
  homeRouteName: string;

  /** Query parameter name used for redirect-after-login URLs. */
  redirectQueryParam?: string; // default: "redirectUrl"

  /** Optional custom redirect URL validation. */
  validateRedirectUrl?: (url: string) => boolean;

  /** Optional: called before redirecting to login. */
  onAuthRequired?: (to: RouteLocationNormalized) => void;
};
```

### 2.2 Guard Logic

```ts
function createAdminAuthGuard(options: AdminAuthGuardOptions) {
  const auth = useAdminAuthStore(options.pinia);

  return function authGuard(to: RouteLocationNormalized) {
    const requiresAuth = to.matched.some(r => r.meta.requiresAuth === true);

    if (requiresAuth && auth.status.kind !== "authenticated") {
      return {
        name: options.loginRouteName,
        query: { [options.redirectQueryParam ?? "redirectUrl"]: to.fullPath },
      };
    }

    if (to.name === options.loginRouteName && auth.status.kind === "authenticated") {
      return { name: options.homeRouteName };
    }

    return true;
  };
}
```

### 2.3 Composition With Scope Guard

```ts
function createAdminAuthAndScopeGuard(options: {
  auth: AdminAuthGuardOptions;
  navigation: AdminShellVueRouterNavigation;
}): (router: Router) => () => void {
  return (router) => {
    const authGuard = createAdminAuthGuard(options.auth);
    const removeAuth = router.beforeEach(authGuard);
    const removeScope = options.navigation.installScopeGuard();

    return () => {
      removeScope();
      removeAuth();
    };
  };
}
```

## 3. New Dependencies Required

### 3.1 Pinia Peer Dep

`@noob-naive-ui/admin-vue-router` currently lists peers: `@noob-naive-ui/admin`, `vue`, `vue-router`, `zod`.

To access `useAdminAuthStore(pinia)` in a guard (outside component setup), pinia must be the pinia instance. This requires `pinia` as a peer dependency.

**Risk:** Adds a peer dep. But pinia is already a peer of `@noob-naive-ui/admin`, and any app using `admin` already has pinia.

### 3.2 Import of AdminLoginPage

If the adapter creates login route records, it must import `AdminLoginPage` from the `@noob-naive-ui/admin` peer. This is already a peer dep, so the import is valid.

**Risk:** Ensures build-time type safety but doesn't introduce runtime coupling beyond what already exists.

## 4. Login Route Ownership Options

### 4.1 `createAdminLoginRoute()`

```ts
type AdminLoginRouteOptions = {
  /** Route name, default "login". */
  name?: string;
  /** Path, default "/login". */
  path?: string;
  /** Optional additional route meta. */
  meta?: RouteMeta;
};

function createAdminLoginRoute(options?: AdminLoginRouteOptions): RouteRecordRaw {
  return {
    path: options?.path ?? "/login",
    name: options?.name ?? "login",
    component: AdminLoginPage,
    meta: options?.meta,
  };
}
```

**Host usage:**
```ts
const routes = [
  createAdminLoginRoute(),
  createAdminShellRoute({ children: demoRouteRegistry.toRouteRecords() }),
];
```

### 4.2 `createAdminShellRoute()`

```ts
type AdminShellRouteOptions = {
  /** Path, default "/". */
  path?: string;
  /** Optional additional route meta (requiresAuth is always set). */
  meta?: RouteMeta;
  /** Child routes (from route registry). */
  children: RouteRecordRaw[];
  /** Optional shell props. */
  shellProps?: Partial<AdminShellProps>;
};

function createAdminShellRoute(options: AdminShellRouteOptions): RouteRecordRaw {
  const ShellWrapper = defineComponent(
    () => {
      const navigation = requireDemoNavigation(); // or injected
      // ... setup ...
      return () => (
        <AdminShell menuOptions={menuOptions} navigation={navigation}>
          <RouterView />
        </AdminShell>
      );
    },
    { name: "AdminShellRoute" },
  );

  return {
    path: options.path ?? "/",
    component: ShellWrapper,
    meta: { requiresAuth: true, ...options.meta },
    children: options.children,
  };
}
```

**Problem:** The shell wrapper needs access to the navigation adapter and menu options, which are host-owned. This creates a circular dependency — the adapter creates the route, but the route needs the adapter.

**Resolution approaches:**
- A. Host provides menu options and navigation via injection/options
- B. Adapter creates a "thin" route component that resolves a host-provided InjectionKey
- C. Don't create the wrapper component at all — let host create it, but adapter provides the `RouteRecordRaw` shape

**Recommended: Approach B** — the adapter provides a standard wrapper that reads from host-provided contexts.

## 5. Impact on Demo App

### 5.1 Current Code

```ts
// router.ts (62 lines)
export const LOGIN_ROUTE_NAME = "login";
export const HOME_ROUTE_NAME = "dashboard";
const demoRoutes: RouteRecordRaw[] = [
  { path: "/login", name: LOGIN_ROUTE_NAME, component: DemoLoginRoute },
  { path: "/", component: DemoShellRoute, meta: { requiresAuth: true },
    children: demoRouteRegistry.toRouteRecords() },
];
export function createDemoRouter(): Router { ... }
export function installDemoRouterGuards(router, pinia, navigation) { ... }
```

### 5.2 With Adapter-Owned Routes (Option C)

```ts
// router.ts (~20 lines)
export const LOGIN_ROUTE_NAME = "login";
export const HOME_ROUTE_NAME = "dashboard";

export function createDemoRouter(): Router {
  return createRouter({
    history: createWebHistory(),
    routes: [
      createAdminLoginRoute({ name: LOGIN_ROUTE_NAME }),
      createAdminShellRoute({
        children: demoRouteRegistry.toRouteRecords(),
      }),
    ],
  });
}

// No installDemoRouterGuards — adapter provides it
```

```ts
// main.ts changes:
// Remove: installDemoRouterGuards(router, pinia, navigation)
// Add:    installAdminGuards({ router, pinia, navigation, loginRouteName, homeRouteName })
// Or:     createAdminAuthAndScopeGuard({ auth: { pinia, loginRouteName, homeRouteName }, navigation })(router)
```

### 5.3 What the Demo Still Must Own

| Responsibility | Owned By | Reason |
|---|---|---|
| Login callback logic | Host | Credential validation is application-specific |
| Logout callback logic | Host | Cleanup is application-specific |
| `navigationScopeId` | Host | Session identity is application-specific |
| `describeDestination` | Host | Tab labels are application-specific |
| `createPageId` | Host | UUID generation policy |
| Route registry definitions | Host | Routes are application-specific |
| Menu options | Host | Menu hierarchy is application-specific |
| Demo shell wrapper component | Host (may simplify) | Currently owns post-logout redirect; could be standardized |

## 6. Decision Matrix

| Aspect | Keep Host-Owned | Move To Adapter | Notes |
|---|---|---|---|
| Auth guard logic | Current | Option B/C | Standard pattern, low-risk to own |
| Login route record | Current | All options | Path/name always standard |
| Shell route record | Current | All options | Needs wrapper component resolution |
| Login wrapper component | Current | Probably not | Host owns redirect-after-login logic |
| Shell wrapper component | Current | With injection key | Host owns menu + logout redirect |
| Router creation | Current | No | Too opinionated |
| Scope guard | Adapter | Adapter | Already adapter-owned |
| Scope ID management | Host | Host | Application-specific |
| redirectUrl validation | Host | Adapter (with callback) | Default safe, host can override |

## 7. Edge Cases & Risk Assessment

### 7.1 Adapter-Owned Auth Guard: Risky Cases

| Case | Risk | Mitigation |
|---|---|---|
| Host wants role-based auth before protected route | Medium | Guard must accept `onAuthRequired` callback or be replaceable |
| Host wants MFA check on specific routes | Medium | Host can register additional guard after adapter guard |
| Host wants to log auth failures | Low | `onAuthRequired` callback covers this |
| Host uses non-standard redirect query param | Low | Configurable option |
| Host doesn't use `meta.requiresAuth` | High | Must document contract; adapter guard must check this meta field |
| Host has both admin and non-admin protected routes | Medium | Guard should only act on routes under shell layout |

### 7.2 Adapter-Owned Login Route: Risky Cases

| Case | Risk | Mitigation |
|---|---|---|
| Host wants custom login page wrapper | Low | Option to provide custom component |
| Host wants pre-login content (terms, branding) | Low | Host wraps login route in parent layout |
| Host needs `/login` at different path | Low | Configurable path |
| Host has i18n login URLs | Medium | Host must handle locale prefix outside adapter |

### 7.3 Adapter-Owned Shell Route: Risky Cases

| Case | Risk | Mitigation |
|---|---|---|
| Host needs shell to receive custom props | Medium | Pass through `shellProps` option |
| Host needs shell wrapped in additional providers | Medium | Host must wrap at router-view level above |
| Host uses nested layouts beyond shell | Medium | Host adds parent route wrapping shell |

## 8. Testing Implications

### 8.1 New Tests Needed (Adapter-Owned Guard)

```
admin-vue-router/tests/auth-guard.test.ts:
  - Anonymous → protected route → redirects to login with redirectUrl
  - Authenticated → login route → redirects to home
  - Authenticated → protected route → passes through
  - Configurable login/home route names
  - Configurable redirect query param
  - Guard bypass for non-admin routes
  - Integration: auth guard → enterScope → scope guard admits entry
```

### 8.2 Existing Tests Must Not Break

```
packages/admin/tests/admin-shell.test.tsx       — should pass unchanged
packages/admin/tests/admin-login-page.test.ts   — should pass unchanged
packages/admin/tests/shell-preferences.test.ts  — should pass unchanged
packages/admin-vue-router/tests/navigation.test.ts        — should pass (scope guard)
packages/admin-vue-router/tests/route-registry.test.ts    — should pass unchanged
```

### 8.3 Demo App Verification

```
pnpm --filter demo typecheck  — must pass
pnpm --filter demo build      — must pass
```

## 9. Summary

The adapter _can_ own auth guard, login route records, and shell route records without breaking backward compatibility. The key design decisions:

1. **Router creation stays with host.** Not opinionated enough to own.
2. **Auth guard can move to adapter** IF pinia is added as peer dep and the guard is configurable.
3. **Login/shell route factories are low-risk** — they're just `RouteRecordRaw` generators.
4. **Shell wrapper component** needs injection-key-based resolution, or host must still provide it.
5. **Demo must still own:** login logic, logout logic, scope rotation, tab presentation, menu hierarchy, registry definitions.

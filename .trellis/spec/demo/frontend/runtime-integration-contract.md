# Runtime Integration Contract

## 1. Scope / Trigger

Use this contract when changing `apps/demo` assembly, auth callbacks, route nesting, guards, or admin navigation. The demo is frontend-only: no backend transport, session persistence, DTOs, tokens, or fake API.

## 2. Signatures

```ts
const auth = useAdminAuthStore(pinia);
auth.configure({
  login(values): Promise<AdminAuthIdentity>,
  logout(): Promise<void> | void,
});

const preferences = useAdminShellPreferencesStore(pinia);
preferences.initialize({ defaults: { availableLocales, ... } });

const menu = useAdminShellMenuStore(pinia);
menu.configure(createDemoMenu());

const router = createAdminRouter({
  pinia,
  history: createWebHistory(),
  registry: demoRouteRegistry,
  homeDestination: { navKey: "dashboard" },
  describeDestination: describeDemoDestination,
  createPageId: () => crypto.randomUUID(),
  getNavigationScopeId: () => navigationScopeId.value,
  // Optional host overrides:
  // shellRoute: { path: "/admin", innerComponent: CustomShell, meta: { icon: "gear" } },
  // loginRoute: { path: "/sign-in", innerComponent: CustomLogin },
  // additionalRoutes: [ ... ],
  // scrollBehavior: (to, from, savedPosition) => ...,
});
```

The host configures stores first, then passes them (plus the registry, history, and presentation callbacks) into `createAdminRouter`. The factory returns the fully configured `Router`.

Registry route paths are relative children (`""`, `"reports"`, `"detail/:reportId"`). The factory wraps them beneath the generated shell route and keeps the login route as a public sibling at host-chosen path.

## 3. Contracts

- Import public package APIs and `@noob-naive-ui/admin/style.css`; never reach into package source.
- Package auth state is non-persistent Pinia state. Demo callbacks validate fake credentials and return presentation identity; they never set auth status.
- `App.tsx` owns shared providers plus the outer `RouterView`. It has no knowledge of login, shell, or auth status.
- `@noob-naive-ui/admin-vue-router.createAdminRouter()` generates internal login and shell route records with package-owned names (`_noobAdminLogin`, `_noobAdminShell`). The shell route stamps `requiresAuth: true` in its metadata. The login route has no `requiresAuth`. The host may override path, inner presentation component, and non-reserved metadata for each.
- `@noob-naive-ui/admin-vue-router.createAdminRouter()` owns the auth guard (`beforeEach`): anonymous protected routes redirect to login with `?redirectUrl=<fullPath>`; authenticated `/login` redirects to `homeDestination`. The host does not write router guards.
- `@noob-naive-ui/admin-vue-router.createAdminRouter()` owns `resolvePostLoginDestination()`: redirect restoration accepts only a root-relative URL resolving to a matched protected registry route. Login, external, malformed, and public targets fall back to `homeDestination`.
- `@noob-naive-ui/admin-vue-router.createAdminRouter()` owns auth-transition routing: it subscribes to the auth store and orchestrates scope entry after login (with redirect URL resolution) and logout routing. Rejected scope entry resets pending state and does not suppress a later eligible attempt.
- `@noob-naive-ui/admin-vue-router.createAdminRouter()` owns the history-scope guard: it parses `_noobAdminShell`, bypasses non-registry routes, repairs stale/missing protected scope to one stable home descriptor per scope, and stamps explicit post-login entries through the navigation runtime.
- The host owns: Pinia instance, history mode (and base), route registry (definitions and codecs), tab presentation (`describeDestination`), page ID creation (`createPageId`), navigation scope ID rotation (`getNavigationScopeId`), home destination, menu hierarchy, preference configuration, optional shell/login overrides, additional public routes, and scroll behavior.
- Menu is configured separately via `useAdminShellMenuStore().configure(createDemoMenu())`. The factory does not read menu state for route generation.
- Initialize `useAdminShellPreferencesStore` once; theme/font presentation consumes that same store.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Empty trimmed username/password | Callback rejects; package stays anonymous and shows generic feedback. |
| Valid credentials | Callback returns `AdminAuthIdentity`; package becomes authenticated; factory resolves a safe post-login target. |
| Anonymous protected deep link | Factory auth guard redirects to login with encoded original full path. |
| External, login, malformed, or unmatched redirect | Factory redirect resolution enters a scoped `homeDestination` route. |
| Current-scope protected history | Factory scope guard proceeds unchanged. |
| Stale/missing protected scope | Factory scope guard replaces with scoped `homeDestination`. |
| `/login` or unrelated route | Factory scope guard bypasses it. |
| Successful logout | Package becomes anonymous; factory auth transition replaces shell to login. |

## 5. Good, Base, and Bad Cases

- **Good:** relative registry children under factory-generated shell route; package-owned auth state and auth guard; host callbacks; factory-owned scope repair, redirect validation, and auth-transition routing.
- **Base:** backend-free in-memory login with static pages and no session restoration.
- **Bad:** root-local `Ref<AdminAuthStatus>`, auth props on shell/login, direct `_noobAdminShell` parsing in demo, absolute registry child paths, adapter-owned `/login`, persisted fake auth, or the host writing its own router guards or redirect validation.

## 6. Tests Required

- `pnpm --filter @noob-naive-ui/admin test`
- `pnpm --filter @noob-naive-ui/admin-vue-router test`
- `pnpm --filter demo typecheck`
- `pnpm --filter demo build`
- Browser: anonymous deep link, no shell on login, successful redirect restoration, authenticated shell, logout to login, safe redirect fallback, history-scope repair, no console warnings/errors, no application API request.

## 7. Wrong vs Correct

```ts
// Wrong: host parses package-private history, writes its own guard, manages auth status.
router.beforeEach((to) => {
  const shellState = router.options.history.state._noobAdminShell;
  if (!shellState?.scopeId) redirect("/login");
});
authStatus.value = { kind: "authenticated" };

// Correct: factory owns routes, guards, redirect validation, scope repair.
// Host owns Pinia, history, registry, presentation, and scope identity.
const router = createAdminRouter({
  pinia,
  history: createWebHistory(),
  registry: demoRouteRegistry,
  homeDestination: { navKey: "dashboard" },
  describeDestination: describeDemoDestination,
  createPageId: () => crypto.randomUUID(),
  getNavigationScopeId: () => navigationScopeId.value,
});
```

# Design — plugin-shaped `createAdminRouterPlugin`

## New API shape

```ts
export interface AdminRouterPlugin {
  /** Vue plugin install. Requires the app to have installed Pinia first. */
  install(app: App): void;
  /** The fully configured Router, created eagerly by the factory. */
  readonly router: Router;
}

export function createAdminRouterPlugin<TDefinitions extends AdminRouteDefinitions>(
  options: Omit<CreateAdminRouterOptions<TDefinitions>, "pinia">,
): AdminRouterPlugin;
```

### Why eager router creation

Router creation, route records, and the navigation runtime
(`createAdminShellVueRouterRuntime`) have **no Pinia dependency** today — the
only Pinia-touching statements are `useAdminAuthStore(pinia)` and
`useAdminShellNavigationStore(pinia).configure(...)`. Creating the `Router`
in the factory:

- keeps synchronous validation (path collision, additional-route collision)
  at factory call time, exactly as today;
- lets hosts/tests keep `plugin.router` for `router.push`, `getRoutes()`,
  etc. — `app.use()` discards install return values, so the router must be
  reachable some other way;
- lets the demo replace `const router = createAdminRouterPlugin(...)` +
  `.use(router)` with `.use(createAdminRouterPlugin(...))` without losing access
  (hosts that need the router keep `const admin = createAdminRouterPlugin(...)`).

### Install-time responsibilities

`install(app)` runs in this order:

1. **Pinia gate**: `const pinia = getActivePinia()`; throw
   `"createAdminRouterPlugin requires Pinia to be installed on the app before use."`
   when null. This is the ordering guarantee the refactor exists for.
2. **Duplicate-install guard**: a closure `installed` flag throws on a second
   `install` call on the same plugin instance (router guards/subscriptions
   would otherwise register twice; `app.use` alone only dedupes whole-plugin
   re-registration).
3. **Store binding**: `const auth = useAdminAuthStore(pinia)` and
   `useAdminShellNavigationStore(pinia).configure(navigationRuntime.navigation)`.
4. **Guard/subscription setup** via the four helpers (below), collecting
   remover functions into `cleanupFunctions`.
5. **Router install**: `app.use(router)`.
6. **Dispose provision**: `app.provide(ADMIN_DISPOSE_KEY, dispose)` where
   `dispose` runs every cleanup function. The `Object.defineProperty` hack is
   deleted; `ADMIN_DISPOSE_KEY` becomes a public export so components/hosts can
   `inject()` it (e.g. HMR teardown or app-level `runWithContext`).

## The four setup helpers (module-private in `create-admin-router.ts`)

All four follow one contract: accept their dependencies, install one effect on
the router or store, return a removal function.

```ts
installRouterErrorHandler(router: Router): () => void
  // router.onError(reportRouterError); returns unregister. reportRouterError
  // moves to module level (currently nested in the factory body).

installAuthGuard(router: Router, auth: AdminAuthStore, homeDestination: AdminShellDestination): () => void
  // beforeEach: await waitForRestoration while loading; redirect anonymous
  // protected → login with ?redirectUrl; redirect authenticated /login → home.

installScopeGuard(navigationRuntime: AdminShellVueRouterRuntime): () => void
  // Thin named wrapper over navigationRuntime.installScopeGuard() so the
  // install body reads uniformly and the runtime's own guard stays behind
  // the helper boundary.

installAuthTransitionGuard(
  auth: AdminAuthStore,
  router: Router,
  navigationRuntime: AdminShellVueRouterRuntime,
  registry: AdminRouteRegistry<AdminRouteDefinitions>,
  homeDestination: AdminShellDestination,
): () => void
  // Owns scopeEntryPending, handleAuthTransition, runAuthTransition, the
  // detached $subscribe, and the initial runAuthTransition(auth.status.kind).
  // Returns a remover that unsubscribes.
```

`scopeEntryPending` moves from the factory closure into
`installAuthTransitionGuard` — it is only referenced by the transition
handler, so the move is behavior-neutral.

## Pinia acquisition detail

`getActivePinia()` returns the Pinia set by `app.use(pinia)` (pinia's install
calls `setActivePinia`). After that, store calls without an explicit pinia
argument resolve the same instance. Tests that never mount an app must call
`setActivePinia(pinia)` (or create an app and `app.use(pinia)`) before
`plugin.install(app)`; the auth-guard/auth-transition tests additionally keep
their explicit `useAdminAuthStore(pinia)` reads, which remain valid.

## Compatibility

- **Public API delta**: `pinia` option removed; return type becomes
  `AdminRouterPlugin` (`{ install, router }`); `ADMIN_DISPOSE_KEY` exported.
  Lower-level exports unchanged.
- **Demo**: `createAdminRouterPlugin({ pinia, ... })` →
  `app.use(pinia)` then `app.use(createAdminRouterPlugin({ ... }))` (or
  `createAdminRouterPlugin` result bound to a local). `pinia` no longer passed.
- **Tests**: `createOptions()` drops `pinia`; helper adds
  `setActivePinia(opts.pinia)` + `plugin.install(app)` (bare `createApp`) so
  guards/subscriptions bind; assertions read `plugin.router`. `getDispose`
  symbol-walk test helper is replaced by `app.runWithContext(() =>
  inject(ADMIN_DISPOSE_KEY))` verification.
- **Docs to update (current truth only)**: `.trellis/spec/demo/frontend/
  runtime-integration-contract.md` (signature block + wrong/correct example),
  `.trellis/spec/admin/frontend/runtime-contract.md` (ownership sentence),
  `docs/adr/0002-admin-shell-router-host-contract.md` (host steps).
  Archived task docs stay untouched.

## Rollout / rollback

Single commit. Rollback = revert the commit; no migration shim kept
(no in-repo consumer depends on the removed `pinia` option beyond demo/tests
being updated in the same change).

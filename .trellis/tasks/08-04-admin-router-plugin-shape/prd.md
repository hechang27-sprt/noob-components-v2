# PRD — Refactor `createAdminRouterPlugin` into a Vue plugin shape

## Problem

`createAdminRouterPlugin(options)` currently binds Pinia stores at factory-call time:

```ts
const auth = useAdminAuthStore(pinia);          // needs pinia
useAdminShellNavigationStore(pinia).configure(...); // needs pinia
```

The host must therefore pass a `pinia` option and the store bindings execute
before `app.use(pinia)` ever runs. The ordering works only by convention; a
plugin shape removes the ordering hazard entirely because `install(app)` runs
after the host's `app.use(pinia)`.

Additionally:

- Router event-handler setup (error handler, auth guard, scope guard,
  auth-transition subscription) is inline in the factory body and should be
  extracted into four named helpers.
- Deterministic cleanup is exposed via a non-enumerable
  `Object.defineProperty(router, ADMIN_DISPOSE_KEY, ...)` hack that nothing in
  the repo consumes. It should become `app.provide(...)` / `inject(...)` with
  the key exported so it is actually usable.

## Requirements

1. `createAdminRouterPlugin(options)` returns a Vue plugin (`{ install(app) }`)
   installable via `app.use(createAdminRouterPlugin(options))`.
2. The plugin's `install(app)`:
   - obtains Pinia via `getActivePinia()`, throwing a clear error when Pinia
     is not initialized (i.e. the host must `app.use(pinia)` first);
   - binds the auth store and configures the admin navigation store against
     that Pinia;
   - initializes/installs the router with `app.use(router)`;
   - provides the deterministic cleanup function via `app.provide(...)`.
3. The `pinia` option is removed from `CreateAdminRouterOptions`; the demo
   host and package tests stop passing it.
4. The created `Router` remains reachable by the host/tests (e.g. exposed on
   the returned plugin object), so existing router usage keeps working.
5. Extract four setup helpers: `installRouterErrorHandler`,
   `installAuthGuard`, `installScopeGuard`, `installAuthTransitionGuard`.
6. Replace the `ADMIN_DISPOSE_KEY` `Object.defineProperty` with provide/inject:
   export the key from the package so consumers can `inject()` it.
7. Duplicate installation of the same plugin instance is rejected.
8. Behavior parity: route records, meta stamping, guard ordering, redirect
   validation, scope repair, auth-transition routing, and error reporting are
   unchanged.

## Acceptance criteria

- `app.use(pinia); app.use(createAdminRouterPlugin(opts))` works and the admin
  shell navigation store is configured on that Pinia.
- Installing the plugin without `app.use(pinia)` throws a descriptive error.
- `plugin.router` exposes the configured `Router` (routes, guards, push).
- `inject(ADMIN_DISPOSE_KEY)` returns a function that removes the error
  handler, auth guard, scope guard, and auth-transition subscription;
  `Object.defineProperty` is gone.
- The four helpers exist as named functions and are exercised through the
  router behavior tests.
- `pnpm --filter @noob-naive-ui/admin-vue-router test` passes.
- `pnpm --filter @noob-naive-ui/admin-vue-router typecheck` passes (or
  equivalent source build per package scripts).
- `pnpm --filter demo typecheck` and `pnpm --filter demo build` pass.
- Demo browser smoke test: anonymous deep link → login → redirect restore →
  authenticated shell → logout → login, with a clean console.

## Non-goals

- No change to lower-level APIs (`defineAdminRouteRegistry`,
  `createAdminShellVueRouterRuntime`, codecs).
- No change to route generation, guard semantics, or redirect policy.
- No changes to the `admin` package or its stores.
- Archived task docs are historical and are not edited.

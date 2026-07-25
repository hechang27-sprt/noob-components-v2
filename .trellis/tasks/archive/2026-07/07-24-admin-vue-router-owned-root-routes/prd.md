# Move admin route ownership into Vue Router adapter

## Goal

Add an opinionated `createAdminRouter()` API to `@noob-naive-ui/admin-vue-router` that creates the Vue Router instance and owns the standard login/shell routes and complete auth-routing lifecycle, while preserving lower-level APIs for custom hosts.

## Evidence and Decision

- `admin-vue-router` already owns registry binding, codecs, page-instance navigation, history metadata, scope repair, and scope entry.
- The demo still duplicates framework-level router creation, root records, auth guards, redirect validation, internal route components, adapter provisioning, and cleanup.
- A separate route runtime plus `install(router)` permits invalid states: mismatched router/routes, missing or duplicate installation, and incorrect guard ordering.
- **Resolved:** choose full router creation (Option B). The caller still supplies `RouterHistory`, including deployment base and history mode, plus optional non-admin routes and supported router options.
- **Resolved:** support `additionalRoutes` in the first public contract so public help/callback/error routes do not force consumers onto lower-level APIs.
- **Resolved:** menu hierarchy is non-persistent admin-package Pinia presentation state. `AdminShell` reads `useAdminShellMenuStore()` directly; `createAdminRouter()` receives no menu or route-props configuration.
- **Resolved:** the router-neutral navigation controller is non-persistent admin-package Pinia state. `AdminShell` reads `useAdminShellNavigationStore()` directly; its public `navigation` prop is removed.
- Detailed evidence remains under `research/`.

## Requirements

1. Keep `@noob-naive-ui/admin` router-neutral.
2. Add additive `createAdminRouter(options): Router`; do not replace existing lower-level exports.
3. The factory creates the standard `/login` record and authenticated `/` shell parent with relative registry children.
4. The package-owned login route renders `AdminLoginPage`; the shell route renders `AdminShell` with an inner `RouterView`.
5. The caller supplies `history`, Pinia, registry, home destination, destination/page-ID policy, current scope ID, constrained shell/login component overrides, optional `additionalRoutes`, and supported Vue Router options such as `scrollBehavior`.
6. The package owns auth guard ordering, redirect validation, login scope entry, logout routing, scope repair, adapter construction, and lifecycle cleanup.
7. Add non-persistent `useAdminShellMenuStore()` and `useAdminShellNavigationStore()` runtimes configured once per Pinia instance. `AdminShell` reads both reactively; remove its `menuOptions` and `navigation` props.
8. Default paths are `/` and `/login`. Constrained `shellRoute`/`loginRoute` overrides may change path, inner presentation component, and additive metadata; names, children, redirects, aliases, guards, and props remain package-owned. No `parentPath` or flat/nested option is added to the registry.
9. `additionalRoutes` are appended as non-admin siblings. Duplicate names/paths that conflict with generated admin records must fail clearly during creation.
10. Preserve `defineAdminRouteRegistry`, `defineAdminRouteUrlCodec`, and `createAdminShellVueRouterRuntime` as source-compatible escape hatches. Its `navigation` field is the only controller configured into `AdminShell`; router lifecycle methods remain on the runtime.
11. Validate redirect query input at the adapter boundary: accept only root-relative, non-protocol-relative targets that resolve to registered protected destinations; otherwise enter the designated home destination.
12. Use Pinia `$subscribe()` for login/logout transitions, not component-level Vue `watch()`.
13. Migrate the demo completely and remove its duplicated router, route components, guard, redirect resolver, navigation injection context, and adapter lifecycle.
14. Update tests and persistent runtime specifications in the same cutover.

## Public API

```ts
const router = createAdminRouter({
  pinia,
  history: createWebHistory(import.meta.env.BASE_URL),
  registry,
  homeDestination: { navKey: "dashboard" },
  shellRoute: { innerComponent: CustomShellRoute },
  describeDestination,
  createPageId,
  getNavigationScopeId,
  loginRoute: { innerComponent: CustomLoginRoute },
  additionalRoutes: [helpRoute, oauthCallbackRoute],
  scrollBehavior,
});

createApp(App).use(pinia).use(router).mount("#app");
```

Invalid static configuration throws synchronously. Callback rejection preserves safe auth state and does not navigate. Router disposal/teardown must remove package subscriptions and guards deterministically.

## Acceptance Criteria

- [ ] `createAdminRouter()` returns the fully configured Vue Router with generated login/shell records and guards.
- [ ] The caller explicitly supplies history/base policy.
- [ ] `additionalRoutes` support non-admin siblings without weakening protected-route detection.
- [ ] Conflicting generated/additional paths or names fail clearly.
- [ ] Existing lower-level exports remain source-compatible.
- [ ] `AdminShell` has no `menuOptions` or `navigation` prop; it consumes both reactive dependencies through package-owned Pinia stores.
- [ ] Anonymous protected deep links redirect to login with the original full path.
- [ ] Successful login restores only a valid registered destination and enters the new scope; unsafe values fall back home.
- [ ] Authenticated login navigation redirects home; successful logout reaches standalone login.
- [ ] Scope repair bypasses login/additional public routes, preserves current-scope history, and repairs stale/missing protected history.
- [ ] Demo code contains no duplicated framework router, root-route, guard, redirect, or adapter-injection logic.
- [ ] Package tests/typechecks/builds, demo build, and browser login/deep-link/logout/history/additional-route scenarios pass.

## Out of Scope

- Router APIs in `@noob-naive-ui/admin`.
- Backend sessions, persistence, RBAC, or tokens.
- Choosing history mode or deployment base inside the package.
- Owning application providers or arbitrary behavior of additional routes.
- Removing lower-level registry/navigation APIs.

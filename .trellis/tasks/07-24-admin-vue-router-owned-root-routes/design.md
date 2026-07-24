# Design: adapter-owned Vue Router

## Decision

`createAdminRouter()` creates and returns the Vue Router instance. This makes generated records, guard ordering, adapter construction, and auth subscriptions one atomic lifecycle. Existing registry/navigation APIs remain available for custom routers.

## Contract

```ts
interface CreateAdminRouterOptions<Registry> {
  pinia: Pinia;
  history: RouterHistory;
  registry: Registry;
  homeDestination: AdminShellDestination;
  shellRoute?: AdminRouteOverride;
  loginRoute?: AdminRouteOverride;
  describeDestination: DescribeAdminShellDestination;
  createPageId: () => string;
  getNavigationScopeId: () => string;
  additionalRoutes?: readonly RouteRecordRaw[];
  scrollBehavior?: RouterScrollBehavior;
}

function createAdminRouter(options: CreateAdminRouterOptions): Router;
```

```ts
interface AdminRouteOverride {
  path?: string;
  innerComponent?: Component;
  meta?: RouteMeta;
}
```

Names, children, redirects, aliases, guards, `components`, and `props` are reserved. `innerComponent` replaces only the presentation rendered inside the package-owned route wrapper; the wrapper lifecycle, auth subscription, Pinia integration, and routing invariants remain fully package-owned and are never exposed through the override.

Do not accept raw `RouterOptions`: `history` and `routes` have package-defined ownership. Add supported host policy fields explicitly so callers cannot override generated records accidentally.

## Generated topology

```text
loginPath → internal login route → AdminLoginPage
shellPath → internal protected shell route → AdminShell → RouterView
  └─ registry.toRouteRecords()
additionalRoutes → sibling records
```

Generated internal route names use collision-resistant package constants. Creation validates distinct absolute shell/login paths and rejects additional route name/path collisions with generated records.

## Lifecycle

The factory creates the router, navigation adapter, auth guard, and scope guard together, then configures the adapter into `useAdminShellNavigationStore(pinia)` before rendering the shell. One factory-owned Pinia subscription handles post-login scope entry and protected-shell logout routing directly through that typed adapter; internal route components only render their inner presentation. Auth gating is registered before scope repair, and router cleanup removes the subscription and guards deterministically.

## Admin runtime stores

`@noob-naive-ui/admin` owns non-persistent menu and navigation Pinia stores configured once per Pinia instance. `AdminShell` reads both stores reactively and has no `menuOptions` or `navigation` prop. The navigation store remains router-neutral because it accepts only `AdminShellNavigation`; `createAdminRouter()` configures its Vue Router adapter through the supplied Pinia.

## Redirect boundary

A redirect query must be one string, begin with `/`, not begin with `//`, resolve to a matched registry child, exclude login/additional public routes, and decode through `registry.fromRoute`. Failure enters `homeDestination`. Raw external URLs are never navigated.

## Ownership

Package owns router instance creation, generated records/components, internal names/meta, guards, safe redirects, navigation adapter, scope entry/repair, and login/logout routing.

Host owns history implementation/base, Pinia instance, auth/menu configuration, registry pages/codecs, descriptor policy, scope-ID rotation, additional route contents, supported scroll policy, providers, and mount. The router factory configures the package navigation store atomically; lower-level custom-router hosts configure it themselves.

## Compatibility

This is additive. `defineAdminRouteRegistry`, codecs, and `createAdminShellVueRouterRuntime` remain available for custom route trees. The runtime separates its router-neutral `navigation` controller from `toScopedLocation()`, `installScopeGuard()`, and `enterScope()` lifecycle operations. No registry parent-path or mode option is introduced.

## Errors

Invalid paths/collisions/configuration throw synchronously with stable package messages. Login/logout callback rejection does not navigate. Additional routes remain outside registry-based scope repair unless explicitly represented by the registry.

## Demo cutover

The demo keeps history selection, auth/menu configuration, registry/pages/codecs, descriptor policy, scope-ID rotation, providers, and mount. Delete demo router assembly, login/shell route components, navigation context, auth guards, redirect resolver, and adapter provisioning.

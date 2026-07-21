# Design: routed login outside `AdminShell`

## Ownership model

The starter owns the complete Vue Router route tree, authentication/session integration, route guards, redirects, menu construction, domain pages, and mapping route state into the router-neutral shell navigation contract.

`@noob-naive-ui/admin` owns reusable frontend presentation/runtime concerns: independently composable `AdminLoginPage`, authenticated `AdminShell`, shell preferences, and any genuinely shared frontend-only presentation state. It imports no router API and exports no route records.

## Host-owned nested route composition

The application root retains providers and renders an outer `RouterView`. Top-level records choose between:

- `/login` → starter-owned login route component composing `AdminLoginPage`; or
- the shell-layout record → starter-owned shell route component composing `AdminShell` and an inner `RouterView`.

Demo domain records are children of the shell-layout record. For a domain URL, Vue Router renders the shell route into the outer view and the domain page into the inner view. For `/login`, `AdminShell` is not mounted.

This design follows Vue Router nested routes: https://router.vuejs.org/guide/essentials/nested-routes.html

Fixed package route arrays, route factories, dynamic installers, named-view composition, and package-owned router instances are excluded.

## Destination URL codecs

The demo route registry uses one key as both `AdminShellDestination.navKey` and Vue Router route name. Every definition owns a bidirectional URL codec. `encode` validates router-neutral destination params and maps them into explicit path/query/hash state used by shell navigation; `decode` reconstructs canonical destination params from the normalized current URL. Parameterless routes reject non-empty params. Shared registry helpers perform both directions so the shell adapter contains no route-specific parameter branches or reverse route index. When history state is restored, URL-decoded destination data replaces the descriptor's retained destination snapshot, keeping the URL authoritative.

## Authentication and redirect flow

The demo owns an in-memory Pinia auth store shared by sibling login and shell route components.

1. A guard sees an anonymous navigation to a domain route.
2. It redirects to `/login` with `redirectUrl: to.fullPath`.
3. The standalone login route invokes the demo auth store through `AdminLoginPage`'s frontend-only callback contract.
4. After success, it resolves the query value against the host router and restores it only when it is a known internal domain location that does not resolve to login.
5. Missing or invalid values fall back to the default domain route.
6. Logout clears demo auth state and replaces the current location with `/login`.
7. An authenticated attempt to enter `/login` redirects to the default domain route.

Vue Router documents carrying the original `to.fullPath` in login query state and reading merged route metadata in guards: https://router.vuejs.org/guide/advanced/meta.html

The guard is UI/navigation gating, not authorization. Backend resource authorization remains mandatory.

## State boundaries

- Demo store: fake authentication status and login/logout transitions needed by sibling route components and guards.
- Admin-package store: frontend-only presentation state shared between login and shell. Existing theme/font/locale/sidebar preferences already satisfy this ownership through `useAdminShellPreferencesStore`; no second package store is introduced without additional shared state.
- Login-local state: credentials, remember value, submit pending state, and login feedback.
- Shell-local state: tab membership/order, tab navigation feedback/pending state, logout feedback/pending state, and descendant navigation context.

## Public contract changes

`AdminShellProps` removes `authStatus` and `authActions`. `AdminShell` always renders authenticated layout. Its menu, navigation, slot, context, and page-instance contracts remain unchanged.

`AdminLoginPageProps`, `AdminAuthStatus`, `AdminAuthActions`, and `AdminLoginValues` remain available because the standalone login route still consumes them. Their types remain frontend-only; the demo store adapts them to fake host behavior.

## Comparison with the legacy consumer

`../s6a_manage/src/config/router.ts` owns its router but appends package-owned `Views.routes`, imports packaged `Common.Login2`, and registers all package/application routes as peers. `../s6a_manage/src/App.vue` mounts packaged `Index` at the root; `Index` contains the sole `router-view`, imports Vue Router, polls packaged session APIs, and redirects internally. Consequently `/login` still renders through the package shell and route/session ownership is split across package shell, package views, application router, and application store.

The new design keeps the useful composition—package UI consumed by an application-owned router—but centralizes all URL and route-tree policy in the host. If a future package owns a complete optional feature with concrete pages, a separate router adapter may be designed then; it is not a responsibility of the generic admin shell.

## Migration and rollback

- Cleanly remove shell auth props/branch and migrate every caller/test in the same change.
- Split demo root providers, login route, shell route, and auth store along ownership boundaries.
- Preserve current domain URLs and shell page-instance history behavior.
- Rollback is a source revert; there is no persisted-data migration or backend dependency.

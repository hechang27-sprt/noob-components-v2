# Admin shell, router runtime, and host application contract

The current admin architecture has three owners with one-way dependencies: `@noob-naive-ui/admin` provides router-neutral shell, auth presentation, menu, navigation, and preference contracts; `@noob-naive-ui/admin-vue-router` depends on those contracts and owns Vue Router lifecycle integration; the host application depends on both packages and supplies application policy and concrete inputs. Neither shared package owns backend contracts or business pages.

## `@noob-naive-ui/admin`

The admin package owns:

- `AdminShell` and `AdminLoginPage` presentation;
- package-owned Pinia stores for auth presentation state, opaque `MenuOption[]`, router-neutral `AdminShellNavigation`, and local shell preferences;
- router-neutral `AdminShellDestination` values containing a stable host-defined navigation target key and optional canonical plain-object payload;
- page-instance membership, ordering, pending state, close fallback, and immutable page-instance identity, currently represented by `AdminShellTabDescriptor.id`;
- open, activate, close, and heal requests sent through the configured `AdminShellNavigation` controller. `heal` restamps the current browser-history entry in place with an exact committed page instance, so a history revive of a closed tab whose destination already has a committed instance never surfaces a duplicate tab.

The host-authoritative `AdminShellNavigation.active` value controls selected menu and tab state. Destination equality is navigation-target-key plus canonical-payload equality; it does not imply page-instance equality, and several page instances may represent equal destinations. “Page instance” is the domain concept; “tab” is only its current visual representation and remains in some public type names. The Admin shell does not import Vue Router, interpret route records, filter menu visibility, call backend APIs, own session data, or package business pages.

## `@noob-naive-ui/admin-vue-router`

The admin router runtime depends on `@noob-naive-ui/admin` contracts and owns:

- `AdminRouteRegistry`, which binds host-defined navigation target keys to child route records and optional reversible payload codecs;
- conversion between router-neutral destinations and named Vue Router locations;
- generated login and authenticated-shell route records through `createAdminRouter()`;
- configuration of the Admin-shell navigation store with a Vue Router-backed controller;
- auth guards, post-login redirect restoration, logout routing, authenticated navigation-scope entry, stale-history scope repair, and deterministic guard/subscription disposal;
- browser-history metadata needed to reconstruct page-instance descriptors without exposing Vue Router state to the Admin shell.

Registry keys are stable navigation target keys represented as generated Vue Router route names. The runtime treats the bound router and its current route/history state as navigation authority. It does not define host routes, payload meaning, page-instance labels, closability policy, page IDs, navigation-scope IDs, menus, backend integration, or business pages.

## Host application

The host application owns and supplies:

- the Pinia instance and Vue Router history implementation;
- auth effects configured into the admin auth store; callbacks return frontend presentation identity while the package store owns auth-state transitions;
- shell-preference defaults and available locales;
- the final `MenuOption[]`, including hierarchy, visibility, labels, and stable keys;
- route definitions, page components, and reversible payload codecs through `AdminRouteRegistry`;
- `homeDestination`, destination-to-page-instance presentation policy, page-instance ID generation, and navigation-scope ID generation;
- backend clients, session restoration, permissions, application state, and business pages.

The host configures auth, preferences, and menu state before creating and installing the router. It must keep menu keys and route-registry navigation keys aligned where menu selection should navigate to a registered destination.

A navigation scope exists only to isolate browser-history entries across host-defined authenticated-context transitions. It is not an authentication/session-management mechanism, authorization boundary, or security credential; the host decides when a context transition rotates it.

## Current runtime flow

1. The host creates Pinia and configures auth callbacks, preferences, and the final menu tree.
2. The host calls `createAdminRouter()` with history, route registry, home destination, descriptor policy, page-ID factory, and navigation-scope accessor.
3. The admin router runtime generates login/shell routes, installs auth and history-scope guards, and configures the Admin shell's router-neutral navigation store.
4. `AdminShell` renders the host menu unchanged and emits destination-based open, activate, or close requests.
5. The admin router runtime validates and encodes destinations, performs Vue Router navigation, reconstructs the confirmed active page descriptor from route/history authority, and returns it to the shell controller.
6. Auth-state transitions drive router effects: anonymous access to protected routes goes to login; successful login enters a fresh navigation scope at a restored or home destination; logout from a protected route returns to login.

## Demo example

`apps/demo/src/main.ts` demonstrates the host role without a backend. It creates Pinia, owns a navigation-scope ID that rotates across its example authentication transitions, configures fake login/logout callbacks, initializes preferences, builds the final menu, and calls `createAdminRouter()` with `demoRouteRegistry`, dashboard as the home destination, `describeDemoDestination`, UUID page IDs, and the current scope accessor. The demo is an example host, not an additional architecture owner or a source of shared-package policy.

## Consequences

Application assembly is explicit and hosts must supply several policies, but shared packages remain independent of backend DTOs, session models, permission payloads, business routes, and host-specific menu derivation. Router lifecycle complexity stays isolated in `admin-vue-router`, while the Admin shell remains testable and usable through a router-neutral command contract.

# Add Vue Router adapter for AdminShell

## Goal

Extract the demo's generic conversion between router-neutral `AdminShellDestination` values and Vue Router locations into `@noob-naive-ui/admin-vue-router`, an optional reusable adapter package. Keep `@noob-naive-ui/admin` free of Vue Router imports and dependencies.

## Confirmed facts

- `@noob-naive-ui/admin` is intentionally router-neutral. Its public `AdminShellDestination` is data-only, and `useAdminShell()` is command-only.
- The demo currently has a route registry keyed by one string identity shared by `AdminShellDestination.navKey` and Vue Router `route.name`.
- Each demo route definition owns a bidirectional URL codec: `encode` converts destination params to explicit path/query/hash state and `decode` reconstructs canonical destination params from a normalized URL.
- Shared demo helpers convert destination → named Vue Router location and normalized route → destination. History restoration replaces retained descriptor destination data with URL-decoded data.
- `label` and `closable` describe `AdminShellTabDescriptor` presentation/behavior. They are required when the host constructs a new tab descriptor, but they are not Vue Router route properties or URL codec inputs.
- The generic portions are reusable Vue Router integration; route definitions, pages, URL policy, menu construction, authentication, shell-tab presentation, and history lifecycle remain host-owned.
- The monorepo currently contains `@noob-naive-ui/admin` and `@noob-naive-ui/ui`; no router adapter package currently exists.

## Requirements

1. Add the optional workspace package `@noob-naive-ui/admin-vue-router`.
2. The adapter declares `vue`, `vue-router`, and `@noob-naive-ui/admin` as peer dependencies, with Vue/Vue Router also installed as development dependencies for independent local build/test.
3. The adapter must use `AdminShellDestination` from the admin core without introducing router imports into core.
4. Provide a typed registry abstraction keyed by stable string identities where each key is both a shell `navKey` and a Vue Router route name.
5. `defineAdminRouteRegistry(definitions)` returns one bound registry API with `toLocation(destination)`, `fromRoute(route)`, `toRouteRecords()`, and `getDefinition(navKey)` operations.
6. Each router registry item contains only:
   - `route`: a host-owned Vue Router record without `name`;
   - optional `codec`: bidirectional destination-param/URL conversion.
7. `toRouteRecords()` derives each route `name` from its registry key; registry items cannot specify a second route name.
8. The demo must define a separate shell-tab presentation policy keyed by the same nav-key type. That policy supplies `label` and `closable` when constructing `AdminShellTabDescriptor`; these values must not enter generated Vue Router records or URL codecs.
9. The adapter package must not prescribe labels or closability. It may expose generic key typing that lets the host reuse the registry's inferred nav-key union in a separate exhaustive tab-presentation map.
10. Provide a typed per-route bidirectional URL codec:
   - destination params → explicit named Vue Router path/query/hash state;
   - normalized Vue Router route → canonical destination params.
11. `codec` is optional. An omitted codec ignores supplied destination params when producing the URL and reconstructs no params from the URL; it does not throw for non-empty input.
12. URL-decoded destination data remains authoritative. Params ignored by an omitted codec must disappear when the host reconstructs the current destination and must not become durable hidden rendering state.
13. `fromRoute(route)` returns `null` for an unregistered or non-string route name. It lets declared codec validation errors propagate for registered routes with malformed URL state.
14. Bind and validate definitions/codecs once when constructing the registry; forward and reverse operations must use the same registry instance.
15. Preserve host ownership of route records, components, route paths, menus, guards, auth, shell-tab presentation, descriptor creation, and browser-history lifecycle.
16. Migrate the demo to consume the adapter and remove duplicated generic router conversion logic from `App.tsx` / `routes.tsx`.
17. The adapter must not introduce a custom router, mutate host router registration, register routes dynamically, or construct shell tab descriptors.
18. Unknown nav keys throw ordinary clear `Error` instances; no custom public error class or code is introduced.

## Acceptance Criteria

- [ ] `@noob-naive-ui/admin` remains free of Vue Router imports/dependencies.
- [ ] `@noob-naive-ui/admin-vue-router` exposes `defineAdminRouteRegistry` and a bound typed registry API.
- [ ] Router registry items colocate only name-free route records and optional URL codecs; generated records derive names from keys.
- [ ] No adapter-generated route record or URL codec owns `label`, `closable`, tab ID, or shell-tab presentation policy.
- [ ] The demo has a separate exhaustive nav-key-indexed tab presentation map used by its descriptor factory.
- [ ] Omitted codecs silently omit destination params from generated URLs and reconstruct parameterless destinations.
- [ ] Ignored params do not survive URL-authoritative current-route reconstruction.
- [ ] Unregistered routes decode to null; malformed registered route URLs surface their codec validation errors.
- [ ] The demo's route registry uses the adapter without route-specific conversion branches in `App.tsx`.
- [ ] Shell destination params map to explicit URLs through declared codecs, and current routes reconstruct canonical destinations through the adapter.
- [ ] Unknown nav keys fail with ordinary clear errors.
- [ ] Adapter tests cover forward mapping, reverse mapping, omitted-codec behavior, declared-codec validation, unknown destinations, and URL-authoritative reconstruction.
- [ ] Admin core, adapter, and demo typecheck/build; demo browser navigation still works.

## Out of Scope

- Moving Vue Router code into `@noob-naive-ui/admin` core.
- Route registration, dynamic route installation, router guards, auth/session logic, menus, domain pages, shell-tab presentation, descriptor creation, or browser-history persistence policy.
- Adapters for non-Vue routers.
- A typed destination-builder API that tries to replace the core `AdminShellDestination` contract.
- Custom adapter error classes or error-code protocols.

## Resolved decisions

- The adapter is a separate workspace package named `@noob-naive-ui/admin-vue-router`.
- The primary API is one bound object returned by `defineAdminRouteRegistry(definitions)`, not independent helpers receiving the registry repeatedly.
- Router registry items contain a name-free host route record and optional bidirectional URL codec. The map key is the sole route-name/navigation identity.
- Shell-tab `label` and `closable` remain in a separate host-owned, exhaustively nav-keyed presentation policy used by the descriptor factory. They do not enter router records or codecs.
- An omitted codec silently ignores supplied destination params and reconstructs none. URL reconstruction canonically removes those ignored params.
- Unregistered/non-string routes decode to null; malformed URLs for registered routes surface codec validation errors.
- Vue, Vue Router, and admin core are peers; Vue/Vue Router are also local development dependencies.
- The adapter will not add a typed destination-builder API; codec validation remains the runtime boundary for the existing core destination contract.
- Unknown nav keys use ordinary clear `Error` instances.

## Open questions

None.

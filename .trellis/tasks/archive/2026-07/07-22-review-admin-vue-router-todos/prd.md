# Resolve admin Vue Router adapter TODO concerns

## Objective

Implement the agreed navigation boundary: rename router-neutral `AdminShellDestination.params` to `payload`; let each route codec validate and map that payload into URL, browser-history state, or a mix; persist only namespaced tab metadata; and extract generic router/history orchestration into a separate higher-level adapter while preserving registry and host-presentation ownership.

## Ratified decisions

### Destination and Vue Router naming

- `AdminShellDestination.payload` is router-neutral application navigation data and remains a documented plain JSON object rather than a recursive JSON TypeScript type.
- `VueRouterNavParams.params` means only Vue Router dynamic path params. The other concrete navigation fields are `query`, `hash`, and `state`.
- Clean cutover: no `AdminShellDestination.params` or `AdminRouteUrlState` alias remains.

### Per-codec validation and representation

- Every payload-bearing codec owns a Zod `payloadSchema`.
- Forward conversion parses `destination.payload` before `encode`, so encoding receives normalized schema output.
- Reverse conversion parses the raw value returned by `decode(route, historyState)`, so only canonical schema output enters a destination.
- Each codec chooses URL-only, history-only, or mixed representation and defines reconstruction precedence.
- Parameterless routes may omit codec and schema.
- Zod errors propagate unchanged. Schema output remains a plain record or undefined.

### History-state ownership

- Codec-produced state is host-owned destination representation.
- The navigation adapter adds only `id`, `label`, and optional `closable` under the default reserved `_noobAdminShell` namespace.
- The adapter never persists a complete descriptor, `navKey`, or destination payload, avoiding a second implicit destination source.
- The implementation resolves `_noobAdminShell` through a named default and local key variable used by every collision check, write, and read. User configurability is intentionally deferred but remains an additive seam.
- Reserved namespace collisions throw instead of overwriting host state.
- Adapter-owned unknown metadata is validated privately with Zod; core admin gains no persistence parser.
- `structuredClone` replaces JSON stringify/parse for detaching metadata and propagates clone failures.

### Package boundaries

- `AdminRouteRegistry` remains deterministic and owns no live router, history lifecycle, tab presentation, or navigation effects.
- A separate `createAdminShellVueRouterNavigation` factory accepts an existing router, registry, host descriptor factory, and host fallback-ID factory, then returns `AdminShellNavigation`.
- The higher-level adapter does not create/proxy a router, register routes, or install guards.
- Labels, closability, and descriptor presentation remain starter/application-owned.

## Acceptance criteria

- `AdminShellDestination.payload` replaces the old property across core, adapter, demo, tests, and documentation.
- `VueRouterNavParams` exposes optional Vue Router `params`, `query`, `hash`, and `state`.
- `AdminRouteUrlCodec.encode` receives validated canonical payload; `decode` receives normalized route plus current `HistoryState`, and its output is schema-validated.
- Registry tests prove URL-only, history-only, mixed, conflict-precedence, required/optional/defaulted/transformed, and omitted-codec behavior.
- The higher-level adapter reads state through `router.options.history.state`, preserving browser/memory-history parity.
- Codec state survives navigation unchanged except for addition of adapter metadata under `_noobAdminShell`.
- Persisted tab metadata contains only `id`, `label`, and optional `closable`.
- Open, activate, close-with-fallback, close-without-fallback, and close-current replacement semantics remain correct.
- Direct unstamped registered routes receive stable fallback page identity for the same current route/history snapshot.
- The demo retains auth/menu/theme and presentation policy but no generic cloning, history parsing, active restoration, or navigation-request orchestration.
- Browser reports → detail → back/forward preserves exact tab identity/presentation and reconstructs canonical payload through the route codec with no console warnings/errors.

## Dependency requirements

- `@noob-naive-ui/admin-vue-router` declares Vue, Vue Router, `@noob-naive-ui/admin`, and Zod 4 as peers because they cross its public runtime/type boundary.
- Shared development dependencies remain normalized at the workspace root.

## Non-goals

- Creating or wrapping a Vue Router instance.
- Registering routes or guards.
- Moving labels, closability, or application descriptor policy into shared packages.
- Recursively enforcing JSON serializability at the TypeScript or Zod boundary.
- Persisting shell-private `AdminShellTab` fields.
- Exposing a configurable history-state namespace in this change.

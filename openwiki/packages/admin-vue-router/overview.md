---
type: package
title: "@noob-naive-ui/admin-vue-router"
description: The admin router runtime — the only package that imports vue-router; it binds host route definitions to reversible destinations, adapts the shell's navigation controller, and owns auth and history-scope guards.
tags: [admin, vue-router, package, integration]
---

# `@noob-naive-ui/admin-vue-router`

The **admin router runtime**: the integration layer that coordinates Vue Router
navigation and browser history with Admin-shell page instances (the second owner
in [Ownership Contract](../../architecture/ownership-contract.md)). It is the only
package in the workspace that imports `vue-router`.

Peers: `@noob-naive-ui/admin`, `@noob-naive-ui/i18n`, `pinia`, `vue`,
`vue-router`, `zod` (all `catalog:`). It has no runtime dependencies of its own.

## Public surface (`src/index.ts`)

- **Route registry** (`route-registry.ts`): `defineAdminRouteRegistry`,
  `defineAdminRouteUrlCodec`, and types `AdminRouteDefinition`,
  `AdminRouteDefinitions`, `AdminRouteRegistry`, `AdminRouteRegistryNavKey`,
  `AdminRouteUrlCodec`, `RouteReadInput` — see
  [Route registry](route-registry.md).
- **Navigation runtime** (`navigation.ts`):
  `createAdminShellVueRouterRuntime` + types `AdminShellVueRouterRuntime`,
  `AdminShellVueRouterRuntimeOptions` — see
  [Navigation runtime](navigation-runtime.md).
- **Plugin-owned router** (`create-admin-router.ts`):
  `createAdminRouterPlugin`, `ADMIN_DISPOSE_KEY`, and types
  `AdminRouteOverride`, `AdminRouterPlugin`, `CreateAdminRouterOptions` — see
  [Plugin](plugin.md).

## Module map

```text
src/
  index.ts                 public barrel
  route-registry.ts        registry + URL codecs (router-neutral ↔ Vue Router)
  navigation.ts            router-bound shell navigation adapter, scope guard, enterScope
  create-admin-router.ts   factory creating the plugin-owned Router + guards + dispose
```

## Responsibilities and boundaries

Owns:

- binding host-defined navigation target keys to child route records and
  reversible payload codecs;
- conversion between router-neutral destinations and named Vue Router locations;
- generated login and authenticated-shell route records;
- configuration of the Admin-shell navigation store with a Vue Router-backed
  controller;
- auth guards, post-login redirect restoration, logout routing, authenticated
  navigation-scope entry, stale-history scope repair, and deterministic
  guard/subscription disposal (`ADMIN_DISPOSE_KEY`);
- browser-history metadata needed to reconstruct page-instance descriptors
  without exposing Vue Router state to the Admin shell.

Does **not** own: host route definitions, payload meaning, page-instance labels,
closability policy, page IDs, navigation-scope IDs, menus, backend integration,
or business pages. It treats the bound router and its current route/history state
as navigation authority.

## Invariants

- The reserved history-state namespace `"_noobAdminShell"` is package-owned;
  codecs that write state under it are rejected at navigation time
  ("rejects codec collisions with the reserved metadata namespace").
- Internal route names `_noobAdminLogin` and `_noobAdminShell` and the metadata
  namespace `_noobAdminMeta` are package-owned; additional host routes colliding
  with them (by name or path) fail at factory time.
- Auth metadata is namespaced under `_noobAdminMeta` so host metadata merges
  beneath it without collision.

## Tests

Three suites (see [Testing](../../testing.md)):

- `tests/route-registry.test.ts` — registry/codec conversion invariants.
- `tests/navigation.test.ts` — adapter semantics: heal, scope guard, enterScope,
  fallback identity, close-current opens, reserved-state rejection.
- `tests/create-admin-router.test.ts` — generated routes, override validation,
  auth guard behavior, redirect restoration, disposal, Pinia ordering.

## Pages in this section

- [Route registry](route-registry.md)
- [Navigation runtime](navigation-runtime.md)
- [Plugin-owned router](plugin.md)

---
type: concept
title: Admin Navigation Runtime — Vue Router Adapter
description: "The router-bound controller behind AdminShell: persisted tab metadata in history state, open/activate/close/heal semantics, the history-scope guard, and explicit scope entry."
tags: [admin, vue-router, navigation, history-scope]
---

# Admin Navigation Runtime — Vue Router Adapter

`createAdminShellVueRouterRuntime` (`navigation.ts`) builds the
`AdminShellNavigation` controller that the admin package configures into its
navigation store, plus the router lifecycle operations the plugin installs. It is
the bridge between AdminShell's router-neutral requests and Vue Router's
route/history authority.

## Options

```ts
type AdminShellVueRouterRuntimeOptions<TDefinitions> = {
  router: Router;
  registry: AdminRouteRegistry<TDefinitions>;
  describeDestination: (id, destination) => AdminShellTabDescriptor; // host policy
  createPageId: () => string;                                        // host identity factory
  getNavigationScopeId: () => string;                                // host scope accessor
  homeDestination?: AdminShellDestination;                           // required for scope features
};
```

## Persisted history metadata

Each scoped history entry carries adapter metadata under the reserved state key
`"_noobAdminShell"` (constant `DEFAULT_ADMIN_SHELL_HISTORY_STATE_KEY`):

```ts
// persistedAdminShellTabSchema: one tab instance's persisted metadata
{ id: string, label: I18nText, closable?: boolean }
// persistedAdminShellStateSchema: scope + optional tab reconstruction data
{ scopeId: string, tab?: persistedAdminShellTabSchema }
// persistedAdminShellTabStateSchema: persistedAdminShellStateSchema.required({ tab: true })
//   — the complete-metadata variant readPersistedState actually restores
```

- The tab label persists as its **I18nText representation**, so `i18n` keys
  survive restores and render in the current locale after refresh.
- `readPersistedState` validates against the complete-metadata variant and
  returns **`null`** both when validation fails and when `scopeId` differs from
  the current navigation scope — stale-session metadata never restores, and the
  caller falls back to fallback identity (below).
- Tab metadata is optional on the outer schema (absent tab reconstruction data
  is allowed), and required for descriptor restoration.

## The navigation controller

```ts
const navigation: AdminShellNavigation = {
  get active() { return currentDescriptor(); },   // from router + history authority
  async handleNavigation(request) { ... },
};
```

`currentDescriptor()` resolves the canonical descriptor:

1. `registry.fromRoute(route, historyState)` → destination (null for
   non-admin routes).
2. Persisted `tab` metadata (validated, current scope) → descriptor with the
   destination attached.
3. Otherwise **fallback identity**: a stable page id derived from
   `history.state.position + fullPath` cached in `fallbackPageIds`, described via
   `describeDestination` — so direct/unstamped routes get deterministic identity
   across leave-and-return. This same fallback path also covers **malformed tab
   metadata**: when the persisted tab fails `persistedAdminShellTabStateSchema`
   (or its scope mismatches), `readPersistedState` returns null and
   `currentDescriptor` reconstructs the descriptor as
   `describeDestination(createPageId(), destination)` with the id cached per
   entry key (tests: "provides stable fallback identity for one unstamped route
   snapshot", "restores the same fallback identity after leaving and returning
   by browser history", "malformed-metadata fallback").

`handleNavigation(request)`:

- **heal**: when the current descriptor differs from the committed destination
  but represents the same page (`isCurrentPage` compares resolved `fullPath`),
  restamps the current history entry in place with the committed descriptor
  (`router.push(..., { replace: true })`); otherwise no-ops so payload-bearing
  destinations are never silently redirected.
- **open / activate**: converts the request into the exact descriptor that must
  become active (`descriptorForRequest`) and navigates with
  `toScopedLocation(descriptor)` — `force: true` plus the stamped state; open
  requests with `closeCurrent` use `replace`, so the current entry is replaced
  rather than appended (test: "replaces current history entry for close-current
  opens").
- **close**: no-ops when the requested closing id is not the current active
  descriptor (test: "does not add history when closing an inactive tab"); only
  the matching close executes the fallback navigation.
- Always returns `{ active: currentDescriptor() }` so the shell records the
  host-confirmed page instance.

`toScopedLocation(descriptor)` stamps the current scope id and the descriptor's
persisted tab metadata into the location state, throwing on codec collisions with
the reserved namespace.

## History-scope guard (`installScopeGuard`)

```mermaid
flowchart TD
    Nav["router.beforeEach(to)"] --> InFlight{replacementInFlight?}
    InFlight -->|yes| Allow1["clear flag, allow"]
    InFlight -->|no| Admin{registry.fromRoute(to)?}
    Admin -->|"null (public route)"| Allow2["allow untouched"]
    Admin -->|destination| Pending{pendingScopeEntry?}
    Pending -->|yes| Allow3["consume entry, allow"]
    Pending -->|no| Scope{history scopeId == current?}
    Scope -->|yes| Allow4["allow"]
    Scope -->|no| Repair["replace with cached home descriptor for this scope"]
```

- The guard acts **only on routes recognized by the registry**; public and
  unrelated routes pass through untouched (test: "bypasses non-admin routes (e.g.
  /login) without repairing").
- A current-scope entry proceeds; a **stale or missing scope** is replaced with
  **one stable home descriptor cached per scope** (`homeDescriptors`), so Back
  navigation across an authenticated-context transition lands on a stable home
  instead of the previous session's page. The replacement navigation is issued
  with exact options `{ name: home.nav.navKey, replace: true, force: true,
  state: { _noobAdminShell: { scopeId: current, tab: home.id/label/closable } } }`.
- Loop prevention is internal: the replacement navigation clears
  `replacementInFlight` on re-entry (test: "prevents replacement loops after one
  repair").
- `assertHomeConfigured()` guards both scope features: `installScopeGuard` **and
  `enterScope`** throw when the runtime was created without `homeDestination`
  (tests: "throws without homeDestination" for both).

## `enterScope(destination)`

Called after login or scope rotation to establish the first protected route in a
new scope: creates a page identity and descriptor, records it as
`pendingScopeEntry`, and `router.replace`s the scoped location so the guard
admits it without mistaking it for stale history (test: "admits an explicit scope
entry via enterScope"). Throws when `homeDestination` was not configured (shared
`assertHomeConfigured`). The plugin's auth-transition subscription drives this
after successful login ([plugin page](plugin.md)).

## Tests — `tests/navigation.test.ts`

Memory-router harness (`createHarness`) with a registry (`dashboard` +
codec-bearing `detail`) and deterministic scope `"scope-1"`:

- heal: restamps a stale stamped entry in place; no-ops when the committed
  destination is a different page; no-ops when the current entry already matches.
- scope guard: allows forward navigation with the right scope; replaces
  stale-scope and missing-scope entries during Back navigation; stamps the
  configured home descriptor; bypasses non-admin routes; prevents replacement
  loops; admits explicit scope entries; removal function unregisters; throws
  without `homeDestination`.
- fallback identity stability and refresh; inherited route-definition-key
  rejection; persisted metadata restore and malformed-metadata fallback;
  activate/close through exact fallback descriptors; no history on inactive
  close; existing Dashboard identity preserved when restamping; close-current
  opens replace; reserved-namespace codec rejection.

## Related

- [admin-vue-router overview](overview.md)
- [Route registry](route-registry.md) — `toLocation`/`fromRoute`/`toRouteRecords`
- [Plugin](plugin.md) — installs the scope guard and drives `enterScope`
- [Admin shell](../admin/shell.md) — the request contract this controller answers

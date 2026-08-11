---
type: concept
title: Admin Navigation and Menu Runtime Stores
description: The configure-once Pinia stores holding the non-serializable router-neutral navigation controller and the host-supplied menu tree, and how admin-vue-router binds into them.
tags: [admin, pinia, navigation, menu]
---

# Navigation and Menu Runtime Stores

Two small configure-once Pinia stores (`packages/admin/src/stores/navigation.ts`
and `stores/menu.ts`) carry the **host-supplied runtime configuration** that
AdminShell consumes reactively. They share a deliberate design: non-serializable
values are kept out of Pinia's serializable state tree, and each store accepts
configuration exactly once per Pinia instance.

## `useAdminShellNavigationStore` — the plugin↔shell seam

```ts
const store = useAdminShellNavigationStore();
store.configure(nav);            // once, by the host (or the router plugin)
const nav = store.navigation;    // computed getter; null before configure
```

- Holds the `AdminShellNavigation` controller (a non-serializable object with a
  getter `active` and `handleNavigation(request)`) in a `shallowRef`
  **outside the returned state tree** — Pinia never serializes it
  (tests assert the controller is absent from `pinia.state.value`).
- Exposes it through a `computed` getter so consumers react to
  configuration/boundary changes.
- `configure` silently ignores subsequent calls (configure-once per Pinia
  instance; a fresh Pinia gets a fresh store).
- **Install-time binding**: `admin-vue-router`'s `createAdminRouterPlugin`
  calls `useAdminShellNavigationStore(pinia).configure(navigationRuntime.navigation)`
  during plugin install, wiring the Vue Router-backed adapter into the shell.
- Consumers: `AdminShell` (reads `nav.navigation` for the active descriptor and
  passes `getNavigation` into `useAdminShellTabs`), `AdminShellTabbar` (reads
  `nav.navigation?.active?.id` for the selected tab), and the shell's
  `useGlobalI18nSync`/menu watchers.

The `AdminShellNavigation` contract (defined in `components/admin-shell.tsx`,
[Shell page](shell.md)) is: `active: AdminShellTabDescriptor | null` plus
`handleNavigation(request): Promise<{ active }>` for `open` / `activate` /
`close` / `heal` requests.

## `useAdminShellMenuStore` — the host menu tree

```ts
const store = useAdminShellMenuStore();
store.configure(menuOptions);    // once, by the host
const options = store.options;   // reactive Naive UI MenuOption[]
```

- Holds an opaque `AdminMenuTree` (`MenuOption[]`) in a `shallowRef`,
  configure-once.
- AdminShell renders the options **unchanged** through `useLayoutMenu` from
  `pro-naive-ui` (vertical mode) and hides the sidebar entirely when the tree is
  absent or empty (`showSidebar={Boolean(menuOptions?.length)}`).
- The host keeps menu option `key`s aligned with route-registry navigation keys so
  menu selection navigates to a registered destination; AdminShell's menu watcher
  turns `activeKey` changes into `shellContext.navigate({ navKey })` requests
  (guarded so programmatic navigation does not re-navigate).

## Tests

- `packages/admin/tests/admin-shell.test.tsx`, `describe("useAdminShellNavigationStore")`
  (5 tests): returns null navigation before configuration; keeps the controller
  out of serializable Pinia state; configures once per Pinia instance; isolates
  configuration between Pinia instances; reactively reflects navigation active
  changes.
- Menu store behavior is covered by shell render tests: no sidebar when menu
  input is absent or empty, and unchanged menu composition in the authenticated
  layout.

## Related

- [Admin overview](overview.md)
- [admin-vue-router plugin](../admin-vue-router/plugin.md) (binds the navigation
  controller)
- [Shell page-instance state machine](shell.md) (consumes the controller)

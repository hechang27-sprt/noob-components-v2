# dolphin-admin/vue-admin and jekip/naive-ui-admin navigation architecture

Research date: 2026-07-16. This is an inspection of each repository's current `main` source, not its README. It is evaluated for a router-neutral `AdminShell` whose local state owns only open-tab membership and order.

## Source freshness

| Repository | `main` source inspected | Navigation-code evidence | Assessment |
|---|---|---|---|
| [dolphin-admin/vue-admin](https://github.com/dolphin-admin/vue-admin) | [`62ee0cca79f88b8da7ebc960570c6625862d9df3`](https://github.com/dolphin-admin/vue-admin/commit/62ee0cca79f88b8da7ebc960570c6625862d9df3), 2024-01-13 | latest commit only updates `pnpm-lock.yaml`; [sidebar menu](https://github.com/dolphin-admin/vue-admin/blob/main/src/layouts/BaseLayout/components/Sidebar/components/Menu/index.vue) last changed 2023-12-02 ([commit](https://github.com/dolphin-admin/vue-admin/commit/2b9af08f17de1697c3c083c4f25d45c79e9e70bf)) | historical small-app example, not maintained architecture to adopt wholesale |
| [jekip/naive-ui-admin](https://github.com/jekip/naive-ui-admin) | [`3a469f1aca0b1b9d47d7c9e771c26dce058ea345`](https://github.com/jekip/naive-ui-admin/commit/3a469f1aca0b1b9d47d7c9e771c26dce058ea345), 2026-01-19 | latest commit only updates README. [Menu](https://github.com/jekip/naive-ui-admin/blob/main/src/layout/components/Menu/index.vue) last changed 2023-04-23 ([commit](https://github.com/jekip/naive-ui-admin/commit/5d891c1f44c0dea0924f5ac06df6728779ae55c2)); [TagsView](https://github.com/jekip/naive-ui-admin/blob/main/src/layout/components/TagsView/index.vue) 2023-08-10 ([commit](https://github.com/jekip/naive-ui-admin/commit/347cd917357a690b678569b79d9b5d905780c2c5)); [iframe](https://github.com/jekip/naive-ui-admin/blob/main/src/views/iframe/index.vue) 2022-03-12 ([commit](https://github.com/jekip/naive-ui-admin/commit/12e62d117999080754d293e0dbcd97f768098ab4)) | current repository source, but navigation patterns are stale |

## dolphin-admin/vue-admin

### Ownership and data flow

- [router/index.ts](https://github.com/dolphin-admin/vue-admin/blob/main/src/router/index.ts) creates Vue Router from [router/routes.ts](https://github.com/dolphin-admin/vue-admin/blob/main/src/router/routes.ts). `afterEach` sets the title and invokes [`processRouteTag`](https://github.com/dolphin-admin/vue-admin/blob/main/src/router/processor.ts).
- `processRouteTag(to)` skips `to.meta.dismissTab`; otherwise it adds `{ href: to.path, label: to.meta.title, icon }` to the Pinia [tab store](https://github.com/dolphin-admin/vue-admin/blob/main/src/store/tab.ts). The store deduplicates membership by `href`.
- The base layout only composes [Sidebar, Tabs, and Content](https://github.com/dolphin-admin/vue-admin/blob/main/src/layouts/BaseLayout/index.vue); [Content](https://github.com/dolphin-admin/vue-admin/blob/main/src/layouts/BaseLayout/components/Content/index.vue) is `RouterView`.
- [Tabs](https://github.com/dolphin-admin/vue-admin/blob/main/src/layouts/BaseLayout/components/Tabs/index.vue) styles active tabs from `route.path === tagItem.href` and activates with `router.push(tagItem.href)`.
- The [sidebar menu](https://github.com/dolphin-admin/vue-admin/blob/main/src/layouts/BaseLayout/components/Sidebar/components/Menu/index.vue) separately watches `route.name`, puts it in `selectedKey`, calls `NMenu.showOption(route.name)`, and binds it to `NMenu.value`. Menu leaf activation is `router.push({ name: key })`.

### Close semantics

`Tabs/index.vue:handleCloseTab` navigates before removing membership when the closed tab is current: next sibling, or prior sibling if closing the final tab. A lone tab causes navigation to `/`, then removal. `CLEAR_ALL_TABS` clears membership and pushes `/`. There is neither async/failure recovery nor router neutrality.

### External/iframe

No external/iframe destination model was found in current [routes](https://github.com/dolphin-admin/vue-admin/blob/main/src/router/routes.ts), sidebar menu, tab store, or tab bar. The unrelated `BrowserUtils.openNewWindow(REPO_GITHUB_URL)` in [BaseLayout](https://github.com/dolphin-admin/vue-admin/blob/main/src/layouts/BaseLayout/index.vue) is not a navigation model.

### Transferable vs unsafe

**Borrow:** selected menu identity is derived after authoritative route change, not maintained as menu-click optimism.

**Do not borrow:** components call `useRoute`/`useRouter`, and both menu and tab independently project route identity. A router-neutral shell should receive one host-owned active descriptor, not derive route projections itself.

## jekip/naive-ui-admin

### Router/menu ownership

- [router/index.ts](https://github.com/jekip/naive-ui-admin/blob/main/src/router/index.ts) owns constant routes. [router/guards.ts](https://github.com/jekip/naive-ui-admin/blob/main/src/router/guards.ts) obtains authorized routes and adds them to Vue Router.
- The [async-route Pinia store](https://github.com/jekip/naive-ui-admin/blob/main/src/store/modules/asyncRoute.ts) owns menu routes, dynamically added routes, and keep-alive names. It uses [router/generator.ts](https://github.com/jekip/naive-ui-admin/blob/main/src/router/generator.ts) and writes the same generated routes into both `routers` and `menus`.
- [Menu/index.vue](https://github.com/jekip/naive-ui-admin/blob/main/src/layout/components/Menu/index.vue) builds NMenu options through [`generatorMenu`](https://github.com/jekip/naive-ui-admin/blob/main/src/utils/index.ts), watches `currentRoute.fullPath`, derives `selectedKeys` as `currentRoute.meta.activeMenu ?? currentRoute.name`, and derives parent expansion from `currentRoute.matched`.
- Menu clicks are imperative: `window.open(key)` when `key` matches `/http(s)?:/`, otherwise `router.push({ name: key })`.

**Worth borrowing:** explicit `activeMenu` is a useful application-level menu-key override for a detail route whose highlighted menu is its list parent.

**Unsafe:** the menu reconstructs active identity separately from the tab component; it rebuilds menu options per route navigation; and it encodes externalness in the option key. `meta.externalLink` is declared but not consumed by this actual click path.

### Tabs: membership, active key, activation, closing

- [TagsView/index.vue](https://github.com/jekip/naive-ui-admin/blob/main/src/layout/components/TagsView/index.vue) initializes `state.activeKey` from `route.fullPath`. Its immediate `route.fullPath` watcher assigns `activeKey`, adds a simplified `RouteItem` to the [tabs Pinia store](https://github.com/jekip/naive-ui-admin/blob/main/src/store/modules/tabsView.ts), and scrolls the selected tag into view.
- Membership key is `fullPath`; `RouteItem` copies `fullPath`, path, name, params, query, hash, and meta. The UI component persists its list to local storage, restores it at setup, and reconciles it against `router.getRoutes()`.
- Tab activation (`goPage`) first assigns `state.activeKey = fullPath`, then navigates through `useGo`/router.
- `removeTab` deletes membership; when closing the current tab it first assigns `activeKey` to the last remaining tab and pushes it. `closeLeft`, `closeRight`, and `closeOther` mutate membership, preassign the key, then call `router.replace`. `closeAll` preserves `meta.affix` items then replaces the home route.
- [tabsView.ts](https://github.com/jekip/naive-ui-admin/blob/main/src/store/modules/tabsView.ts) exposes membership mutations: deduplicated `addTab`, individual close, left/right/other close, and close-all retaining affixed tabs.

**Borrow:** one owner should maintain tab membership and ordering; tab identity must be stable; closing the active tab must select an explicit fallback destination.

**Do not borrow:** three active-state projections (`route.fullPath`, `TagsView.state.activeKey`, and menu `selectedKeys`); active UI changes before router navigation succeeds; app-wide Pinia/local-storage tab state; no failure restoration. These violate the requested single host-owned active navigation source and shell-local membership.

### Iframe and external representation

[Jekip's route type](https://github.com/jekip/naive-ui-admin/blob/main/src/router/types.ts) declares `meta.frameSrc` and `meta.externalLink`.

- **Iframe:** [`asyncImportRoute`](https://github.com/jekip/naive-ui-admin/blob/main/src/router/generator.ts) maps a route with no component but `meta.frameSrc` to special `IFRAME`. That maps to [views/iframe/index.vue](https://github.com/jekip/naive-ui-admin/blob/main/src/views/iframe/index.vue), which takes `useRoute().meta.frameSrc` and renders `<iframe :src="frameSrc">`. It stays an ordinary app route, so current route watchers give it an ordinary menu/tab lifecycle.
- **External:** `externalLink` has no observed current-source consumer. The menu opens only an `http(s)` **key**. But [`generatorMenu`](https://github.com/jekip/naive-ui-admin/blob/main/src/utils/index.ts) normally emits `key: info.name`, so an external item needs special/malformed data. It is menu-only: opening it changes neither route nor active tab/membership.

## Recommendation for the planned router-neutral AdminShell

1. The application should expose exactly one named active-navigation descriptor, e.g. `{ key, label, icon, menuKey? }`, derived from the authoritative route **after successful navigation**. Both NMenu selection and tab active value use this descriptor's key.
2. `AdminShell` receives navigation callbacks; it does not receive `Router`, route objects, `RouterLink`, or URL policy. The application maps shell keys to Vue Router and updates the descriptor from Vue Router's confirmed state, covering direct URLs and browser history as well as shell clicks.
3. The shell alone records/refreshes open-tab membership and ordering when the descriptor changes. Closing a current tab requests a defined fallback navigation via callback and preserves the shell's existing async error behavior.
4. Treat iframe content as an internal app destination with stable key/route if it must participate in tabs. Treat new-window external destinations as a host callback/open policy outside active-tab membership; no active key should claim an external link is current.
5. A polymorphic internal/external/iframe Link, if ever needed, belongs in the application/starter integration layer. It must not make `@noob-naive-ui/admin` router-aware. Do not nest `RouterLink` inside the tab activation surface by default: it can bubble to NTab's own activation handler (see `naive-tab-link-semantics.md`).

## Source index

### dolphin-admin/vue-admin

- [src/router/index.ts](https://github.com/dolphin-admin/vue-admin/blob/main/src/router/index.ts)
- [src/router/processor.ts](https://github.com/dolphin-admin/vue-admin/blob/main/src/router/processor.ts)
- [src/router/routes.ts](https://github.com/dolphin-admin/vue-admin/blob/main/src/router/routes.ts)
- [src/store/tab.ts](https://github.com/dolphin-admin/vue-admin/blob/main/src/store/tab.ts)
- [src/layouts/BaseLayout/index.vue](https://github.com/dolphin-admin/vue-admin/blob/main/src/layouts/BaseLayout/index.vue)
- [src/layouts/BaseLayout/components/Tabs/index.vue](https://github.com/dolphin-admin/vue-admin/blob/main/src/layouts/BaseLayout/components/Tabs/index.vue)
- [src/layouts/BaseLayout/components/Sidebar/components/Menu/index.vue](https://github.com/dolphin-admin/vue-admin/blob/main/src/layouts/BaseLayout/components/Sidebar/components/Menu/index.vue)
- [src/layouts/BaseLayout/components/Content/index.vue](https://github.com/dolphin-admin/vue-admin/blob/main/src/layouts/BaseLayout/components/Content/index.vue)

### jekip/naive-ui-admin

- [src/router/index.ts](https://github.com/jekip/naive-ui-admin/blob/main/src/router/index.ts)
- [src/router/guards.ts](https://github.com/jekip/naive-ui-admin/blob/main/src/router/guards.ts)
- [src/router/generator.ts](https://github.com/jekip/naive-ui-admin/blob/main/src/router/generator.ts)
- [src/router/types.ts](https://github.com/jekip/naive-ui-admin/blob/main/src/router/types.ts)
- [src/store/modules/asyncRoute.ts](https://github.com/jekip/naive-ui-admin/blob/main/src/store/modules/asyncRoute.ts)
- [src/store/modules/tabsView.ts](https://github.com/jekip/naive-ui-admin/blob/main/src/store/modules/tabsView.ts)
- [src/layout/components/Menu/index.vue](https://github.com/jekip/naive-ui-admin/blob/main/src/layout/components/Menu/index.vue)
- [src/layout/components/TagsView/index.vue](https://github.com/jekip/naive-ui-admin/blob/main/src/layout/components/TagsView/index.vue)
- [src/utils/index.ts](https://github.com/jekip/naive-ui-admin/blob/main/src/utils/index.ts)
- [src/views/iframe/index.vue](https://github.com/jekip/naive-ui-admin/blob/main/src/views/iframe/index.vue)

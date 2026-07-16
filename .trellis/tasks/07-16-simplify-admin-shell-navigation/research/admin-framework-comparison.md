# Naive UI admin navigation architecture comparison

Research date: 2026-07-16. Repositories were selected from <https://github.com/naive-ui/awesome-naive#admin-projects-using-naiveui> and inspected at pinned current branch heads. Exact source traces live in the sibling research files.

## Compared projects

| Project | Active selection | Open-tab membership | Menu/tab activation | External links | Iframe pages |
|---|---|---|---|---|---|
| [Soybean Admin](https://github.com/honghuangdc/soybean-admin/tree/3d3613f20cd4add3cd20fd6cc884abead165c6d2) | Current route name; optional `meta.activeMenu` override | Pinia tab store updated from a route watcher | Controlled callbacks to router; tab labels are plain text | `meta.href` opens a new window and returns to prior route | Stable internal `/iframe-page/:url` route |
| [Robot Admin](https://github.com/ChenyCHENYU/Robot_Admin/tree/2210d4758e1ef625d17c2526460df815e38fa41c) | Current route path | Extracted TagsView composable watches route and owns tags | Controlled callbacks; no tab links | Declared metadata is incomplete in current flow | Preview routes are documentation embedding, not shell iframe tabs |
| [Vue Naive Admin](https://github.com/zclzone/vue-naive-admin/commit/cebfc605bdde06505060b3ea8096cdf8c64bffb3) | Current route; optional parent menu key | Pinia store updated in router `afterEach` | Controlled `NMenu`/`NTab` callbacks; no nested links | User may `window.open` without changing active route | External URL is normalized to a stable internal iframe route |
| [Admin Work](https://github.com/qingqingxuan/admin-work/commit/17f6fc1ce0d269f9029d5997a6daa326ffe68fa4) | Current route full path | Visited-route store updated by router guard | Controlled menu/tab callbacks; no nested links | Native menu-only anchor; excluded from tabs | None found |
| [Dolphin Admin](https://github.com/dolphin-admin/vue-admin/commit/62ee0cca79f88b8da7ebc960570c6625862d9df3) | Current route | Pinia store updated in `afterEach` | Controlled callbacks | No navigation model found | None found |
| [Naive UI Admin](https://github.com/jekip/naive-ui-admin/commit/3a469f1aca0b1b9d47d7c9e771c26dce058ea345) | Current route plus separate local active projections | Pinia/local-storage store updated by route watcher | Controlled callbacks; optimistic local active writes | Key-encoded `window.open`; incomplete metadata path | Stable internal route with `meta.frameSrc` |
| [Naive UI Pro](https://github.com/Zheng-Changfu/naive-ui-pro/tree/53b926676eb26f08e4130ac482f14df1593b7ba1) | Current route matched-chain menu key; visited-route active index | Generic router visited-routes plugin specialized by admin tabs plugin | Controlled menu/custom-tab callbacks; no nested links | Route `meta.link` policy opens new window and returns to prior route | `meta.linkMode = "iframe"` keeps navigation as a local route and injects iframe rendering |

Dolphin's navigation code is dormant since 2023–2024, and Jekip's subsystem was last materially changed in 2022–2023. They are useful counterexamples, not current architecture authorities.

## Strong convergence

### 1. None of the inspected tab bars embeds `RouterLink`

All seven use a clickable tab control and invoke router navigation through a callback. This aligns with Naive UI's own `NTab` event ownership: a nested link otherwise bubbles into the outer tab activation handler unless deliberately suppressed.

**Borrow:** controlled tab activation.

### 2. Successful route state drives active rendering and tab discovery

The better implementations derive menu selection from the current route and add/update visited tabs after a route transition or from a watcher observing the resolved route. Direct URLs and browser history therefore enter the same path as menu/tab clicks.

**Borrow:** one host-authoritative active descriptor derived from confirmed router state. Menu/tab actions request navigation; they do not optimistically select themselves.

### 3. Open-tab membership has one owner

Every project separates the current route from a collection of visited/open tabs. Most put membership in a global Pinia store because they are monolithic applications. For this library boundary, the same invariant is better implemented by the existing `AdminShell`-local map/order state.

**Borrow:** one membership/order owner and explicit close fallback selection. Do not borrow global persistence or route objects in tab records.

### 4. Menu identity may differ from tab identity

Soybean's `meta.activeMenu`, Vue Naive Admin's parent-key override, and Naive UI Pro's deepest matched menu path support detail/hidden routes whose sidebar highlight should remain on a parent/list menu item. This is not competing state when both identities are fields of one route-derived descriptor.

**Borrow:** allow an optional `menuKey` alongside the active tab `key`:

```ts
type AdminShellActiveNavigation = AdminShellTabInput & {
  menuKey?: string;
};
```

`NMenu.value` uses `menuKey ?? key`; `NTabs.value` and open-tab membership use `key`.

### 5. External-window and iframe destinations are different lifecycle classes

The coherent implementations follow this split:

- a new-window external link does not change the host route and therefore does not become an active/open local tab;
- an iframe that participates in shell tabs is represented by a stable internal application route whose page renders the iframe.

Vue Naive Admin is the clearest example: it converts an external source URL into a local `/iframe/...` route when embedded behavior is chosen. Soybean and Jekip use the same internal-route pattern for iframe pages.

**Borrow:** normalize iframe-backed content into an internal destination before it reaches the shell. Keep external-window policy application-owned and outside local tab membership.

### 6. Destination metadata beats a universal rendering component

No inspected framework needs one component that renders `RouterLink`, `<a>`, or iframe based on loose parameters. They classify destinations in route/menu metadata and choose behavior at the application boundary. Naive UI Pro makes this especially explicit with router-level `meta.link` plus `linkMode: "newWindow" | "iframe"`; menu and tab controls still issue ordinary navigation requests.

**Borrow:** explicit destination policy in the starter/application if needed. Do not add router or iframe policy to `@noob-naive-ui/admin`. A small application link renderer remains possible later for repeated anchor presentation, but it should not own active state or tab lifecycle. Prefer a stable application iframe route over Naive UI Pro's more complex matched-component mutation.

## Anti-patterns observed

- Robot's grouped menu can invoke both an emitted select callback and `router.push` for one click.
- Vue Naive Admin and Jekip optimistically set local active-tab state before router navigation succeeds.
- Jekip maintains route, menu, and tab active projections separately.
- Several projects store full Vue Router route objects or `fullPath` data in global persisted tab stores.
- Jekip encodes externalness in a menu key; Robot declares external metadata without a complete consumer.

These patterns create the same duplicate authority and drift risk this task is intended to remove.

## Recommended architecture for this project

1. Keep one stable router-neutral navigation adapter supplied by the application.
2. Expose one route-derived active descriptor containing tab `key`/presentation and optional `menuKey`.
3. Bind menu and tab selected values directly to that descriptor.
4. Send internal menu and tab activation through one host callback.
5. Continue recording open tabs only when the host's active descriptor changes.
6. Keep open-tab membership/order/pending operations local to `AdminShell`.
7. Treat external-window items as menu-only and iframe-backed pages as internal routes.
8. Do not embed `RouterLink` in `NTab` and do not create a polymorphic shared-package `Link`.

## Detailed evidence

- [`upstream-navigation-architecture.md`](./upstream-navigation-architecture.md): Soybean Admin and Robot Admin.
- [`vue-naive-admin-navigation-architecture.md`](./vue-naive-admin-navigation-architecture.md): Vue Naive Admin.
- [`admin-work-navigation-architecture.md`](./admin-work-navigation-architecture.md): Admin Work.
- [`dolphin-jekip-navigation-architecture.md`](./dolphin-jekip-navigation-architecture.md): Dolphin Admin and Naive UI Admin.
- [`naive-tab-link-semantics.md`](./naive-tab-link-semantics.md): Naive UI `NTab` nested-link event behavior.
- [`naive-ui-pro-navigation-architecture.md`](./naive-ui-pro-navigation-architecture.md): Naive UI Pro's router plugin, link policy, menu, and tabs.

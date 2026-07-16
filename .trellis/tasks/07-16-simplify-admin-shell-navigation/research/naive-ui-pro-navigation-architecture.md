# `Zheng-Changfu/naive-ui-pro` link and navigation architecture

Research date: 2026-07-17. Inspected `main` tree [`53b926676eb26f08e4130ac482f14df1593b7ba1`](https://github.com/Zheng-Changfu/naive-ui-pro/tree/53b926676eb26f08e4130ac482f14df1593b7ba1).

## Architecture

The project extends Vue Router through a plugin pipeline rather than wrapping links. [`packages/router/src/create-router.ts`](https://github.com/Zheng-Changfu/naive-ui-pro/blob/53b926676eb26f08e4130ac482f14df1593b7ba1/packages/router/src/create-router.ts) accepts `plugins`, installs them against one router, scopes their guards in a Vue effect scope, and provides cleanup/unmount hooks. [`src/router/index.ts`](https://github.com/Zheng-Changfu/naive-ui-pro/blob/53b926676eb26f08e4130ac482f14df1593b7ba1/src/router/index.ts) composes route title, breadcrumbs, visited routes, links, keep-alive, refresh, permissions, menus, nested rendering, and application tabs as separate plugins.

This is router infrastructure, not a router-neutral shell boundary.

## Menu flow

[`n-menu-plugin.ts`](https://github.com/Zheng-Changfu/naive-ui-pro/blob/53b926676eb26f08e4130ac482f14df1593b7ba1/packages/router/src/plugins/n-menu-plugin.ts) transforms authorized route records into `MenuOption[]` whose keys are resolved route `fullPath` values. It exposes `router.buildMenus()`.

[`src/components/layout/index.vue`](https://github.com/Zheng-Changfu/naive-ui-pro/blob/53b926676eb26f08e4130ac482f14df1593b7ba1/src/components/layout/index.vue):

- derives layout menu slices through `useLayoutMenu`;
- watches `route.path` and chooses the deepest `route.matched` path present in menu keys, allowing a detail route to highlight an ancestor menu item;
- binds the resulting `activeKey` into the menu layouts;
- sends every `NMenu @update:value` to one `pushTo(path)` callback;
- restores `activeKey` to `route.path` when `router.push` reports a navigation failure.

It does not render `RouterLink` inside menu labels.

## Tab flow

[`visited-routes-plugin.ts`](https://github.com/Zheng-Changfu/naive-ui-pro/blob/53b926676eb26f08e4130ac482f14df1593b7ba1/packages/router/src/plugins/visited-routes-plugin.ts) owns an ordered array of normalized Vue Router routes and `activeIndex`. A router `afterEach` adds the confirmed route. Interceptor hooks allow application plugins to reject, transform, move, or react to add/remove operations.

[`src/router/plugins/tabs-plugin.ts`](https://github.com/Zheng-Changfu/naive-ui-pro/blob/53b926676eb26f08e4130ac482f14df1593b7ba1/src/router/plugins/tabs-plugin.ts) specializes that generic visited-route collection for admin tabs: layout-only filtering, `hideInTabs`, fixed tabs, cache cleanup, and optional persistence.

[`src/components/layout/tabs/index.vue`](https://github.com/Zheng-Changfu/naive-ui-pro/blob/53b926676eb26f08e4130ac482f14df1593b7ba1/src/components/layout/tabs/index.vue) renders custom `<div>` tabs, not `NTab` or `RouterLink`. Clicking sets `activeIndex`; a watcher then calls `router.push` for the selected route. Close and pin controls stop propagation.

This contains a weaker point: tab selection updates `activeIndex` before navigation, and the watcher does not restore it on router failure. The route completion path eventually reselects a successful route, but a rejected transition can leave temporary or persistent drift. The planned `AdminShell` callback/await/error behavior is stronger.

## Link policy

[`link-plugin.tsx`](https://github.com/Zheng-Changfu/naive-ui-pro/blob/53b926676eb26f08e4130ac482f14df1593b7ba1/packages/router/src/plugins/link-plugin.tsx) augments route metadata:

```ts
interface RouteMeta {
  link?: string | true;
  linkMode?: "newWindow" | "iframe";
}
```

`link: string` supplies an external URL; `link: true` interprets the current route path as the URL. A router `beforeEach` applies the destination policy:

- `newWindow`: calls configurable `openInNewWindow(url)` and redirects back to the previous route, so no local tab becomes active;
- `iframe`: temporarily replaces the matched route's component with a built-in iframe component and stores the iframe source/render function in internal route metadata, so the navigation completes as an ordinary local route and enters visited tabs.

The iframe renderer is injectable. The application supplies its own [`IframeContainer`](https://github.com/Zheng-Changfu/naive-ui-pro/blob/53b926676eb26f08e4130ac482f14df1593b7ba1/src/router/index.ts), while the router package provides a basic default.

There is no polymorphic `Link` component choosing between `RouterLink`, anchor, and iframe. Destination behavior is declarative route metadata handled by routing policy.

## Worth borrowing

1. **Separate destination description from rendering controls.** Explicit `linkMode` is clearer than inferring behavior from URL strings or component parameters.
2. **Treat links as host navigation policy.** Menu and tabs continue to request normal route navigation; the router integration decides whether that means internal navigation, new-window side effect, or iframe-backed content.
3. **New-window links do not enter local tab state.** The guard returns to the prior route.
4. **Iframe content participates as an ordinary resolved route.** This agrees with Soybean, Vue Naive Admin, and Jekip.
5. **Ancestor menu selection derives from the matched route chain.** This supports detail routes without a second independently synchronized active-menu store. In the router-neutral shell contract this can be normalized to `active.menuKey` by the host.
6. **Visited-route behavior can have policy hooks.** The generic interceptor design is useful conceptually, but `AdminShell` already has concrete filtering/close requirements; exposing a plugin system would be unnecessary abstraction now.

## Do not borrow directly

- Do not move the router plugin system into `@noob-naive-ui/admin`; it is intentionally coupled to Vue Router route objects, guards, metadata, and component records.
- Do not store full normalized route objects in shell-local tab state.
- Do not mutate `to.matched` component records during navigation merely to render iframe content. An application-owned stable iframe route/page is simpler and easier to reason about.
- Do not copy optimistic `activeIndex` selection without navigation-failure rollback.
- Do not copy the `localStorage` recursion sentinel used when a route path doubles as an external URL; resolve destination descriptors explicitly before shell integration.

## Effect on the current design choice

This project reinforces controlled callbacks rather than designs 2 or 3:

```text
menu/tab control
  → router-neutral navigation request
  → application/router destination policy
  → confirmed route
  → active descriptor + shell tab recording
```

The useful addition is not a polymorphic `<Link>`. It is an application-owned destination policy, potentially modeled as an explicit discriminated union before being adapted to route metadata:

```ts
type NavigationDestination =
  | { kind: "internal"; to: string }
  | { kind: "external"; href: string; target: "_blank" }
  | { kind: "iframe"; to: string; src: string };
```

`@noob-naive-ui/admin` still needs only the resolved active descriptor and async navigation callbacks; it should not receive this router-specific policy model unless future requirements prove multiple navigation hosts need one shared frontend contract.

# Upstream navigation architecture: Soybean Admin and Robot Admin

## Versions observed

| Repository | Default branch | Commit inspected | Evidence |
|---|---|---|---|
| `honghuangdc/soybean-admin` | `main` | `3d3613f20cd4add3cd20fd6cc884abead165c6d2` | https://github.com/honghuangdc/soybean-admin/tree/3d3613f20cd4add3cd20fd6cc884abead165c6d2 |
| `ChenyCHENYU/Robot_Admin` | `main` | `2210d4758e1ef625d17c2526460df815e38fa41c` | https://github.com/ChenyCHENYU/Robot_Admin/tree/2210d4758e1ef625d17c2526460df815e38fa41c |
| Robot’s extracted tags component (`ChenyCHENYU/naive-ui-components`) | `main` | `cca246dc4406f0975efe3f0b0f5e712d8228e15d` | https://github.com/ChenyCHENYU/naive-ui-components/tree/cca246dc4406f0975efe3f0b0f5e712d8228e15d |

## `honghuangdc/soybean-admin`

### Route → menu active state → tabs → callback

1. The route guard initializes constant/auth routes before admitting navigation; the route store then transforms authorized route definitions into Vue Router records, adds them to the router, derives `menus`, cacheable route names, and initializes the home tab.
   - Guard: [`src/router/guard/route.ts`](https://github.com/honghuangdc/soybean-admin/blob/3d3613f20cd4add3cd20fd6cc884abead165c6d2/src/router/guard/route.ts)
   - Derivation/registration: [`src/store/modules/route/index.ts`](https://github.com/honghuangdc/soybean-admin/blob/3d3613f20cd4add3cd20fd6cc884abead165c6d2/src/store/modules/route/index.ts), especially `handleConstantAndAuthRoutes()`.
2. `useMenu()` computes selected menu key from `route.name`; when `meta.hideInMenu` is true it instead uses `meta.activeMenu`. The vertical `NMenu` receives that selected value and turns selection into `routerPushByKeyWithMetaQuery`.
   - Active-menu rule: [`src/layouts/modules/global-menu/context/index.ts`](https://github.com/honghuangdc/soybean-admin/blob/3d3613f20cd4add3cd20fd6cc884abead165c6d2/src/layouts/modules/global-menu/context/index.ts)
   - Menu callback rendering: [`src/layouts/modules/global-menu/modules/vertical-menu.vue`](https://github.com/honghuangdc/soybean-admin/blob/3d3613f20cd4add3cd20fd6cc884abead165c6d2/src/layouts/modules/global-menu/modules/vertical-menu.vue)
   - The routing adapter maps a route key to `router.push({ name, query-from-meta })`: [`src/hooks/common/router.ts`](https://github.com/honghuangdc/soybean-admin/blob/3d3613f20cd4add3cd20fd6cc884abead165c6d2/src/hooks/common/router.ts).
3. Tab membership is a Pinia store, **derived on route change**: `GlobalTab` watches `route.fullPath` and calls `tabStore.addTab(route)`. `getTabByRoute` copies identity (`path`, optionally query for `multiTab`), label/icon, and `fullPath` from the current route. The tab store’s `switchRouteByTab` performs `router.push(tab.fullPath)` and only then updates the active ID.
   - Rendering/watch/click callback: [`src/layouts/modules/global-tab/index.vue`](https://github.com/honghuangdc/soybean-admin/blob/3d3613f20cd4add3cd20fd6cc884abead165c6d2/src/layouts/modules/global-tab/index.vue)
   - State and route callback: [`src/store/modules/tab/index.ts`](https://github.com/honghuangdc/soybean-admin/blob/3d3613f20cd4add3cd20fd6cc884abead165c6d2/src/store/modules/tab/index.ts)
   - Route-to-tab data mapping: [`src/store/modules/tab/shared.ts`](https://github.com/honghuangdc/soybean-admin/blob/3d3613f20cd4add3cd20fd6cc884abead165c6d2/src/store/modules/tab/shared.ts)
4. Tabs are `PageTab` controls with a text `<div>`, not `RouterLink` or an anchor. Their activation is `@pointerdown="switchTab($event, tab)"`; close and context menu are separate callbacks.
   - Exact rendering: [`src/layouts/modules/global-tab/index.vue`](https://github.com/honghuangdc/soybean-admin/blob/3d3613f20cd4add3cd20fd6cc884abead165c6d2/src/layouts/modules/global-tab/index.vue).

### Internal, external, iframe destinations

- Internal routes are normal Vue Router records generated from Elegant routes.
- `RouteMeta.href` is explicitly an **external/new-window** destination. The guard handles a matched `to.meta.href` by `window.open(to.meta.href, '_blank')`, then returns to the previous route; it is not a tab-local iframe strategy.
  - Meta contract: [`src/typings/router.d.ts`](https://github.com/honghuangdc/soybean-admin/blob/3d3613f20cd4add3cd20fd6cc884abead165c6d2/src/typings/router.d.ts)
  - Effect: [`src/router/guard/route.ts`](https://github.com/honghuangdc/soybean-admin/blob/3d3613f20cd4add3cd20fd6cc884abead165c6d2/src/router/guard/route.ts)
- It also has a genuine internal iframe-page route (`/iframe-page/:url`) and renders the route parameter as `<iframe :src="url">`.
  - Generated route map: [`src/router/elegant/transform.ts`](https://github.com/honghuangdc/soybean-admin/blob/3d3613f20cd4add3cd20fd6cc884abead165c6d2/src/router/elegant/transform.ts)
  - View: [`src/views/_builtin/iframe-page/[url].vue`](https://github.com/honghuangdc/soybean-admin/blob/3d3613f20cd4add3cd20fd6cc884abead165c6d2/src/views/_builtin/iframe-page/[url].vue)

**Transferable finding:** Soybean offers a clear router-owned model, but its tab store is not router-neutral: its tab item carries router-specific route names and `fullPath`, while both menu and tab rendering directly navigate. Borrow only the directionality: route changes update membership; selecting an existing tab asks the host to navigate.

## `ChenyCHENYU/Robot_Admin`

### Route → active menu → tab rendering/callback

1. Vue Router is instantiated from public routes. The permission guard gets the authorized menu-route tree, dynamically turns it into Vue Router records, adds each record, and retries the target URL; the permission store retains that original route tree.
   - Router: [`src/router/index.ts`](https://github.com/ChenyCHENYU/Robot_Admin/blob/2210d4758e1ef625d17c2526460df815e38fa41c/src/router/index.ts)
   - Guard: [`src/router/permission.ts`](https://github.com/ChenyCHENYU/Robot_Admin/blob/2210d4758e1ef625d17c2526460df815e38fa41c/src/router/permission.ts)
   - Dynamic registration: [`src/router/dynamicRouter.ts`](https://github.com/ChenyCHENYU/Robot_Admin/blob/2210d4758e1ef625d17c2526460df815e38fa41c/src/router/dynamicRouter.ts)
   - Source tree/store: [`src/stores/permission/index.ts`](https://github.com/ChenyCHENYU/Robot_Admin/blob/2210d4758e1ef625d17c2526460df815e38fa41c/src/stores/permission/index.ts)
2. `showMenuListGet` filters `hidden` routes and flattens one-child containers, producing the menu data. The layout passes `route.path` as its `C_Menu` active value and uses `@select="router.push"`. Its grouped menu independently checks `route.path` for active styling and on click calls both its `select(path)` event and `router.push(path)`—a duplicate navigation authority.
   - Menu derivation: [`src/utils/d_route.ts`](https://github.com/ChenyCHENYU/Robot_Admin/blob/2210d4758e1ef625d17c2526460df815e38fa41c/src/utils/d_route.ts)
   - Layout wiring: [`src/components/global/C_Layout/index.vue`](https://github.com/ChenyCHENYU/Robot_Admin/blob/2210d4758e1ef625d17c2526460df815e38fa41c/src/components/global/C_Layout/index.vue)
   - Grouped-menu active/click code: [`src/components/global/C_MenuGrouped/index.vue`](https://github.com/ChenyCHENYU/Robot_Admin/blob/2210d4758e1ef625d17c2526460df815e38fa41c/src/components/global/C_MenuGrouped/index.vue)
3. `C_TagsView` was migrated out of the app into `@robot-admin/naive-ui-components` (the app lists that dependency in [`package.json`](https://github.com/ChenyCHENYU/Robot_Admin/blob/2210d4758e1ef625d17c2526460df815e38fa41c/package.json)). It owns a small composable state: tag list and active path, persisted in `localStorage`. A route-path watcher adds/updates a tag using `route.meta.title`, icon, and `affix`; clicking an `NTag` invokes `router.push(tag.path)`. The visible tag label is plain slot text—not a `RouterLink` or anchor.
   - Render/callback/watch: [`naive-ui-components/src/components/C_TagsView/index.vue`](https://github.com/ChenyCHENYU/naive-ui-components/blob/cca246dc4406f0975efe3f0b0f5e712d8228e15d/src/components/C_TagsView/index.vue)
   - Local membership/persistence operations: [`naive-ui-components/src/components/C_TagsView/useTagsView.ts`](https://github.com/ChenyCHENYU/naive-ui-components/blob/cca246dc4406f0975efe3f0b0f5e712d8228e15d/src/components/C_TagsView/useTagsView.ts)

### Internal, external, iframe destinations

- The dynamic route type documents `meta.link?: string`, but the inspected `processRoute`, permission store/menu conversion, `C_Layout`, and `C_MenuGrouped` do not branch on it: menu navigation always constructs a path and `router.push(path)`. Therefore current source does **not** establish a complete external-link handling flow.
  - Declared metadata: [`src/router/dynamicRouter.ts`](https://github.com/ChenyCHENYU/Robot_Admin/blob/2210d4758e1ef625d17c2526460df815e38fa41c/src/router/dynamicRouter.ts)
  - Menu navigation: [`src/components/global/C_MenuGrouped/index.vue`](https://github.com/ChenyCHENYU/Robot_Admin/blob/2210d4758e1ef625d17c2526460df815e38fa41c/src/components/global/C_MenuGrouped/index.vue)
- It has `/preview/*` routes for pages meant to be embedded by an external documentation site. They bypass auth and render an internal `PreviewLayout`; this is not an admin-shell menu iframe destination.
  - Routes: [`src/router/previewRouter.ts`](https://github.com/ChenyCHENYU/Robot_Admin/blob/2210d4758e1ef625d17c2526460df815e38fa41c/src/router/previewRouter.ts)
  - Permission bypass: [`src/router/permission.ts`](https://github.com/ChenyCHENYU/Robot_Admin/blob/2210d4758e1ef625d17c2526460df815e38fa41c/src/router/permission.ts)

**Transferable finding:** The independently stateful TagsView is closer to a local-open-tab membership owner, but it is still coupled to `vue-router` (`useRoute`, `useRouter`, and direct `router.push`). Its strongest borrowable boundary is the route watcher (`route → add/update tab`) plus an `onSelect(destination)` host callback; do not borrow Robot’s double navigation in grouped menus.

## Recommendation for router-neutral `AdminShell`

Use neither nested `RouterLink` tab labels nor direct router imports. Have the shell own `openTabs` and active key, expose exactly one navigation callback (for example `onNavigate(destination)`) for both menu and selected tab, and let the application synchronize the shell from its router after successful navigation. Model destinations explicitly—`internal`, `external`, `iframe`—so the host chooses `router.push`, native/new-window navigation, or an iframe route/content. This avoids (1) Soybean’s router-bound store and (2) Robot’s duplicate menu navigation while retaining deterministic local membership.

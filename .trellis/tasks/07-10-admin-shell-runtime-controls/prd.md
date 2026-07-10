# Implement `AdminShell` layout, open tabs, and starter-built sidebar menu

## Goal

Provide the frontend-only `AdminShell` vertical slice from Tasks 6 and 7 in `docs/agent/todo.md`. It switches among loading, anonymous, and authenticated states; delegates anonymous UI to the packaged login page; uses Pro Naive UI's `ProLayout` as its authenticated frame; owns browser-like open tabs; renders the starter-supplied sidebar menu unchanged; and exposes runtime preference controls without owning a router.

The starter supplies `<router-view />` through `AdminShell`'s default slot and builds the complete `MenuOption[]` passed to `AdminShell`. It owns menu visibility, hierarchy, labels, route behavior, and router integration. `@noob-naive-ui/admin` does not import, depend on, configure, or inspect `vue-router`.

## Confirmed facts

- `@noob-naive-ui/admin` already exports frontend-only auth contracts, `AdminLoginPage`, `AdminMenuTree`, `AdminRouteKey`, `AdminRouteVisibility`, and `useAdminShellPreferencesStore`.
- Naive `MenuOption` is the established UI-library menu shape. It supports nested children, groups, dividers, optional string/number keys, visibility fields, and option props; `NMenu` owns menu-item selection from that shape.
- The preferences store normalizes and persists theme mode, font size, locale, and sidebar collapse. Locale options are runtime-only; controls must use explicit store actions rather than duplicate storage or normalization.
- Pro Naive UI 3.2.3 exports `ProLayout`; its `sidebar`, `tabbar`, and default slots compose with direct `NMenu`; it has `collapsed` / `onUpdate:collapsed`; and its root expects a defined-height container.
- The starter owns route registry, backend integration, menu derivation, and router navigation. The runtime owns only presentation from frontend-ready input.

## Requirements

1. Add `pro-naive-ui` 3.2.3 as an admin peer dependency and matching dev dependency; externalize it in the library Vite build. Do not add `vue-router`.
2. Remove the now-unneeded `AdminRouteVisibility` runtime-contract export after an LSP reference sweep. Retain the existing public `AdminMenuTree` and `AdminRouteKey` aliases; `AdminShell` deliberately receives Naive UI's `MenuOption[]` directly rather than introducing an admin navigation/visibility model.
3. Export a compositional TSX `AdminShell` component with frontend-only auth props, optional `menuOptions?: MenuOption[]`, and the complete optional `AdminShellTabController`. Independent tab current/callback props are prohibited.
4. Render a semantically observable loading layout for `authStatus.kind === "loading"` and the existing `AdminLoginPage` for `authStatus.kind === "anonymous"`. Neither branch constructs ProLayout, invokes the default slot, renders sidebar/tabs, or retains a prior authenticated tab list.
5. Render the authenticated branch in a wrapper with definite `height: 100dvh` / `h-dvh` containing `ProLayout`; do not substitute `min-height`, because ProLayout's `height: 100%` needs a percentage-height containing block. Bind `sidebarCollapsed` to its controlled `collapsed` / `onUpdate:collapsed` interface; put presentation/runtime controls in documented navigation slots; render `menuOptions` directly through `NMenu` in the sidebar; and enable sidebar/tabbar only when their respective input/controller exists.
6. Treat `menuOptions` as starter-owned opaque UI input. Pass it to `NMenu` unchanged: do not filter, clone, normalize keys, infer visibility, derive route metadata, intercept selection, or add a navigation callback/controller. Route behavior, if required, belongs in starter-owned link/rendered-label content; `AdminShell` supplies no menu navigation behavior.
7. Own browser-like open-tab membership/UI internally in ProLayout's `tabbar` slot. The host-reported tab is authoritative for highlighting; the shell awaits callbacks and must not optimistically highlight or remove tabs. Clear tabs whenever auth leaves authenticated or the tab controller is removed.
8. Forward only `AdminShell`'s default slot to ProLayout's default content slot in the authenticated branch. This is the sole starter content seam for `<router-view />`; the package exposes no public `sidebar` or `tabbar` slot.
9. Keep theme/font-size/sidebar and language controls as shell internals backed exclusively by `useAdminShellPreferencesStore` state/actions. Do not add standalone control APIs without a demonstrated consumer.
10. Preserve boundaries: no backend-shaped types, transport/query imports, local-storage parsing, broad Naive/Pro Naive re-exports, global theme/provider effects, router imports, route registry ownership, menu filtering, or business pages.
11. Add observable happy-dom tests for all branches; ProLayout sizing/slot composition; unchanged menu composition; tab lifecycle; and preference controls.

## Acceptance criteria

- [ ] `AdminShell` renders loading, anonymous, and authenticated layouts solely from `AdminAuthStatus`; loading/anonymous render neither default content, sidebar, nor tabs.
- [ ] The anonymous branch delegates login UX to `AdminLoginPage` and forwards the supplied `AdminAuthActions` callback contract.
- [ ] The authenticated branch is a defined-height `ProLayout` frame whose collapsed state is store-backed. Its default content is exclusively starter-supplied; a starter can mount `<router-view />` without the admin package importing `vue-router`.
- [ ] An authenticated shell renders the exact starter-supplied `MenuOption[]` through internal `NMenu` sidebar composition. It has no admin-owned visibility/filtering/navigation contract, does not alter option identity/keys/hierarchy, and provides no menu-selection callback.
- [ ] `AdminShell` implements browser-like open tabs in ProLayout's internal `tabbar` area. A host-reported tab controls highlighting, callback failures do not mutate tabs, and auth/controller transitions clear prior session tabs.
- [ ] Theme, font size, locale, and sidebar controls mutate the existing preference store through public actions. Locale options remain runtime-only and retain normalization behavior.
- [ ] `AdminRouteVisibility` has no remaining exported/caller references. Existing `AdminMenuTree` and `AdminRouteKey` aliases remain unchanged. The manifest, Vite externalization, and public barrel deliberately include only the intended ProLayout/shell interfaces; source and dependency graph contain no `vue-router`.
- [ ] Focused component tests plus admin package typecheck/build pass.

## Out of scope

- Backend login/session/permission handling, transport clients, request/response contracts, query state, route registry ownership, backend-to-frontend menu derivation, menu filtering/normalization, and business CRUD pages.
- Persisting open tabs, route restoration, automatic menu generation from routes, global Naive UI theme/font-size provider assembly, and a separate router adapter.
- A public `sidebar`/`tabbar` slot, broad Naive/Pro Naive component re-exports, or a custom replacement menu-tree type.

## Verification commands

```sh
pnpm --filter @noob-naive-ui/admin test -- admin-shell
pnpm --filter @noob-naive-ui/admin typecheck
pnpm --filter @noob-naive-ui/admin build
```

## Open question

- Approve the combined layout seam in `design.md`: `menuOptions` is opaque starter-owned Naive input, while the default slot holds `<router-view />` and the optional tab controller remains the only shell-owned navigation-like state.

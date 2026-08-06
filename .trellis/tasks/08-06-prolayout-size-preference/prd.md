# ProLayout preference config (proLayoutConfig) + tabbar overflow fix + useLayoutMenu migration

## Goal

Make the AdminShell's `ProLayout` chrome follow the shell's frontend preferences the same way `NConfigProvider` props already do, fix the tabbar overflow symptom (tabs grow with the font-size preference while the tabbar container stays 38px), and migrate the sidebar menu to pro-naive-ui's `useLayoutMenu` so the library's built-in mode switching (vertical/horizontal) becomes a small future delta.

## Background (verified facts)

- naive-ui resolves per-component size as `props.size ?? componentOptions.<Component>.size ?? 'medium'`. `componentOptions` is already built per tier (`COMPONENT_SIZE_OPTIONS` from `buildComponentSizeOptions`, `packages/admin/src/runtime/naive-ui-config.ts`), exposed as `preferences.naiveUiConfig.componentOptions`, and bound by hosts on `NConfigProvider`. This part works.
- pro-naive-ui `ProLayout` (v3.2.3) renders plain HTML chrome; it has no `size` prop. Its chrome heights are props (`tabbarHeight` default 38, `navHeight` 50, `footerHeight` 32, `sidebarWidth` 224) emitted as CSS vars. In vertical layout the header is `position: absolute` and content reserves space via `--pro-layout-content-margin-top: nav.height + tabbar.height` — the prop value must equal the rendered height (content-driven CSS height would break the margin math).
- `ProConfigProvider` forwards every `NConfigProvider` prop incl. `componentOptions` via `useOmitProps`; it adds only `propOverrides`/`empty`. Not required for size; no hidden size knob.
- naive-ui `Menu` cannot be resized via `componentOptions` (fixed item height; only theme font scales).
- **Measured in demo browser (2026-08-06)** — the tabbar overflows at every tier (pre-existing bug): NTab heights small 35.1 / medium 38.7 / large 45.0px vs fixed 38px container (overflow 1/5/12px). The `h-4/5`/`h-9/10` tab classes are inert (tab nav is content-height; percentages never resolve). Nav bar at `large` does NOT overflow (50px container, 40px buttons). Sidebar menu auto-collapses via NMenu's default `responsive` behavior — preserved by the migration.
- `useLayoutMenu` (exported from pro-naive-ui root): options `{ menus, mode, accordion?, childrenField? }`; owns `activeKey`/`expandedKeys`; returns `layout` computed of per-mode `MenuProps` (`verticalMenuProps` = `{ mode, options, value, expandedKeys, onUpdateValue, onUpdateExpandedKeys }` — its `onUpdateValue` only sets `activeKey`; navigation must be added by the caller).

## Requirements

- **New `packages/admin/src/runtime/pro-layout-config.ts`** mirroring `naive-ui-config.ts`: `AdminProLayoutConfig` type (preference-derived ProLayout props), `PRO_LAYOUT_TABBAR_HEIGHTS` map (37/42/48, browser-measured), resolver function(s).
- **Store getter**: `proLayoutConfig` computed in `useAdminShellPreferencesStore` (never serialized), deriving `tabbarHeight` from `fontSize` and `collapsed` from `sidebarCollapsed`; exported from the package index like `AdminNaiveUiConfig`.
- **AdminShell binds the getter**: `<ProLayout {...preferences.proLayoutConfig} …>` (drop the now-redundant explicit `collapsed`; keep `onUpdateCollapsed` → `setSidebarCollapsed`).
- **Menu migration**: sidebar `NMenu` spreads `layout.value.verticalMenuProps` from `useLayoutMenu({ menus, mode: () => "vertical" })`. Navigation is decoupled from the menu component: a watcher syncs the navigation store's active key into `useLayoutMenu`'s `activeKey`, and a second watcher turns `activeKey` changes into `shellContext.navigate` (with an echo guard). No `onUpdateValue` override — the same `activeKey` watcher will serve a future horizontal nav menu unchanged. Mode stays hardcoded `vertical` with a comment marking the future `layoutMode` binding point.
- Keep `medium` tier behavior: tabbar 42px (today's 38px already overflows 5px — the fix targets **no overflow at any tier**).
- No new preference keys, no changes to `buildComponentSizeOptions`/`COMPONENT_SIZE_OPTIONS`, no `ProConfigProvider` swap, no NMenu-via-componentOptions resizing.

## Acceptance Criteria

- [ ] `pro-layout-config.ts` exists with `AdminProLayoutConfig`, `PRO_LAYOUT_TABBAR_HEIGHTS` (37/42/48 + measurement provenance comment), resolver; `proLayoutConfig` computed on the preferences store, exported from `packages/admin/src/index.ts`.
- [ ] `AdminShell` renders `ProLayout` with `{...preferences.proLayoutConfig}`; no duplicate `collapsed` prop.
- [ ] Sidebar menu driven by `useLayoutMenu` (`verticalMenuProps` spread); menu click navigates; active menu key follows navigation (including tab activation / history traversal); collapse behavior unchanged (responsive).
- [ ] Demo browser verification at all three tiers (small/medium/large): `.pro-layout__tabbar` height = 37/42/48 and `scrollHeight ≤ clientHeight` (no overflow); menu navigation + collapse still work; large-tier nav bar unchanged (no overflow).
- [ ] Targeted typecheck (`packages/admin`) + admin shell tests pass.
- [ ] Spec updated (`trellis-update-spec`): ProLayout chrome size mechanism (props → CSS vars → margin math; `componentOptions` never resizes ProLayout chrome), `ProConfigProvider` passthrough, `useLayoutMenu` wiring contract, and the tabbar-height re-measure procedure.

## Out of Scope

- Layout-mode preference / vertical-horizontal switcher (groundwork only, user decision 2026-08-06): no `layoutMode` key, no UI control, no horizontal nav menu rendering.
- NMenu height resizing via `componentOptions` (impossible).
- `ProConfigProvider` adoption (not required).
- Changing `navHeight`/`footerHeight` (no overflow evidence at `large`).

## Notes

- Worktree hosts in-progress task `08-05-fallow-refactor-admin-shell` also touching `admin-shell.tsx` — re-read the file before editing; adapt to any already-applied split.
- `ProLayoutProps` / `useLayoutMenu` are exported from the pro-naive-ui package root (verified in `node_modules/pro-naive-ui/es/index.d.ts`).

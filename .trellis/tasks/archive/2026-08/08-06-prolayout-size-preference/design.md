# Design — proLayoutConfig getter + tabbar fix + useLayoutMenu migration

## Architecture

Mirrors the existing naive-ui config flow exactly:

```
runtime/pro-layout-config.ts      runtime/naive-ui-config.ts
  AdminProLayoutConfig type  ←→    AdminNaiveUiConfig type
  PRO_LAYOUT_TABBAR_HEIGHTS   ←→   COMPONENT_SIZE_OPTIONS / FONT_SIZE_OVERRIDES
  resolver fn                 ←→   resolveAdminNaiveUiTheme / -BaseFontSize

stores/shell-preferences.ts
  proLayoutConfig (computed, never serialized)   ←→   naiveUiConfig (computed)

components/admin-shell.tsx
  <ProLayout {...preferences.proLayoutConfig} …> ←→   host binds naiveUiConfig on NConfigProvider
  useLayoutMenu({ menus, mode: () => "vertical" })   (sidebar slot)
```

## 1. `packages/admin/src/runtime/pro-layout-config.ts` (new)

```ts
import type { ProLayoutProps } from "pro-naive-ui";
import type { AdminFontSize } from "../runtime-contract";

/** ProLayout props derived from admin shell preferences; never serialized. */
export type AdminProLayoutConfig = Pick<ProLayoutProps, "tabbarHeight" | "collapsed">;

/**
 * Tabbar container heights (px) per font-size tier, browser-measured
 * 2026-08-06 in the demo (naive-ui 2.44.1, pro-naive-ui 3.2.3):
 * NTab heights small 35.1 / medium 38.7 / large 45.0 + 1px border + headroom.
 * Re-measure when naive-ui bumps: see spec.
 */
export const PRO_LAYOUT_TABBAR_HEIGHTS: Record<AdminFontSize, number> = {
  small: 37,
  medium: 42,
  large: 48,
};

/** Resolves the ProLayout tabbar height for a font-size preference tier. */
export function resolveAdminProLayoutTabbarHeight(size: AdminFontSize): number {
  return PRO_LAYOUT_TABBAR_HEIGHTS[size];
}
```

Type-only import of `ProLayoutProps` from pro-naive-ui (already an admin dependency). `Pick` keeps the getter's surface minimal and future additions (e.g. `mode`, `navHeight`) explicit.

## 2. Store getter (`stores/shell-preferences.ts`)

```ts
/** ProLayout props derived from preferences; never serialized. */
const proLayoutConfig = computed<AdminProLayoutConfig>(() => ({
  tabbarHeight: resolveAdminProLayoutTabbarHeight(fontSize.value),
  collapsed: sidebarCollapsed.value,
}));
```

Returned from the store (next to `naiveUiConfig`). `collapsed` moves here from AdminShell's inline prop so the getter is the single source of preference→ProLayout binding. Export `AdminProLayoutConfig` type + resolver/map from `packages/admin/src/index.ts` (mirror the `AdminNaiveUiConfig` export lines 39/41).

## 3. AdminShell (`components/admin-shell.tsx`)

Render:
```tsx
<ProLayout
  {...preferences.proLayoutConfig}
  onUpdateCollapsed={(value) => preferences.setSidebarCollapsed(value)}
  showSidebar={Boolean(menuOptions?.length)}
  showTabbar={Boolean(nav.navigation)}
  v-slots={layoutSlots}
/>
```

Menu wiring in setup:
```ts
// Groundwork: mode stays vertical until a layoutMode preference exists; the
// future switcher binds preferences.layoutMode here and renders
// layout.value.horizontalMenuProps in a nav slot instead — the activeKey
// watcher below already serves every menu instance, so no per-menu wiring.
const { activeKey, layout } = useLayoutMenu({
  menus: () => menu.options,
  mode: () => "vertical" as const,
});

// Navigation store is the authoritative active page; menu follows it
// (tab activation, history traversal, programmatic navigate).
watch(
  () => nav.navigation?.active?.nav.navKey ?? null,
  (key) => {
    if (activeKey.value !== key) activeKey.value = key;
  },
  { immediate: true },
);

// Menu → navigation. useLayoutMenu's internal onUpdateValue already sets
// activeKey (and its expandedKeys watcher follows); this watcher turns that
// into navigation. The active-key guard prevents echo navigation when the
// navigation watcher above sets activeKey programmatically.
watch(activeKey, (key) => {
  if (key == null) return;
  if (key === nav.navigation?.active?.nav.navKey) return;
  void shellContext.navigate({ navKey: String(key) });
});
```

Sidebar slot:
```tsx
sidebar: menuOptions?.length
  ? () => <NMenu {...layout.value.verticalMenuProps} />
  : undefined,
```

Notes:
- `verticalMenuProps` = `{ mode, options, value, expandedKeys, onUpdateValue, onUpdateExpandedKeys }` (source-verified). We do NOT override `onUpdateValue` — its internal handler updates `activeKey` and the internal `expandedKeys` watch; navigation is decoupled through the `activeKey` watcher. Drop the old `options`/`value` props on the slot NMenu.
- The old `activeMenuKey` derivation (`nav.navigation?.active?.nav.navKey`) is replaced by the two watchers; remove the now-unused local.
- Collapse behavior preserved: NMenu default `responsive` auto-collapses on narrow sidebar (verified in browser); no `collapsed` prop needed on the slot menu.

## Alternatives considered

- **CSS `height: auto`/`fit-content` on the tabbar** — rejected: breaks `--pro-layout-content-margin-top` (absolute header, prop-driven margin); container grows but content slides under.
- **Runtime measurement (ResizeObserver → feed `tabbarHeight` back)** — rejected: one-frame flash, feedback loop, same three values with worse reliability.
- **Proportional formula (`38 × tierFont/14`)** — rejected: NTab heights 35.1/38.7/45 are discrete, not ∝ 13/14/16.
- **Per-tier map inline in AdminShell** — rejected (user direction): a `pro-layout-config.ts` runtime module + store getter keeps preference-derived presentation state in one place, mirroring naive-ui-config, and gives the future mode preference a home.
- **Binding `collapsed` inline** — rejected: getter is the single source; AdminShell keeps only the event handler.

## Compatibility / rollback

- Medium tabbar 38 → 42 is the first correct state (today it overflows 5px). Revert = drop the getter spread + restore inline `collapsed`.
- Menu behavior is preserved (navigation, active-key sync, responsive collapse); no host-facing API change beyond the new `proLayoutConfig` store member (additive export).
- Persistence schema untouched (no new preference keys).

## Verification

- Browser (demo): per tier (persisted preference + reload), `.pro-layout__tabbar` offsetHeight ∈ map, `scrollHeight ≤ clientHeight`; menu click navigates and active key highlights; sidebar collapse still auto-collapses the menu; nav bar at large unchanged.
- `pnpm --filter @noob-naive-ui/admin typecheck` + admin shell tests.

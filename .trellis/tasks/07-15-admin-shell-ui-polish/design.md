# Design: AdminShell UI polish

The change stays within `packages/admin` and the demo composition that currently exposes duplicate logout UI: its manifest/build configuration, `src/components/admin-shell.tsx`, observable component test, and `apps/demo/src/App.tsx`. `AdminShell` continues to consume only `AdminAuthStatus`, `AdminAuthActions`, direct opaque `MenuOption[]`, the optional tab controller, and the existing preferences store. No public types, storage fields, or application/starter integration change.


`authStatus.userLabel` is the sole identity-display input. The account control therefore uses a generic Vicons person icon alongside that label (falling back to `Signed in`). Its hover dropdown invokes `props.authActions.logout()` directly.

## Dependency and build boundary

Add `@vicons/ionicons5` as an explicit runtime dependency of `@noob-naive-ui/admin`, then externalize it in the package library build alongside its other runtime dependencies. `NIcon` from the existing Naive UI peer renders its icon components. This follows the user's requested icon system without relying on an undeclared transitive package or expanding the public API.

## Header composition

`ProLayout` provides `nav-left` for a compact `NButton` with a Vicons sidebar-collapse glyph that toggles the controlled `sidebarCollapsed` preference. `nav-right` contains four hover-triggered `NDropdown` controls in this order:

1. theme: icon-only button, moon for light/system (enter dark mode) and sun for dark (exit dark mode);
2. font size: icon-only button;
3. locale: icon-only button, disabled when `availableLocales` is empty;
4. account: generic user Vicon plus user label, containing the one logout menu option with a logout Vicon.

Each icon-only trigger retains an explicit `aria-label`. `NButton`, `NIcon`, and `NDropdown` keep their standard keyboard behavior; `trigger="hover"` with `delay={0}` supplies immediate pointer feedback and deterministic popup timing without custom focus/menu state.

## Tab strip composition

The tabbar remains a `role="tablist"` sourced solely from `visibleTabs`. It becomes a horizontally scrollable browser-style rail: a single bottom divider, compact adjacent rectangular tabs with rounded top corners and shared borders, and no pill treatment. The active tab uses the content surface, foreground emphasis, and a divider-covering lower edge so it reads as connected to the page; inactive tabs retain a subdued surface with only a restrained hover state. Each tab is still an `NButton` with its current role/selection/click contract; its close action becomes a compact, labelled Naive icon button bearing the Vicons close glyph. No optimistic activation change is introduced.

## Test strategy

Update the existing dropdown helper to dispatch `mouseenter`, await Vue rendering, and select a document-level Naive popup option; the explicit `delay={0}` makes that interaction deterministic. Tests will assert hover preference changes, locale disablement, the action-oriented theme mapping (dark → sun; light/system → moon) with an accessible current-theme/menu label, left/sidebar and right/account placement through stable `data-admin-*` hooks, account logout, and the browser-tab rail's active/inactive presentation hooks. Existing async tab lifecycle tests remain the safety net for behavior intentionally unchanged.

## Compatibility and rollback

This is a presentational and interaction-trigger change with one declared runtime dependency. Existing direct menu composition, default-slot isolation, preference state/actions, tab controller, and logout callback remain intact; the demo's redundant default-slot sign-out button is removed so the account dropdown is the sole logout UI. Reverting the manifest, lockfile, Vite external, component, demo, and test together restores the previous header and tab appearance without data migration or consumer-contract changes.

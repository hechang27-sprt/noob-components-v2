# Implement — proLayoutConfig getter + tabbar fix + useLayoutMenu migration

## Ordered checklist

1. **Re-read `packages/admin/src/components/admin-shell.tsx` fully** — in-progress sibling task `08-05-fallow-refactor-admin-shell` may have moved the ProLayout render or menu slot since planning; adapt to current shape. Also re-read `packages/admin/src/index.ts` export block to follow its exact pattern.

2. **Create `packages/admin/src/runtime/pro-layout-config.ts`** (per design §1): `AdminProLayoutConfig` (Pick of `ProLayoutProps`), `PRO_LAYOUT_TABBAR_HEIGHTS` (37/42/48 with provenance comment), `resolveAdminProLayoutTabbarHeight`. Type-only import from `pro-naive-ui`.

3. **Store getter** (`stores/shell-preferences.ts`): import resolver/type; add `proLayoutConfig` computed (`tabbarHeight` + `collapsed`); return it next to `naiveUiConfig`; update the module doc comment if it enumerates derived props.

4. **Package exports** (`packages/admin/src/index.ts`): export `AdminProLayoutConfig` type + `PRO_LAYOUT_TABBAR_HEIGHTS` + resolver, mirroring the `AdminNaiveUiConfig` export lines.

5. **AdminShell wiring** (`components/admin-shell.tsx`):
   - Import `useLayoutMenu` from `pro-naive-ui`; call with `menus: () => menu.options`, `mode: () => "vertical" as const` (groundwork comment).
   - Two watchers (no `onUpdateValue` override): nav active navKey → `activeKey` (immediate); `activeKey` → navigate with an active-key echo guard.
   - Sidebar slot: `<NMenu {...layout.value.verticalMenuProps} />`; drop old `options`/`value` props and the `activeMenuKey` local.
   - ProLayout props: `{...preferences.proLayoutConfig}` + keep `onUpdateCollapsed`; drop explicit `collapsed`.
   - Re-read the file after editing.

6. **Verify (browser, demo — server already running detached on 127.0.0.1:5173):**
   - Per tier (small/medium/large via persisted `@noob-naive-ui/admin:shell-preferences` + reload): `.pro-layout__tabbar` offsetHeight ∈ {37,42,48}, `scrollHeight ≤ clientHeight`.
   - Menu: click a sidebar item → navigates, tab opens, active key highlights; collapse toggle → menu auto-collapses.
   - Nav bar at large: unchanged, no overflow.

7. **Typecheck + tests:**
   - `pnpm --filter @noob-naive-ui/admin typecheck` (or repo-equivalent, no project-wide suites).
   - Admin shell tests if present (`packages/admin/tests/`).

8. **Spec update (`trellis-update-spec`)** — record:
   - ProLayout chrome size mechanism: props → CSS vars → fixed height + `--pro-layout-content-margin-top` math; `componentOptions` never resizes ProLayout chrome; `ProConfigProvider` passes `componentOptions` through unchanged.
   - `useLayoutMenu` wiring contract in this repo (menus getter, mode getter, activeKey sync from navigation store, onUpdateValue override pattern).
   - Tabbar-height re-measure procedure (design §1 provenance; verify after naive-ui bumps).

9. **Commit (Phase 3.4, jj in this worktree)** + `/trellis:finish-work`.

## Review gates

- PRD acceptance criteria all ticked.
- No new preference keys; persistence schema untouched; `buildComponentSizeOptions`/`COMPONENT_SIZE_OPTIONS` unchanged.
- No `ProConfigProvider` adoption; NMenu size unchanged.
- `admin-shell.tsx` edits coordinated with sibling task 08-05 (re-read before edit; if the refactor moved the render, adapt).

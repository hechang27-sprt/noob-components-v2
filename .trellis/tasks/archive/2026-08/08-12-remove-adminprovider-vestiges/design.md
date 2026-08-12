# Design: Remove AdminProvider-era vestiges

## Overview

Two independent removals + one test rewrite + one spec refresh. No behavior change for running code — these paths are already dead.

## 1. Remove `packages/ui/src/theme/`

- Delete `packages/ui/src/theme/naive.ts` (and the `theme/` dir).
- In `packages/ui/src/index.ts`, drop the `defineNoobNaiveThemeBridge` / `toNoobNaiveThemeOverrides` / `NoobNaiveThemeBridge` re-export block.
- No other code references these symbols; OpenWiki docs regenerate from source.

## 2. Remove `adminI18nPlugin`

In `packages/admin/src/i18n/plugin.ts`:
- Delete `export const adminI18nPlugin = adminI18n.plugin;` (with its doc comment).
- Keep `adminI18n`, `adminI18nOverridesKey`, `DEFAULT_SNAPSHOT`, `AdminI18nSnapshot`.
- `AdminI18nPluginOptions` is only used by the plugin signature + the `AdminProviderProps.overrides` field. Keep `AdminI18nPluginOptions` if `AdminProviderProps.overrides` still references it (it does: `overrides?: AdminI18nPluginOptions["messages"]`). Decide: keep the type, only drop the `adminI18nPlugin` value + its re-export. Minimal change per ask.

In `packages/admin/src/index.ts`:
- Remove `export { adminI18nPlugin } from "./i18n/plugin";`.

## 3. Rewrite `packages/admin/tests/i18n-contract.test.tsx`

The `admin i18n plugin` describe block + `mountLoginPage` currently install the plugin. Replace with the AdminProvider overrides-prop path:

- `capturePluginSnapshot(overrides)` → `captureProviderSnapshot(overrides)`: render `AdminProvider` (props `messages: {}`, `menu: []`, `overrides`) with a child component that `inject(adminI18nOverridesKey)` and capture; assert defensive copy (mutating caller overrides after mount leaves the provided snapshot unchanged — the `structuredClone` in AdminProvider is the new defensive-copy guarantee).
- `mountLoginPage(...)`: wrap `AdminLoginPage` in `<AdminProvider messages={{} } menu={[]} overrides={...}>` instead of `app.use(adminI18nPlugin, ...)`. The three locale-ownership assertions stay identical.
- Keep the `selectComponentOverrides` pure-function assertions unchanged (not plugin-dependent).
- Add a small assertion that `adminI18nPlugin` is no longer exported (optional; guards regressions).

## 4. Spec refresh

`packages/../.trellis/spec/ui/frontend/library-i18n-contract.md` line ~58: the re-export alias list `(`adminI18nPlugin`, `adminI18nOverridesKey`, `DEFAULT_SNAPSHOT`)` → drop `adminI18nPlugin`, and note overrides are provided by the AdminProvider `overrides` prop (not a Vue plugin install). Keep the factory-level `app.use(libraryI18n.plugin, ...)` general API (still valid for other libraries like `noobUiI18nPlugin`).

## Verification

- `pnpm --filter @noob-naive-ui/ui ...` and `pnpm --filter @noob-naive-ui/admin ...`: typecheck, tests, build.
- `oxlint` + `oxfmt` on touched files.
- Grep to confirm no lingering references to `adminI18nPlugin` / `defineNoobNaiveThemeBridge` / `toNoobNaiveThemeOverrides` outside generated `dist/` / `openwiki/`.

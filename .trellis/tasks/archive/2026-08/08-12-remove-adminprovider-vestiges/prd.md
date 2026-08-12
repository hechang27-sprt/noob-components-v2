# PRD: Remove AdminProvider-era vestiges

**Date**: 2026-08-12
**Package**: admin, ui
**Status**: Draft → Approved

## Problem

The AdminProvider root provider (props-driven: `messages` / `menu` / `storeOptions` / `theme` / `overrides`) replaced two pieces of the prior manual wiring, but the superseded code was left behind as dead vestiges:

1. **`packages/ui/src/theme/naive.ts`** — the `NoobNaiveThemeBridge` helpers (`defineNoobNaiveThemeBridge`, `toNoobNaiveThemeOverrides`, `NoobNaiveThemeBridge`). Theme overrides are now supplied by hosts through the AdminProvider `theme` prop (merged onto the store-derived `themeOverrides`). These helpers have **zero code consumers** — the only references are the re-export in `packages/ui/src/index.ts` and generated OpenWiki docs.
2. **`adminI18nPlugin`** — the `app.use(adminI18nPlugin, { messages })` host install path in `packages/admin/src/i18n/plugin.ts`. AdminProvider now provides the override snapshot via `adminI18nOverridesKey` (`structuredClone(overrides ?? {})`). The only consumer of the plugin is the `i18n-contract.test.tsx` install-path test; there are no production call sites.

## Goals

- Remove both dead artifacts cleanly (no shims, aliases, or deprecated re-exports).
- Preserve the live `adminI18n` descriptor (`adminI18nOverridesKey`, `DEFAULT_SNAPSHOT`, `selectComponentOverrides`, and the `plugin: adminI18n` on AdminLoginPage/AdminShell) — those are still used.
- Rewrite `i18n-contract.test.tsx` to exercise the AdminProvider `overrides` prop provide path instead of the removed plugin.
- Refresh the `library-i18n-contract.md` spec alias list and OpenWiki docs (OpenWiki regenerates; no manual edit).
- Green: admin + ui typecheck, tests, build, lint, format.

## Non-goals

- Removing the shared factory's `.plugin` capability in `packages/i18n` (`noobUiI18nPlugin` still uses it).
- Touching the in-progress theme-work test failures (font-size) or the stale `noob-workspace-locale-hmr-boundaries` skill.
- The `noobUiI18nPlugin` (ui package) — not flagged, no consumers currently, but out of scope for this task.

## Acceptance criteria

- `packages/ui/src/theme/` deleted; `packages/ui/src/index.ts` no longer re-exports the theme bridge.
- `adminI18nPlugin` removed from `packages/admin/src/i18n/plugin.ts` and `packages/admin/src/index.ts` (and its `AdminI18nPluginOptions`/`AdminI18nSnapshot` types if only meaningful to the plugin).
- `i18n-contract.test.tsx` passes via the AdminProvider overrides-prop path.
- `library-i18n-contract.md` alias list updated (drop `adminI18nPlugin`).
- All admin + ui checks green (typecheck, tests, build, lint, format).

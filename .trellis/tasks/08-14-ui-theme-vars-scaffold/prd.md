# Unified library override mechanism (i18n + themeVars) + AdminConfigProvider

## Goal

Extend `@noob-naive-ui/i18n`'s existing override mechanism — the shared libraryId-keyed registry + per-package typed descriptor + provider + component-side pull — into a **single unified override mechanism** that carries **both i18n messages and component themeVars**, namespaced per library and per kind. Only component-side consumption differs:

- i18n: `createComponentI18n` → merge override slice into a local Composer.
- theme: `useUiTheme` → read the component's typed themeVars slice → bind as CSS variables on the component root.

`@noob-naive-ui/ui` then hosts reusable components whose theme variables are declared per-component with **exact `--n-*` names preserved in type info**, delivered as CSS variables by a package provider.

Per user decisions:
- `AdminThemePreset` carries `themeOverrides` = per-library themeVar overrides (naive-ui, pro-naive-ui, admin, ui, 3rd-party). Theme presets are the **only** source of themeVar overrides.
- `AdminProvider` keeps an **i18n-only** prop renamed `overrides` → `i18nOverrides` (type: i18n-only per-library registry, unchanged shape — it never concerned theme overrides). `AdminProvider` is the **aggregator**: its render function mounts the per-package ConfigProviders internally. Per-package ConfigProviders (`AdminConfigProvider` for admin, `AdminUiConfigProvider` for ui) accept per-package `i18n`/`themeOverride` props and are standalone-capable; under `AdminProvider` their `themeOverride` is sourced from the active preset's `themeOverrides`.
- Internal registry entry shape `{ i18n?, theme? }` per library (the injection value, unified across kinds); `libraryI18nOverridesKey` → `libraryOverridesKey` (clean cutover, migrate every consumer, no aliases). The host-facing i18n-only `LibraryI18nOverridesRegistry` type is **retained** for `AdminProviderProps.i18nOverrides`.

## Requirements

- **Unified registry, namespaced by kind.** The shared registry entry for a library becomes `{ i18n?: …; theme?: … }`. Both kinds live under the same injection key and are supplied by the same provider. Registry stays deliberately loose (`unknown` per entry) at the provider boundary; each package's descriptor re-validates/types its own entry at consumption.
- **Typed per-component themeVars, exact names preserved.** Each ui component declares `export type XThemeVars = { "--n-…": string; … }` with literal keys. The theme override type is registry-mapped (`{ [K in keyof XComponents]?: Partial<XComponents[K]> }`), so `themeOverride.Card` autocompletes the exact `--n-*` names and rejects unknown keys. Mirrors naive-ui's `CardThemeVars = ReturnType<typeof self>` → `ExtractThemeOverrides<T>`.
- **Provider mechanism reused, package-owning.** `AdminUiConfigProvider` (ui) and `AdminConfigProvider` (admin) accept per-package typed props (`i18n?`, `themeOverride?`), each standalone-capable (inject `null` → own slice only). `AdminProvider` is the **aggregator** — its render mounts both internally with per-package props derived from its i18n-only `i18nOverrides` prop + active preset `themeOverrides`; hosts never compose ConfigProviders manually.
- **`AdminProviderProps.i18nOverrides` is i18n-only.** Renamed from `overrides`; type stays the i18n-only per-library registry (`LibraryI18nOverridesRegistry`), entries are bare i18n trees (no `{ i18n? }` wrapper). It does not and never did concern theme overrides — themeVar overrides come only from `AdminThemePreset.themeOverrides`.
- **`AdminThemePreset.themeOverrides`** per-library themeVar overrides (naive-ui, pro-naive-ui, admin, ui, 3rd-party). `naiveUiConfig` field removed.
- **Pull, not push.** Each component `inject`s the registry and reads only its own libraryId + kind + component slice. A Card structurally cannot read a Button's vars.
- **Component-side consumption is the ONLY difference** between kinds. Typing, registry, provider, and selector machinery are shared.
- **Migrate every existing registry caller** to the new shape and key (clean cutover, no aliases): i18n registry/descriptor/`createComponentI18n`, `AdminProvider`, `apps/demo/src/App.tsx`, admin + i18n tests.
- **Public surface discipline.** `packages/ui/src/index.ts`, `packages/admin/src/index.ts`, `packages/i18n/src/index.ts` are the only barrels; naive-ui/vue stay peers/externals. es-toolkit `merge` for any deep-merge (never hand-rolled).

## Acceptance Criteria

- [ ] `@noob-naive-ui/i18n` exports the unified `LibraryOverridesRegistry` (entry `{ i18n?, theme? }`) + theme descriptor/selector trio, mirroring the i18n trio.
- [ ] `AdminUiConfigProvider` (ui) + `AdminConfigProvider` (admin) accept per-package `i18n`/`themeOverride` props, standalone-capable.
- [ ] `AdminProvider` keeps an i18n-only `i18nOverrides` prop (renamed from `overrides`, type `LibraryI18nOverridesRegistry`, bare per-library i18n trees) and aggregates: its render mounts both ConfigProviders internally, sourcing their `themeOverride` from the active preset's `themeOverrides`; hosts (demo) pass only `AdminProvider`.
- [ ] `useUiTheme` + theme typing: a consumer's `themeOverride.Card` autocompletes the Card's exact `--n-*` names and errors on unknown names.
- [ ] Proof `UiCard` declares typed vars, injects its branch via `useUiTheme("Card")`, binds them as CSS vars on its root; a sibling component's vars are unreachable.
- [ ] `AdminThemePreset.themeOverrides` per-library; naive-ui/pro-naive-ui slices feed `naiveUiConfig.themeOverrides`; `mergeAdminNaiveUiThemeOverrides` reads them + font tier.
- [ ] `apps/demo/src/App.tsx` migrates to `AdminProvider`-only composition; admin i18n entries passed via `i18nOverrides` (bare per-library trees).
- [ ] Every existing i18n registry consumer migrated; no stale `libraryI18nOverridesKey`/`naiveUiConfig`/old registry shape remains.
- [ ] i18n/ui/admin typecheck + build pass; ui + i18n + admin tests pass; `dist/index.d.ts` exposes only deliberate APIs; naive-ui/vue external.

## Notes

- **Breaking** — intentional: internal registry entry shape + key rename, `AdminThemePreset.naiveUiConfig` removed, `AdminProvider.overrides` renamed `i18nOverrides`. Clean cutover, no aliases.
- `AdminProviderProps.i18nOverrides` is i18n-only (`LibraryI18nOverridesRegistry`, retained type); the unified `{ i18n?, theme? }` registry is the internal injection value only. Theme presets are the sole themeVar-override source.
- Both `AdminConfigProvider` and `AdminUiConfigProvider` may be used standalone; under `AdminProvider` they layer (nearest provider wins for its subtree, merging parent + own slice).
- Scope: **mechanism + both providers + one proof component only**. Real widgets and wiring into admin's theme-preset dropdown are follow-ups.

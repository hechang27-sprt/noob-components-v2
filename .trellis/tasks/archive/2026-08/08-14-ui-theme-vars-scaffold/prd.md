# Unified library override mechanism (i18n + themeVars) + AdminConfigProvider

## Goal

Extend `@noob-naive-ui/i18n`'s existing override mechanism — the shared libraryId-keyed registry + per-package typed descriptor + provider + component-side pull — into a **single unified override mechanism** that carries **both i18n messages and component themeVars**, namespaced per library and per kind. Only component-side consumption differs:

- i18n: `createComponentI18n` → merge override slice into a local Composer.
- theme: `useUiTheme` → read the component's typed themeVars slice → bind as CSS variables on the component root.

`@noob-naive-ui/ui` then hosts reusable components whose theme variables are declared per-component with **exact `--n-*` names preserved in type info**, delivered as CSS variables by a package provider.

Per user decisions:
- `AdminThemePreset` carries `themeOverrides` = per-library themeVar overrides. Theme presets are the **only** source of themeVar overrides (`AdminProvider` takes no host theme-override prop).
- `AdminProvider` keeps an **i18n-only** prop renamed `overrides` → `i18nOverrides`, typed as the registry's i18n projection (`RegistryI18nOverrides`). It never concerned theme overrides. `AdminProvider` is the **aggregator**: its render mounts the per-package ConfigProviders internally (and never provides the registry). Per-package ConfigProviders (`AdminConfigProvider` for admin, `AdminUiConfigProvider` for ui) accept per-package `i18n`/`themeOverride` props and are standalone-capable; under `AdminProvider` their `themeOverride` is sourced from the active preset's `themeOverrides`.
- **Framework-wide registry in `@noob-naive-ui/registry`** (not the i18n package). Each library declares its **FULL** locale + themeVar types via module augmentation into `LibraryOverridesRegistry`; the registry converts them to override types internally (`RegistryI18nOverrides` = DeepPartial of `locale`; `RegistryThemeOverrides` = per-component partial of `theme`). The old i18n-only `LibraryI18nOverridesRegistry` type is **eliminated**.

## Requirements

- **Framework-wide override registry (new `@noob-naive-ui/registry`).** `LibraryOverridesRegistry` is an augmentation point: known external libs preseeded (`naive-ui`/`pro-naive-ui` as `GlobalThemeOverrides`), noob packages declare `{ locale: Record<LocaleName, Locale>; theme: Components }` via `declare module "@noob-naive-ui/registry"`. Derived projections `RegistryI18nOverrides` / `RegistryThemeOverrides` convert the full types to override types internally; `LibraryThemeOverrides` stays internal to the registry package. Single injection key `libraryOverridesKey` (value `ComputedRef<LibraryOverridesRegistryValue>`).
- **Typed per-component themeVars, exact names preserved.** Each ui component declares `export type XThemeVars = { "--n-…": string; … }` with literal keys. The override type is registry-derived (`RegistryThemeOverrides` → `{ [K in keyof XComponents]?: Partial<XComponents[K]> }`), so `themeOverride.Card` autocompletes the exact `--n-*` names and rejects unknown keys.
- **Provider mechanism reused, package-owning.** `AdminUiConfigProvider` (ui) and `AdminConfigProvider` (admin) accept per-package typed props (`i18n?`, `themeOverride?`), standalone-capable (inject `null` → own slice only). `AdminProvider` is the **aggregator** — its render mounts both internally, sourcing `themeOverride` from the active preset's `themeOverrides` and `i18n` from `i18nOverrides`; hosts never compose ConfigProviders manually.
- **`AdminProviderProps.i18nOverrides = RegistryI18nOverrides`** (i18n-only, derived from the registry). ThemeVar overrides come only from `AdminThemePreset.themeOverrides`.
- **`AdminPresetThemeOverrides = RegistryThemeOverrides`** (pure derivation — no hardcoded libraryIds/types). `AdminThemeOverrides`/`NoobUiThemeOverrides` also derive from `RegistryThemeOverrides`. naive-ui/pro-naive-ui theme feeds `naiveUiConfig.themeOverrides` via `mergeAdminNaiveUiThemeOverrides` (the visual path), NOT the registry.
- **Pull, not push.** Each component `inject`s the registry and reads only its own libraryId + kind + component slice. A Card structurally cannot read a Button's vars.
- **Component-side consumption is the ONLY difference** between kinds. Typing, registry, provider, and selector machinery are shared.
- **Migrate every existing registry caller** to the new shape/key/package (clean cutover, no aliases).
- **Public surface discipline.** `packages/{registry,i18n,ui,admin}/src/index.ts` are the only barrels; naive-ui/vue stay external. es-toolkit `merge` for any deep-merge.

## Acceptance Criteria

- [ ] `@noob-naive-ui/registry` exports the augmentation point + `libraryOverridesKey` + `LibraryOverridesRegistryValue` + derived `RegistryI18nOverrides`/`RegistryThemeOverrides`; `LibraryThemeOverrides` stays internal.
- [ ] admin + ui augment the registry with their FULL `locale`/`theme` types; registry preseeded with naive-ui/pro-naive-ui (`GlobalThemeOverrides`).
- [ ] `AdminUiConfigProvider` (ui) + `AdminConfigProvider` (admin) accept per-package `i18n`/`themeOverride` props, standalone-capable.
- [ ] `AdminProviderProps.i18nOverrides: RegistryI18nOverrides`; `AdminProvider` provides nothing, aggregates both ConfigProviders internally (themeOverride from active preset); hosts (demo) pass only `AdminProvider`.
- [ ] `AdminPresetThemeOverrides = RegistryThemeOverrides` (no hardcoded libraryIds); `AdminThemeOverrides`/`NoobUiThemeOverrides` derived from the registry.
- [ ] `useUiTheme` + theme typing: a consumer's `themeOverride.Card` autocompletes the Card's exact `--n-*` names and errors on unknown names.
- [ ] Proof `UiCard` declares typed vars, injects its branch via `useUiTheme("Card")`, binds them as CSS vars on its root; a sibling component's vars are unreachable.
- [ ] `mergeAdminNaiveUiThemeOverrides` reads the naive-ui/pro-naive-ui preset theme slices + font tier.
- [ ] `apps/demo/src/App.tsx` migrates to `AdminProvider`-only composition; admin i18n entries via `i18nOverrides` (typed by the registry projection).
- [ ] Every existing i18n registry consumer migrated; no stale `libraryI18nOverridesKey`/`LibraryI18nOverridesRegistry`/`naiveUiConfig` preset field remains.
- [ ] registry/i18n/ui/admin typecheck + build pass; tests pass; `dist/index.d.ts` exposes only deliberate APIs; naive-ui/vue external.

## Notes

- **Breaking** — intentional: registry moved to `@noob-naive-ui/registry`, entry types via module augmentation, `AdminThemePreset.naiveUiConfig` removed, `AdminProvider.overrides` renamed `i18nOverrides`, `LibraryI18nOverridesRegistry` eliminated. Clean cutover, no aliases.
- naive-ui/pro-naive-ui preseed their theme as `GlobalThemeOverrides` (the override form — their theme does not convert through `LibraryThemeOverrides`); the uniform conversion is a structural no-op for them.
- Both `AdminConfigProvider` and `AdminUiConfigProvider` may be used standalone; under `AdminProvider` they layer (nearest provider wins for its subtree, merging parent + own slice).
- Scope: **mechanism + both providers + one proof component only**. Real widgets and wiring into admin's theme-preset dropdown are follow-ups.

---
type: concept
title: AdminProvider, AdminConfigProvider, and useAdminProvider — Host Root Providers
description: The props-driven admin root provider component (and its per-package config provider sibling) plus the consumption composable — store initialization, menu configuration, global Composer seeding, registry override provision, and derived Naive UI config.
tags: [admin, provider, naive-ui, i18n, host, registry]
openwiki:
  roles: [architecture, domain, integration]
  change_kinds: [public-api, lifecycle]
  source_paths: [packages/admin/src/components/admin-provider.tsx, packages/admin/src/components/admin-config-provider.tsx, packages/admin/src/use-admin-provider.ts]
  symbols: [AdminProvider, AdminProviderProps, AdminConfigProvider, useAdminProvider, AdminProviderApi]
  test_paths: [packages/admin/tests/admin-provider.test.tsx, packages/admin/tests/use-admin-provider.test.ts]
  validation_commands: ["pnpm --filter @noob-naive-ui/admin test tests/admin-provider.test.tsx tests/use-admin-provider.test.ts"]
---

# AdminProvider, AdminConfigProvider, and useAdminProvider

`AdminProvider` (`components/admin-provider.tsx`) is the admin package's
**props-driven root provider**: it owns mount-safe host configuration that
previously lived hand-wired in the demo's `main.ts`/`App.tsx`. Hosts mount it once
under a configured Pinia and a global vue-i18n Composer, and it:

1. initializes the shell-preferences store from `storeOptions` (see
   [Preferences](preferences.md));
2. configures the shell menu store from the `menu` prop;
3. configures the host-supplied theme presets and polarity defaults from the
   `themes`/`defaultTheme`/`defaultDarkTheme` props (`provider.configureThemePresets` —
   see [Preferences](preferences.md));
4. seeds the host global Composer with the hydrated preference locale and with
   per-locale messages from `messages`, re-seeding on prop change (the HMR path);
5. renders the **aggregated config providers** — `AdminConfigProvider` (admin
   `{ i18n, theme }` slice), `AdminUiConfigProvider` (ui slice, from
   `@noob-naive-ui/ui`), and `ProConfigProvider` with the derived `naiveUiConfig`
   (theme, locale, dateLocale, componentOptions).

`AdminProvider` itself **never provides the registry**: it is the aggregator only,
passing per-package values to the config providers, which provide their own slices
of the shared `libraryOverridesKey` registry (see
[registry package](../registry.md)).

`AdminConfigProvider` (`components/admin-config-provider.tsx`) is the admin
package's per-library override provider. It is **standalone-capable**: rendered
outside any aggregator it supplies only its own slice; nested beneath an
aggregator or another provider it merges its slice over the parent value
(nearest provider wins for its subtree).

`useAdminProvider` (`use-admin-provider.ts`) is the **single public consumption
surface** for the package's presentational state (theme, locale, font size,
sidebar, menu) plus the derived presentation config. Consumers import
`AdminProviderApi` and call `useAdminProvider()`; the underlying Pinia stores
remain an implementation detail.

## Props (`AdminProviderProps`)

| Prop | Type | Meaning |
|---|---|---|
| `messages` | `Record<string, Record<string, unknown>>` | Per-locale message resources seeded into the host global Composer (`setLocaleMessage` per locale). |
| `menu` | `AdminMenuTree` (`MenuOption[]`) | The shell sidebar menu, configured into the menu store (configure-once). |
| `storeOptions?` | `AdminShellPreferencesStoreOptions` | Preferences `defaults`, `storage`, and `fallbackLocale` (see [Preferences](preferences.md)). |
| `themes?` | `AdminThemePreset[]` | Host-supplied selectable theme presets for the navbar dropdown (see [Preferences](preferences.md)). |
| `defaultTheme?` | `string` | Default light preset key, used while mode is `"system"` and the OS is light. |
| `defaultDarkTheme?` | `string` | Default dark preset key, used while mode is `"system"` and the OS is dark. |
| `i18nOverrides?` | `RegistryI18nOverrides` | The registry's i18n projection keyed by libraryId (from `@noob-naive-ui/registry`), e.g. `{ "noob-naive-ui:admin": {...} satisfies AdminLocaleOverrides, "naive-ui": {...} satisfies NaiveUiLocaleOverrides }`. **i18n-only**: themeVar overrides flow exclusively through the active preset's `themeOverrides`. The admin slice goes to `AdminConfigProvider`; the `"naive-ui"` slice is consumed by `useAdminProvider` (`naiveUiLocaleOverrides`) and merged over the preference-resolved base packs in `naiveUiConfig`. |

The host must `app.use(i18n)` and `app.use(createPinia())` before mounting this
component.

## Setup ordering (`components/admin-provider.tsx`)

```mermaid
sequenceDiagram
    participant H as Host app
    participant P as AdminProvider (aggregator)
    participant C as AdminConfigProvider
    participant U as AdminUiConfigProvider
    participant S as Pinia stores
    participant G as global Composer
    H->>P: mount with messages/menu/storeOptions/themes/i18nOverrides
    P->>S: preferences.initialize(storeOptions)
    P->>S: provider.configureThemePresets(themes, defaultTheme, defaultDarkTheme)
    P->>G: composer.locale.value = provider.locale.value
    P->>S: menu.configure(menu)
    P->>G: setLocaleMessage per locale (watch, immediate, re-seed)
    P->>C: pass admin i18n slice + preset themeOverride slice
    C->>C: provide(libraryOverridesKey, merged computed) — nearest wins
    P->>U: pass ui i18n slice + preset themeOverride slice
    U->>U: provide(libraryOverridesKey, merged computed) — nearest wins
    P->>P: render ProConfigProvider with derived naiveUiConfig (theme, locale, dateLocale, componentOptions)
```

*AdminProvider mount ordering: store initialization, Composer seeding, per-package registry slices, and derived config rendering.*

- Each `themeOverride` is sourced from the active preset's `themeOverrides`
  (per-library keyed — the sole theme source) and re-passed reactively on theme
  change; `AdminConfigProvider`/`AdminUiConfigProvider` merge it into the
  registry. The `i18n` reads are boundary-cast because `i18nOverrides` values are
  loose `unknown` while each config provider's `i18n` prop is per-package typed.
- The registry value is a `computed` built with es-toolkit `merge` over the
  parent value, so each slice is a fresh object (caller mutation after mount
  cannot leak in — proven by the "snapshots caller overrides" test) and the
  nearest provider wins for its subtree.
- Store initialization is idempotent across Vue HMR remounts because the
  preferences and menu stores once-guard their own initialization (a fresh
  provider setup re-uses the same store state).
- Seeding the Composer **locale** before child setup means the pre-auth login
  page renders the restored locale; `AdminShell` keeps synchronizing afterwards
  via `useGlobalI18nSync`.

## `useAdminProvider` API (`AdminProviderApi`)

State members are reactive refs (`Ref`/`ComputedRef`); actions are bound store
methods.

| Member | Kind | Meaning |
|---|---|---|
| `themeMode`, `themeKey`, `fontSize`, `locale`, `availableLocales`, `sidebarCollapsed` | `Ref` | Persisted preference fields projected from the store's `preferences` blob (`themeKey` is `""` until a preset is picked). |
| `themes` | `Ref<AdminThemePreset[]>` | Host-supplied selectable theme presets (navbar dropdown options; runtime-only, never persisted). |
| `activeTheme` | `ComputedRef<AdminThemePreset \| undefined>` | The resolved active preset, or undefined when none matches (see [Preferences](preferences.md)). |
| `isHydrated` | `Ref` | True once preferences have been hydrated from storage. |
| `preferences` | `ComputedRef<AdminShellPreferences>` | Full normalized snapshot (defensive copy of locale options). |
| `naiveUiConfig` | `ComputedRef<AdminNaiveUiConfig>` | Derived `ProConfigProvider`/`NConfigProvider` props: base theme from the active preset (or `resolveDefaultNaiveUiTheme` with the runtime dark signal), `themeOverrides` deep-merged via `mergeAdminNaiveUiThemeOverrides`, naive-ui `locale` + `dateLocale` (host fallback aware, host `naive-ui` registry overrides merged via `mergeAdminNaiveUiLocaleOverrides`), per-component `componentOptions`. |
| `proLayoutConfig` | `ComputedRef<ProLayoutProps>` | `{ collapsed: sidebarCollapsed }` for ProLayout. |
| `menu` | `Ref<AdminMenuTree>` | Reactive shell menu options. |
| `setThemeMode`, `setTheme`, `setFontSize`, `setLocale`, `setSidebarCollapsed`, `toggleSidebar`, `setAvailableLocales` | action | Write preference fields (`setTheme` pins the mode to the selected preset's polarity). |
| `configureThemePresets` | action | Writes the host-supplied preset list and polarity defaults into the runtime blob. |
| `setSystemUsesDark` | action | Runtime-only browser dark-mode signal (host `matchMedia` listener), never serialized. |
| `reset`, `replacePreferences` | action | Blob-level preference operations (composable normalizes input before calling). |

The composable accepts `useAdminProvider({ naiveUiLocaleOverrides })` — the host
`"naive-ui"` registry slice (`AdminProvider.i18nOverrides["naive-ui"]`), merged
over the preference-resolved base packs in `naiveUiConfig`.

Invariants proven by `use-admin-provider.test.ts` (9 `it`):

- **Pure projection**: `useAdminProvider` never initializes or configures the
  stores; before a consumer calls `preferences.initialize` /
  `menu.configure`, it surfaces the stores' unconfigured defaults
  (`isHydrated === false`, empty menu, locale `"en"`).
- **Store-owned state**: actions call through to the store blobs; derived
  config recomputes from raw store state (e.g. `setSystemUsesDark(true)` flips
  the system-mode theme to dark; `setFontSize("large")` re-sizes every
  component tier).
- **Theme-preset resolution**: `activeTheme` derives from the runtime presets,
  polarity defaults, mode, `themeKey`, and dark signal; `setTheme(key)` pins the
  mode to the preset's polarity; `naiveUiConfig` merges the preset's per-library
  themeOverrides with the font-size tier (proven by "resolves the active theme
  preset and merges its overrides").
- **Naive-ui locale override merging**: `mergeAdminNaiveUiLocaleOverrides`
  merges a partial pack over the base via naive-ui's `createLocale` (pack) and
  es-toolkit `merge` (date pack); untouched base packs are returned when no
  overrides are supplied; `naiveUiConfig` surfaces the merged packs.
- **Defensive snapshots**: `preferences` copies locale options; `naiveUiConfig`
  never exposes a global `size` knob — per-component sizes only.

## Change surface

To add a new persisted preference field:

1. Extend `AdminShellPreferences` in `runtime-contract.ts` and the
   `normalizedShellPreferencesSchema` in `runtime/shell-preferences.ts`
   (persisted shape stays a deliberate subset — see [Preferences](preferences.md)).
2. Project it in `useAdminProvider` (`toRef(store.preferences, ...)` + expose an
   action) and add the field to the `preferencesSnapshot` computed.
3. Optionally surface it through an `AdminProvider` prop if the host supplies
   the default.
4. Extend `shell-preferences.test.ts` (persistence) and
   `use-admin-provider.test.ts` (projection/derivation).

To migrate a host from the manual wiring (old demo `main.ts` pattern) to
`AdminProvider`: move `preferences.initialize(...)`, the global-Composer locale
seed, `menu.configure(...)`, theme-preset configuration
(`configureThemePresets`), and the former per-package plugin override install
into `<AdminProvider messages menu storeOptions themes defaultTheme
defaultDarkTheme i18nOverrides>`, then delete the manual calls. The
`i18nOverrides` prop supplies the registry's i18n projection in place of
`app.use(adminI18nPlugin, { messages })` ([Admin i18n](i18n.md)). The demo at
[apps/demo](../../apps/demo.md) is the reference migration.

## Tests

- `packages/admin/tests/admin-provider.test.tsx` (10 `it`): seeds the global
  Composer on mount; re-seeds when the `messages` prop changes; initializes the
  preferences store from `storeOptions`; configures the menu store from
  `menu`; renders an `NConfigProvider` (via `ProConfigProvider`) wrapping the
  default slot; configures the theme presets and polarity defaults from props;
  provides the admin text-override snapshot under `libraryOverridesKey`
  (registry entry for `"noob-naive-ui:admin"`); merges a preset ui theme entry +
  admin i18n into the registry seen by descendants; re-provides the ui
  `themeOverride` slice when the active theme changes; provides only its own
  slice when `AdminConfigProvider` is used standalone.
- `packages/admin/tests/use-admin-provider.test.ts` (9 `it`): reactive
  projection from configured stores; action call-through; pure-projection
  invariant; derivation of `preferences`/`naiveUiConfig`/`proLayoutConfig`
  from raw store state; active theme-preset resolution and override merging;
  naive-ui locale pack/date-pack override merging; merged packs surfaced in
  `naiveUiConfig`.

Narrowest validation: `pnpm --filter @noob-naive-ui/admin test
tests/admin-provider.test.tsx tests/use-admin-provider.test.ts`.

## Related

- [Admin overview](overview.md) — the public barrel this page is exported from
- [Preferences](preferences.md) — the store blobs `useAdminProvider` projects
- [Admin i18n](i18n.md) — the shared override registry replaced the per-package
  `adminI18nPlugin`
- [registry package](../registry.md) — the `libraryOverridesKey` the config
  providers provide
- [Shell](shell.md) — AdminShell and the navbar controls consume the provider
- [Demo host](../../apps/demo.md) — reference host mount

---
type: concept
title: Admin Shell Preferences and Naive UI Configuration
description: The persisted local display preferences store (theme mode, font size, locale, sidebar), its localStorage schema and hydration, and the derived NConfigProvider/ProLayout props.
tags: [admin, preferences, naive-ui, persistence]
---

# Admin Shell Preferences and Naive UI Configuration

`useAdminShellPreferencesStore` (`stores/shell-preferences.ts`) owns the
**local display preferences** rendered by the AdminShell navbar controls: theme
mode, theme presets, font size, locale, and sidebar collapse. The store is
deliberately opaque with respect to preference semantics: it holds two reactive
blobs and offers only blob-level persistence operations. Every semantic field,
setter, and derivation lives in the `useAdminProvider` composable
([Root Provider](provider.md)), which reads and mutates these blobs; consumers
should not import the store directly. Persistence is a thin, defensive
localStorage layer in `runtime/shell-preferences.ts`; Naive UI theming is
derived in `runtime/naive-ui-config.ts`.

## Preference model

```ts
type AdminShellPreferences = {
  themeMode: "light" | "dark" | "system";
  themeKey: string;                 // "" until a preset is picked
  fontSize: "small" | "medium" | "large";
  locale: string;
  availableLocales: AdminLocaleOption[];   // { key, label }
  sidebarCollapsed: boolean;
};
```

Defaults: `system` / `""` / `medium` / `en` / `[]` / `false`.

## Theme presets (`runtime-contract.ts` + `runtime/naive-ui-config.ts`)

`AdminThemePreset` is the host-supplied, navbar-selectable theme surface:

```ts
type AdminThemePreset = {
  key: string;                       // stable preset identity, persisted in themeKey
  label: I18nText;                   // resolved reactively against the nearest Composer
  themeOverrides: AdminPresetThemeOverrides; // per-library themeVar overrides (RegistryThemeOverrides)
  fontSizeOverrides?: Record<AdminFontSize, GlobalThemeOverrides>; // optional per-size layers
  isDark: boolean;                   // preset polarity (base darkTheme vs light)
};
```

- `AdminPresetThemeOverrides = RegistryThemeOverrides` — the registry's theme
  projection keyed by libraryId (see [registry package](../registry.md)).
  `naive-ui` and `pro-naive-ui` are preseeded (`GlobalThemeOverrides`; pro-naive-ui
  forwards its slice to naive-ui's `NConfigProvider`, so both merge into the same
  `themeOverrides`); admin and ui declare their own entries via module
  augmentation. Theme presets are the **sole source of themeVar overrides** —
  `AdminProvider`'s `i18nOverrides` prop never carries theme values.
- `themeKey` stores the last-picked preset key; `""` means "no preset picked
  yet", and resolution falls back to the polarity default.
- `resolveThemePreset(themes, defaultTheme, defaultDarkTheme, themeMode,
  themeKey, systemUsesDark)` picks the active preset by precedence: (1) an
  explicitly picked preset whose `isDark` matches the effective polarity when
  mode is `light`/`dark`; (2) the polarity default (`defaultDarkTheme` when
  dark, else `defaultTheme`); (3) the first preset of the effective polarity.
  While mode is `"system"`, the picked `themeKey` is ignored and the OS-driven
  polarity default wins.
- `mergeAdminNaiveUiThemeOverrides(size, preset)` deep-merges (es-toolkit
  `merge`) the active preset's `themeOverrides["naive-ui"]` and
  `themeOverrides["pro-naive-ui"]` with the font-size tier layer — the font-size
  layer is the source so the built-in hardcoded default font size wins over
  font-size values the preset sets directly, unless the preset ships its own
  `fontSizeOverrides[size]`.
- `resolveDefaultNaiveUiTheme(themeMode, systemUsesDark)` provides the
  no-preset fallback (`darkTheme` for dark or system+dark, else `null`).
- `setTheme(key)` (in `useAdminProvider`) selects a preset and **pins the mode
  to its polarity**; `configureThemePresets(themes, defaultTheme,
  defaultDarkTheme)` writes the host-supplied set and polarity defaults into the
  store's runtime blob. The navbar theme dropdown renders `themes` and is
  disabled when the list is empty (see [Shell](shell.md)).

## Store behavior

The store is a minimal, storage-only state store with two reactive blobs:

- `preferences` — the **persisted** blob (`AdminShellPreferences`, all fields
  stored).
- `runtime` — non-persisted runtime state: `isHydrated`, `systemUsesDark`
  (browser dark-mode signal), `fallbackLocale`, `themes` (host-supplied
  `AdminThemePreset[]`), `defaultTheme`/`defaultDarkTheme` (polarity-default
  preset keys for `"system"` mode).

Operations (blob-level only):

- `initialize(options)` — **called once by `AdminProvider` at mount** (not by
  the host entry point):
  - `defaults?: Partial<AdminShellPreferences>` (the demo passes
    `availableLocales` for en and zh-CN).
  - `storage?: AdminShellPreferencesStorage | null` — defaults to
    `globalThis.localStorage` when present (guarded, failure-safe); passing
    `null` disables persistence.
  - `fallbackLocale?: string` — host-owned naive-ui fallback locale
    (default `"en"`); runtime-only, never persisted.
  - Hydrates from storage without writing, then sets `runtime.isHydrated`.
- `replacePreferences(partial)` — merges a partial object into the blob
  **opaque, without normalization**; the `useAdminProvider` action normalizes
  input before calling.
- `reset(preferencesBlob)` — replaces the entire preferences blob.

The semantic mutators (`setThemeMode`, `setTheme`, `configureThemePresets`,
`setFontSize`, `setLocale`,
`setAvailableLocales` — which repairs an invalid active locale by falling back
to the first option or the default — `setSidebarCollapsed`, `toggleSidebar`,
`reset(defaults)`, `replacePreferences(partial)`, and `setSystemUsesDark`) and
the derived `preferences`/`naiveUiConfig`/`proLayoutConfig` computeds are all
owned by `useAdminProvider` — see [Root Provider](provider.md).

### Persistence (`runtime/shell-preferences.ts`)

- Storage key: `"@noob-naive-ui/admin:shell-preferences"`.
- Persisted shape is a subset (`themeMode`, `themeKey`, `fontSize`, `locale`,
  `sidebarCollapsed`); `availableLocales`, the theme presets/polarity defaults,
  and the system-dark signal are intentionally **not** persisted — locale
  options and theme presets always come from host defaults.
- Hydration reads and validates with Zod; malformed/unparseable payloads are
  removed and defaults returned. Mutation persistence is wired through
  `store.$subscribe(..., { detached: true, flush: "sync" })` with an
  `enablePersistence` flag so hydration and `reset` never write back what they
  just read.
- All storage access is wrapped in try/catch (`safeGetItem`/`safeSetItem`/
  `safeRemoveItem`); adapter failures degrade to no persistence, never throw.
- `normalizeShellPreferences` is the single normalization gate: unknown/missing
  fields fall back to defaults via Zod `.catch`/`.default`.

## Derived Naive UI configuration (`runtime/naive-ui-config.ts`)

The `useAdminProvider` composable derives two computed objects consumed by host
and shell (the store itself exposes only the raw blobs):

### `naiveUiConfig: AdminNaiveUiConfig` — for `<n-config-provider>`

- `theme`: the **active theme preset's base** when one resolves — `darkTheme`
  for a dark preset (`isDark`), `null` for a light preset — otherwise
  `resolveDefaultNaiveUiTheme(themeMode, systemUsesDark)` (`darkTheme` when the
  mode is `dark`, or `system` + dark signal; else `null`).
- `themeOverrides`: `mergeAdminNaiveUiThemeOverrides(fontSize, activeTheme)`
  deep-merges the active preset's `themeOverrides["naive-ui"]` +
  `themeOverrides["pro-naive-ui"]` over the fixed per-font-size
  overrides from `FONT_SIZE_OVERRIDES` (common font sizes, Typography header
  sizes, Flex gaps; the 13/14/16px mapping lives in exactly one place, and the
  font-size layer wins over preset font-size values unless the preset ships
  `fontSizeOverrides`).
- `locale` / `dateLocale`: `resolveAdminNaiveUiLocale(activeLocale,
  fallbackLocale)` maps `en` → `enUS`/`dateEnUS`, `zh-CN` → `zhCN`/`dateZhCN`;
  unsupported locales fall back to the host-owned fallback, then `null` (naive-ui
  keeps its built-in `enUS`). Host `"naive-ui"` registry overrides
  (`AdminProvider.i18nOverrides["naive-ui"]`, typed
  `NaiveUiLocaleOverrides`) are merged over the resolved base packs by
  `mergeAdminNaiveUiLocaleOverrides` — the pack half via naive-ui's own
  `createLocale` (`NPartialLocale` partial-over-base), the date half via
  es-toolkit `merge` over the full `NDateLocale` pack (naive-ui ships no date
  partial helper).
- `componentOptions`: `COMPONENT_SIZE_OPTIONS[fontSize]` — naive-ui has no single
  global size knob, so every supported component's `size` option is set to the
  active tier (30+ components, from AutoComplete to TreeSelect).

The host binds it directly by mounting `AdminProvider`, which spreads the
derived config onto its `ProConfigProvider` (see
[Root Provider](provider.md) and [demo App](../../apps/demo.md)). Because
naive-ui sets `body { font-size: 14px }` statically, the host additionally
applies `resolveAdminNaiveBaseFontSize(fontSize)` to its root element so
`rem`-based content scales with the preference.

### `proLayoutConfig: ProLayoutProps`

- Currently `{ collapsed: preferences.sidebarCollapsed }` — maps the collapse
  preference into pro-naive-ui's `ProLayout`. The tabbar container height follows
  the font-size tier so the shell's NTabs never overflow it (handled in shell
  CSS).

## Locale flow

The persisted preference locale is pushed **one way** into the host global
Composer by AdminShell's `useGlobalI18nSync(() => preferences.locale)`.
`AdminProvider` seeds the Composer with the hydrated preference locale at setup
so the pre-auth login page renders the restored locale before AdminShell mounts
([Root Provider](provider.md)). See [i18n package](../i18n.md) and
[Shell](shell.md).

## Tests

`packages/admin/tests/shell-preferences.test.ts` (6 `it`):
- hydrates defaults without browser storage;
- rehydrates persisted preferences and keeps locale options from defaults;
- writes only the persisted subset back to storage on mutation;
- drops malformed persisted payloads and falls back to defaults;
- maps each font-size preference to its CSS base font size;
- treats storage adapter failures as no persistence.

The `naiveUiConfig` derivation (including theme-preset resolution, per-library
override merging, and naive-ui locale pack merging) and the semantic mutators are
covered by `use-admin-provider.test.ts` (9 `it`, including "resolves the active
theme preset and merges its overrides" and the `createLocale`/date-pack merge
tests) and `admin-provider.test.tsx` (10 `it`, including "configures the theme
presets and polarity defaults from props" and "re-provides the ui themeOverride
slice when the active theme changes") — see [Root Provider](provider.md).

## Related

- [Admin overview](overview.md)
- [Root Provider](provider.md) — the composable that projects these blobs and
  the `AdminProvider` component that calls `initialize`
- [Shell and page-instance state machine](shell.md) — navbar controls mutate
  these preferences through `useAdminProvider`
- [Demo host](../../apps/demo.md) — `AdminProvider` mount and matchMedia wiring

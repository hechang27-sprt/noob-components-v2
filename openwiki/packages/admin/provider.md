---
type: concept
title: AdminProvider and useAdminProvider — Host Root Provider
description: The props-driven admin root provider component and its consumption composable — store initialization, menu configuration, global Composer seeding, i18n override provision, and derived Naive UI config.
tags: [admin, provider, naive-ui, i18n, host]
---

# AdminProvider and useAdminProvider

`AdminProvider` (`components/admin-provider.tsx`) is the admin package's
**props-driven root provider**: it owns mount-safe host configuration that
previously lived hand-wired in the demo's `main.ts`/`App.tsx`. Hosts mount it once
under a configured Pinia and a global vue-i18n Composer, and it:

1. provides the admin package's i18n text-override snapshot to descendants
   (replacing the former `app.use(adminI18nPlugin, { messages })` install — see
   [Admin i18n](i18n.md));
2. initializes the shell-preferences store from `storeOptions` (see
   [Preferences](preferences.md));
3. configures the shell menu store from the `menu` prop;
4. seeds the host global Composer with the hydrated preference locale and with
   per-locale messages from `messages`, re-seeding on prop change (the HMR path);
5. renders a Naive UI `NConfigProvider` whose theme/locale/componentOptions
   derive from the preferences store, with host `theme` overrides merged on top.

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
| `theme?` | `GlobalThemeOverrides` | Host naive-ui global theme overrides, spread **on top of** the derived font-size overrides. |
| `overrides?` | `AdminI18nPluginOptions["messages"]` | Per-locale, per-component overrides of admin package text; provided under `adminI18nOverridesKey`, which `createComponentI18n` injects when merging package text. |

The host must `app.use(i18n)` and `app.use(createPinia())` before mounting this
component.

## Setup ordering (`components/admin-provider.tsx`)

<!-- openwiki: mermaid parse failed and this diagram was converted to a text fence so it does not break rendering. Fix the diagram source and restore the mermaid fence. Parser error: Heuristic: a semicolon inside a label breaks rendering; rephrase the label. -->
```text
sequenceDiagram
    participant H as Host app
    participant P as AdminProvider
    participant S as stores (preferences/menu)
    participant C as global Composer
    H->>P: mount with messages/menu/storeOptions/overrides
    P->>P: provide(adminI18nOverridesKey, structuredClone(overrides) ?? {})
    P->>S: preferences.initialize(storeOptions)
    P->>C: composer.locale.value = provider.locale.value
    P->>S: menu.configure(menu)
    P->>C: setLocaleMessage(locale, messages) (watch, immediate; re-seed on prop change)
    P->>P: render NConfigProvider (derived config + host theme overrides)
```

- The override snapshot is defensively `structuredClone`d before `provide`, so
  mutating the host's objects after mount cannot affect current or future
  mounts.
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
| `themeMode`, `fontSize`, `locale`, `availableLocales`, `sidebarCollapsed` | `Ref` | Persisted preference fields projected from the store's `preferences` blob. |
| `isHydrated` | `Ref` | True once preferences have been hydrated from storage. |
| `preferences` | `ComputedRef<AdminShellPreferences>` | Full normalized snapshot (defensive copy of locale options). |
| `naiveUiConfig` | `ComputedRef<AdminNaiveUiConfig>` | Derived `NConfigProvider` props: theme (`resolveDefaultNaiveUiTheme` with the runtime dark signal), font-size `themeOverrides`, naive-ui `locale` (host fallback aware), per-component `componentOptions`. |
| `proLayoutConfig` | `ComputedRef<ProLayoutProps>` | `{ collapsed: sidebarCollapsed }` for ProLayout. |
| `menu` | `Ref<AdminMenuTree>` | Reactive shell menu options. |
| `setThemeMode`, `setFontSize`, `setLocale`, `setSidebarCollapsed`, `toggleSidebar`, `setAvailableLocales` | action | Write preference fields (blob-level writes). |
| `setSystemUsesDark` | action | Runtime-only browser dark-mode signal (host `matchMedia` listener), never serialized. |
| `reset`, `replacePreferences` | action | Blob-level preference operations (composable normalizes input before calling). |

Invariants proven by `use-admin-provider.test.ts`:

- **Pure projection**: `useAdminProvider` never initializes or configures the
  stores; before a consumer calls `preferences.initialize` /
  `menu.configure`, it surfaces the stores' unconfigured defaults
  (`isHydrated === false`, empty menu, locale `"en"`).
- **Store-owned state**: actions call through to the store blobs; derived
  config recomputes from raw store state (e.g. `setSystemUsesDark(true)` flips
  the system-mode theme to dark; `setFontSize("large")` re-sizes every
  component tier).
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
seed, `menu.configure(...)`, and `app.use(adminI18nPlugin, { messages })` into
`<AdminProvider messages menu storeOptions overrides>`, then delete the manual
calls. The demo at [apps/demo](../../apps/demo.md) is the reference migration.

## Tests

- `packages/admin/tests/admin-provider.test.tsx` (6 `it`): seeds the global
  Composer on mount; re-seeds when the `messages` prop changes; initializes the
  preferences store from `storeOptions`; configures the menu store from
  `menu`; renders an `NConfigProvider` wrapping the default slot; provides the
  override snapshot under `adminI18nOverridesKey`.
- `packages/admin/tests/use-admin-provider.test.ts` (4 `it`): reactive
  projection from configured stores; action call-through; pure-projection
  invariant; derivation of `preferences`/`naiveUiConfig`/`proLayoutConfig`
  from raw store state.

Narrowest validation: `pnpm --filter @noob-naive-ui/admin test
tests/admin-provider.test.tsx tests/use-admin-provider.test.ts`.

## Related

- [Admin overview](overview.md) — the public barrel this page is exported from
- [Preferences](preferences.md) — the store blobs `useAdminProvider` projects
- [Admin i18n](i18n.md) — the override snapshot replaced `adminI18nPlugin`
- [Shell](shell.md) — AdminShell and the navbar controls consume the provider
- [Demo host](../../apps/demo.md) — reference host mount

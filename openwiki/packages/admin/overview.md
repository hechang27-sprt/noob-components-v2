---
type: package
title: "@noob-naive-ui/admin"
description: The router-neutral Admin package — public barrel, runtime contracts, stores, shell components, naive-ui configuration, and i18n wiring that hosts configure and AdminShell consumes.
tags: [admin, package, pinia, naive-ui]
---

# `@noob-naive-ui/admin`

The router-neutral heart of the workspace: AdminShell presentation, the login
page, package-owned Pinia stores, and derived Naive UI configuration. It never
imports `vue-router` (enforced by build `external` lists and by design — see
[Ownership Contract](../../architecture/ownership-contract.md)).

Dependencies: `@noob-naive-ui/i18n`, `@noob-naive-ui/registry`, `@noob-naive-ui/ui`,
`@vicons/ionicons5`, `es-toolkit` (deep `isEqual` for destination equality,
`merge` for override merging), `zod`. Peers: `naive-ui`, `pinia`, `pro-naive-ui`,
`vue`, `vue-i18n` (all `catalog:`).

## Public surface (`src/index.ts`)

The barrel re-exports:

- **Runtime contract types** from `runtime-contract.ts`:
  `AdminAuthStatus`, `AdminAuthIdentity`, `AdminAuthRestoreResult`,
  `AdminLoginValues`, `AdminRouteKey`, `AdminMenuTree` (= Naive UI `MenuOption[]`),
  `AdminThemeMode` ("light" | "dark" | "system"), `AdminFontSize`
  ("small" | "medium" | "large"), `AdminThemePreset` (navbar-selectable theme
  presets with per-font-size override layers), `AdminLocaleOption`,
  `AdminShellPreferences`.
- **Stores**: only `useAdminAuthStore` (+ `AdminAuthStore`,
  `AdminAuthStoreConfig`) and `useAdminShellNavigationStore` are re-exported from
  the barrel. `useAdminShellPreferencesStore` and `useAdminShellMenuStore` are
  **module-internal** — consumers reach preferences/menu state through
  `useAdminProvider` (see [Root Provider](provider.md) and
  [runtime stores](runtime-stores.md)).
- **i18n**: `AdminI18nSnapshot` (type only, from `i18n/plugin.ts`); the
  `adminI18n` stable library key (`"noob-naive-ui:admin"`) is
  **module-internal** — hosts override package text through the shared
  libraryId-keyed override registry (`libraryOverridesKey` from
  `@noob-naive-ui/registry`, see [registry package](../registry.md)), supplied
  via the `AdminProvider` `i18nOverrides` prop and provided per-package by
  `AdminConfigProvider`. Plus `AdminLocale`-family types (`AdminComponentId`,
  `AdminLocaleName`, `AdminLocaleOverrides`, `AdminShellLocale`,
  `AdminLoginPageLocale`).
- **Naive UI config helpers**: `resolveAdminNaiveBaseFontSize`,
  `resolveAdminNaiveUiLocale`, `AdminNaiveUiConfig` — see
  [Preferences](preferences.md).
- **Root provider and consumption surface**: `AdminProvider` (+ `AdminProviderProps`)
  and `useAdminProvider` (+ `AdminProviderApi`) — the props-driven root provider
  that initializes stores, seeds the global Composer, passes per-package override
  slices to the config providers, and renders the naive-ui config; see
  [Root Provider](provider.md).
- **Per-package override provider**: `AdminConfigProvider` (+
  `AdminConfigProviderProps`) — provides the admin `{ i18n, theme }` slice into
  the shared registry, standalone-capable or nested beneath an aggregator.
- **Components**: `AdminLoginPage`, `AdminShell` and the full
  `AdminShell*` navigation/tab type family, `useAdminShell`, `AdminShellContext`
  — see [Shell](shell.md) and [Auth](auth.md).

`src/index.ts` also imports `./style.css` for side effects.

## Module map

```text
src/
  index.ts                    public barrel
  runtime-contract.ts         router-neutral public types
  runtime/
    naive-ui-config.ts        theme/locale/font-size/component-size derivation + theme-preset resolution
    shell-preferences.ts      persistence schema, storage adapter, load/normalize/persist
  stores/
    auth.ts                   useAdminAuthStore (see auth.md)
    navigation.ts             useAdminShellNavigationStore (see runtime-stores.md)
    menu.ts                   useAdminShellMenuStore (see runtime-stores.md)
    shell-preferences.ts      useAdminShellPreferencesStore (see preferences.md)
    tabs.ts                   useAdminShellTabsStore (see shell.md)
  components/
    admin-provider.tsx         AdminProvider root provider + aggregator (provider.md)
    admin-config-provider.tsx  AdminConfigProvider — admin slice of the shared registry
    admin-shell.tsx            AdminShell + navigation request contract
    admin-shell-tabbar.tsx    tab strip slot
    admin-shell-navbar-controls.tsx  nav-left/nav-right slot controls
    admin-login-page.tsx      login presentation
    use-admin-shell.ts        AdminShellContext + useAdminShell
    use-admin-shell-tabs.ts   page-instance tab state machine
  use-admin-provider.ts       useAdminProvider composable (provider.md)
  i18n/
    plugin.ts                 adminI18n library key + AdminI18nSnapshot type
    admin-locale.ts           locale typing over generated types (registry-derived overrides)
  locales/
    AdminShell.json           en/zh-CN packaged messages
    AdminLoginPage.json       en/zh-CN packaged messages
    locale-types.generated.ts generated by tooling/vite/json-locale-types (committed)
  style.css                   Tailwind v4 layers; imports ui style; @source ./components
```

## Key invariants

- **Router-neutrality**: no `vue-router` import anywhere; navigation happens
  exclusively through the `AdminShellNavigation` controller configured by the
  host (admin-vue-router supplies the Vue Router-backed implementation).
- **Host-authoritative active state**: `AdminShellNavigation.active` is the only
  source of truth for selected menu and tab state; the shell never decides
  routing outcomes.
- **Stores are configure-once**: auth, navigation, and menu stores silently
  ignore subsequent `configure` calls per Pinia instance (see
  [runtime-stores](runtime-stores.md)).
- **Callbacks and controllers live outside Pinia state**: non-serializable
  objects (navigation controller, auth callbacks) are held in module/closure
  scope or `shallowRef`, never in the serializable state tree.
- **Deliberately private surface**: the tab registry store
  `useAdminShellTabsStore` and its composable `useAdminShellTabs` are **not
  re-exported** from `src/index.ts` (shell-internal orchestration only), and the
  context key `adminShellContextKey` is documented as "not part of the public
  barrel surface" — descendants use `useAdminShell()`. The `adminI18n` library
  key is likewise module-internal; hosts address the admin registry slice by
  string key through `AdminProvider`'s `i18nOverrides` prop.
- **Single consumption surface for presentational state**: hosts, shell chrome,
  and demo pages reach theme/locale/font-size/sidebar/menu state through
  `useAdminProvider()`, not through the underlying Pinia stores, which remain an
  implementation detail ([Root Provider](provider.md)).

## Build contract

Library-mode Vite build (ES) with `unplugin-dts` declarations, `cssFileName:
"style"`, `exports["./style.css"]`, and `sideEffects: ["**/*.css"]`; Tailwind v4
stylesheet with preflight disabled that hosts must import. The build externalizes
all runtime deps — workspace packages `@noob-naive-ui/i18n`,
`@noob-naive-ui/registry`, and `@noob-naive-ui/ui`, plus `naive-ui`, `pinia`,
`pro-naive-ui`, `vue`, `vue-i18n`, `zod`, `@vicons/ionicons5` — via
`rolldownOptions.external` (which is also the router-neutrality enforcement: no
`vue-router` entry). The generated
locale types live under `src/` so `dist/locales/locale-types.generated.d.ts` is
emitted for consumers. Details in [Repository Overview — build pipeline](../../architecture/overview.md).

## Pages in this section

- [Auth store and login page](auth.md)
- [Shell, tabbar, and page-instance state machine](shell.md)
- [Shell preferences and Naive UI config](preferences.md)
- [Admin i18n library key and locale resources](i18n.md)
- [Navigation and menu runtime stores](runtime-stores.md)
- [AdminProvider and useAdminProvider](provider.md)

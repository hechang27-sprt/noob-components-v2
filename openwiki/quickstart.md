---
type: guide
title: OpenWiki Quickstart — noob-components-v2
description: "Entry point to the repository wiki: workspace map, package surfaces, the concepts behind the admin shell and router integration, and a task-routing table from change intent to pages, symbols, tests, and validation."
tags: [quickstart, architecture, navigation, admin]
---

# OpenWiki Quickstart

`noob-components-v2` is a pnpm workspace shipping **reusable, router-neutral
admin building blocks** for Vue 3 + TypeScript: a shared libraryId-keyed
override registry (unified i18n + themeVars), an admin
shell and stores, a Vue Router integration package, and a backend-free demo host
that assembles the full stack. Start with
[Repository Overview](architecture/overview.md) for the workspace map and the
domain glossary, and
[Ownership Contract](architecture/ownership-contract.md) for the canonical
system boundaries (shell vs. router vs. host).

## Wiki map

| Section | Covers |
|---|---|
| [Architecture](architecture/overview.md) | Workspace topology, dependency direction, build/declaration pipeline, glossary; [ownership contract](architecture/ownership-contract.md) for the settled shell/router/host split |
| [Packages — registry](packages/registry.md) | `LibraryOverridesRegistry` schema + derived i18n/theme projections, preseeded `naive-ui`/`pro-naive-ui` entries, and the shared `libraryOverridesKey` — the type-level foundation every component package augments |
| [Packages — i18n](packages/i18n.md) | `I18nText`/`i18nTextSchema`, `createComponentI18n`/`getComponentI18n` (registry-typed via `libraryId`), `useGlobalI18nSync`, `emptySnapshot`/`selectComponentOverrides` |
| [Packages — ui](packages/ui.md) | `Example` proof component + `CardTabs` connected tab bar, `AdminUiConfigProvider`/`useUiTheme`/`useUiCssVarsFor`/`noobUiTheme` (registry-backed, `noob-ui` CSS prefix), locale + theme augmentations |
| [Packages — admin](packages/admin/overview.md) | Router-neutral shell ([shell.md](packages/admin/shell.md)), root provider + `AdminConfigProvider` aggregator ([provider.md](packages/admin/provider.md)), auth store ([auth.md](packages/admin/auth.md)), preferences ([preferences.md](packages/admin/preferences.md)), i18n key/registry ([i18n.md](packages/admin/i18n.md)), runtime stores ([runtime-stores.md](packages/admin/runtime-stores.md)) |
| [Packages — admin-vue-router](packages/admin-vue-router/overview.md) | Router plugin ([plugin.md](packages/admin-vue-router/plugin.md)), navigation runtime/scope guard ([navigation-runtime.md](packages/admin-vue-router/navigation-runtime.md)), route registry/codecs ([route-registry.md](packages/admin-vue-router/route-registry.md)) |
| [Packages — prototype-i18n-verification](packages/prototype-i18n-verification.md) | Standalone i18n plugin + `PrototypeCard` (hand-rolled equivalent, `fallbackRoot = false`) |
| [Apps — demo host](apps/demo.md) | End-to-end assembly in `apps/demo/src/main.ts`; [admin-starter](apps/admin-starter.md) is a stub |
| [Tooling — Vite plugins](tooling/vite-plugins.md) | JSON→TS locale-type generator and workspace vue-i18n preset + HMR companion |
| [Testing](testing.md) | Suite inventory, harness conventions, and the full per-change validation matrix |

## Core concepts in one paragraph

Hosts define **navigation target keys** (`navKey`) bound to name-free route
records and optional reversible Zod payload codecs
([route-registry.md](packages/admin-vue-router/route-registry.md)). The
router-neutral `@noob-naive-ui/admin` shell owns **page instances** (one
identity-bearing open occurrence of a destination), tab ordering, and the
open/activate/close/heal state machine
([shell.md](packages/admin/shell.md)). `@noob-naive-ui/admin-vue-router`
answers those router-neutral requests against Vue Router and browser history —
persisting `{scopeId, tab}` under the reserved `_noobAdminShell` history-state
key, healing stale entries, and repairing history across **navigation scopes**
(epochs isolating history across an authenticated-context transition)
([navigation-runtime.md](packages/admin-vue-router/navigation-runtime.md)).
`createAdminRouterPlugin` owns the generated login/shell routes, auth and scope
guards, auth-transition routing, and deterministic disposal
([plugin.md](packages/admin-vue-router/plugin.md)). Every component package
declares its full locale + themeVar schema into the framework-wide
`@noob-naive-ui/registry` schema (`LibraryOverridesRegistry` module
augmentation); the registry derives per-library override types, the single
shared `libraryOverridesKey`, and the runtime theme resolution (`useTheme` /
`themeFontSizeKey`) that turns declared camelCase themeVars into
`--noob-ui-…` CSS custom properties and resolves size-keyed values
([registry.md](packages/registry.md)). Hosts mount the package-owned
`AdminProvider` root component, which aggregates the per-package
`AdminConfigProvider`/`AdminUiConfigProvider` registry slices, initializes
preferences and the menu, seeds the global Composer, and supplies i18n overrides
through the `i18nOverrides` prop
([provider.md](packages/admin/provider.md)). Two invariants anchor
everything: **admin never imports vue-router** (router-neutrality), and
**`AdminShellNavigation.active` is the only source of truth** for what the shell
renders as active.

## Public API surface at a glance

| Package | Key exports (`src/index.ts`) |
|---|---|
| `@noob-naive-ui/registry` | `libraryOverridesKey`, `LibraryOverridesRegistry` (augmentation seam), `RegistryI18nOverrides`, `RegistryThemeOverrides`, `DeepPartial`, `RegistryLocale*`/`RegistryI18nLibraryKey`, `LibraryThemeDescriptor`, `NaiveUiLocale` |
| `@noob-naive-ui/i18n` | `createComponentI18n`, `getComponentI18n`, `useGlobalI18nSync`, `selectComponentOverrides`, `emptySnapshot`, `i18nTextSchema`, `resolveI18nText`, `I18nText` + `CreateComponentI18nOptions` |
| `@noob-naive-ui/admin` | `AdminProvider`, `useAdminProvider`, `AdminConfigProvider`, `AdminShell`, `AdminLoginPage`, `useAdminShell`, `useAdminAuthStore`, `useAdminShellNavigationStore`, `resolveAdminNaiveUiLocale`, `resolveAdminNaiveBaseFontSize`, `AdminShell*` type family + runtime-contract types (`AdminThemePreset`, `AdminPresetThemeOverrides`, etc.) (deliberately **not** exported: `useAdminShellTabsStore`, `useAdminShellTabs`, `useAdminShellPreferencesStore`, `useAdminShellMenuStore`, `adminShellContextKey`, `LIB_ID` library key) |
| `@noob-naive-ui/ui` | `Example`, `CardTabs`, `AdminUiConfigProvider`, `useUiTheme`, `useUiCssVarsFor`, `noobUiTheme`, `CSS_PREFIX`, `NoobUiThemeComponents`/`NoobUiThemeOverrides` + `NoobUi*` i18n types |
| `@noob-naive-ui/admin-vue-router` | `createAdminRouterPlugin` (+ `ADMIN_DISPOSE_KEY`), `createAdminShellVueRouterRuntime`, `defineAdminRouteRegistry`, `defineAdminRouteUrlCodec`, `AdminRouteOverride` |
| `@noob-naive-ui/prototype-i18n-verification` | `PrototypeCard`, hand-rolled plugin with `fallbackRoot = false` |
| `tooling/vite/json-locale-types.ts` | `generateJsonLocaleTypes`, `regenerateLocaleTypes`, `scanJsonLocaleFiles`, `pascalCaseTypeName`, `createJsonLocaleTypesPlugin`, `createJsonLocaleTypesWatcherPlugin` |
| `tooling/vite/vue-i18n.ts` | `createWorkspaceVueI18nPlugin` |

## Task routing — from change intent to evidence

| Change intent | Wiki page | Source entrypoints / symbols | Focused tests | Narrowest validation |
|---|---|---|---|---|
| i18n text values / component i18n / global sync | [packages/i18n.md](packages/i18n.md) | `packages/i18n/src/{use-component-i18n,use-global-i18n-sync,i18n-text}.ts` (+ `@noob-naive-ui/registry` projections) | `i18n/tests/{i18n-text,library-i18n-selector,use-component-i18n,use-global-i18n-sync}.test.*` | `pnpm --filter @noob-naive-ui/i18n test` |
| Registry schema / projections / key / theme runtime | [packages/registry.md](packages/registry.md) | `packages/registry/src/{library-overrides-registry,library-i18n-overrides,library-theme-overrides,naive-ui-locale,use-theme,theme-font-size}.ts` | `registry/tests/library-overrides-registry.test.ts`, `i18n/tests/library-i18n-selector.test.ts`, `ui/tests/use-ui-theme.test.tsx` (theme runtime) | `pnpm --filter @noob-naive-ui/registry test` |
| Admin i18n library key / locale resources | [packages/admin/i18n.md](packages/admin/i18n.md) | `packages/admin/src/{i18n.ts,registry.ts}`, `locales/*.json` + generated `locale-types.generated.ts`, `AdminProvider` `i18nOverrides` prop | `admin/tests/i18n-contract.test.tsx`, `admin/tests/admin-provider.test.tsx`, `json-locale-types.test.ts` | `pnpm --filter @noob-naive-ui/admin test tests/i18n-contract.test.tsx` (typecheck after locale-JSON regen) |
| Shell layout / tab state machine / heal | [packages/admin/shell.md](packages/admin/shell.md) | `components/admin-shell.tsx`, `use-admin-shell-tabs.ts`, `stores/tabs.ts` | `admin/tests/admin-shell.test.tsx` | `pnpm --filter @noob-naive-ui/admin test tests/admin-shell.test.tsx` |
| Auth store / login page / restoration | [packages/admin/auth.md](packages/admin/auth.md) | `stores/auth.ts`, `components/admin-login-page.tsx` | `admin/tests/{auth-store.test.ts,admin-login-page.test.tsx}` | `pnpm --filter @noob-naive-ui/admin test tests/auth-store.test.ts tests/admin-login-page.test.tsx` |
| Preferences persistence / naive-ui config / theme presets | [packages/admin/preferences.md](packages/admin/preferences.md) | `runtime/shell-preferences.ts`, `runtime/naive-ui-config.ts`, `runtime-contract.ts` (`AdminThemePreset`), `stores/shell-preferences.ts`, `use-admin-provider.ts` | `admin/tests/shell-preferences.test.ts`, `use-admin-provider.test.ts` (preset resolution), `admin-provider.test.tsx` (prop wiring) | `pnpm --filter @noob-naive-ui/admin test tests/shell-preferences.test.ts tests/use-admin-provider.test.ts` |
| Root provider / host wiring / `useAdminProvider` | [packages/admin/provider.md](packages/admin/provider.md) | `components/admin-provider.tsx`, `components/admin-config-provider.tsx`, `use-admin-provider.ts`, `index.ts` | `admin/tests/admin-provider.test.tsx`, `use-admin-provider.test.ts` | `pnpm --filter @noob-naive-ui/admin test tests/admin-provider.test.tsx tests/use-admin-provider.test.ts` |
| Route registry / URL codecs / destination↔URL | [packages/admin-vue-router/route-registry.md](packages/admin-vue-router/route-registry.md) | `admin-vue-router/src/route-registry.ts` | `admin-vue-router/tests/route-registry.test.ts` | `pnpm --filter @noob-naive-ui/admin-vue-router test tests/route-registry.test.ts` |
| Navigation adapter / scope guard / enterScope / persisted state | [packages/admin-vue-router/navigation-runtime.md](packages/admin-vue-router/navigation-runtime.md) | `admin-vue-router/src/navigation.ts` | `admin-vue-router/tests/navigation.test.ts` | `pnpm --filter @noob-naive-ui/admin-vue-router test tests/navigation.test.ts` |
| Router plugin / guards / dispose / redirect restoration | [packages/admin-vue-router/plugin.md](packages/admin-vue-router/plugin.md) | `admin-vue-router/src/create-admin-router.ts` | `admin-vue-router/tests/create-admin-router.test.ts` | `pnpm --filter @noob-naive-ui/admin-vue-router test tests/create-admin-router.test.ts` |
| Locale-type codegen / build plugins / HMR | [tooling/vite-plugins.md](tooling/vite-plugins.md) | `tooling/vite/{json-locale-types,vue-i18n}.ts`, package `vite.config.ts` | `admin/tests/json-locale-types.test.ts` (includes no-drift) | `pnpm --filter @noob-naive-ui/admin test tests/json-locale-types.test.ts` |
| Demo assembly / end-to-end wiring | [apps/demo.md](apps/demo.md) | `apps/demo/src/{main.ts,App.tsx,routes.ts,i18n.ts,themes.ts}` | `admin/tests/admin-provider.test.tsx` (provider contract the demo relies on) | `pnpm --filter demo typecheck && pnpm --filter demo build` |
| ui package surface (i18n + themeVars + components) | [packages/ui.md](packages/ui.md) | `packages/ui/src/{index.ts,theme.ts,i18n.ts,config-provider.tsx,components/*}` | `ui/tests/use-ui-theme.test.tsx` | `pnpm --filter @noob-naive-ui/ui test && pnpm --filter @noob-naive-ui/ui typecheck` |
| CardTabs strip / runtime / keyboard nav | [packages/ui.md](packages/ui.md) + [packages/admin/shell.md](packages/admin/shell.md) | `packages/ui/src/components/card-tabs/{root,runtime,tab,theme}.ts*` | `admin/tests/admin-shell.test.tsx` (tab strip) | `pnpm --filter @noob-naive-ui/ui test && pnpm --filter @noob-naive-ui/admin test tests/admin-shell.test.tsx` |
| Browser-level theme/tab-bar behavior | [testing.md](testing.md#e2e-playwright) | `e2e/theme-switch-bugs.spec.ts`, `playwright.config.ts` | e2e suite | `pnpm --filter demo dev` then `pnpm exec playwright test` |
| Prototype i18n verification | [packages/prototype-i18n-verification.md](packages/prototype-i18n-verification.md) | `packages/prototype-i18n-verification/src/` | `prototype-i18n-verification/tests/i18n-contract.test.ts` | `pnpm --filter @noob-naive-ui/prototype-i18n-verification test` |
| Cross-package change / full CI | [testing.md](testing.md) + [architecture/overview.md](architecture/overview.md) | — | all suites | `pnpm -r --if-present typecheck && pnpm -r --if-present test && pnpm build` |

## Suggested reading order

1. [Repository Overview](architecture/overview.md) — map, glossary, build pipeline
2. [Ownership Contract](architecture/ownership-contract.md) — why shell, router, and host are separate
3. [packages/registry.md](packages/registry.md) — the override-registry schema every package augments
4. [packages/i18n.md](packages/i18n.md) — the i18n foundation every package builds on
5. [admin overview](packages/admin/overview.md) → [provider](packages/admin/provider.md), [shell](packages/admin/shell.md), [auth](packages/admin/auth.md)
6. [admin-vue-router overview](packages/admin-vue-router/overview.md) → [plugin](packages/admin-vue-router/plugin.md), [navigation-runtime](packages/admin-vue-router/navigation-runtime.md), [route-registry](packages/admin-vue-router/route-registry.md)
7. [apps/demo.md](apps/demo.md) — see it all assembled
8. [tooling/vite-plugins.md](tooling/vite-plugins.md) + [testing.md](testing.md) when changing build or tests

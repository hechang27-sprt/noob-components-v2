# PRD: Fold per-package i18n plugin logic into a shared plugin factory

Parent: `07-31-library-i18n-integration` (child, alongside `08-04-shared-i18n-composables` and `08-04-json-locale-types-plugin`)
Status: planning

## Problem

The plugin half of the library i18n contract is still duplicated per package.
`packages/admin/src/i18n/plugin.ts` hand-writes an injection key, a frozen
empty snapshot, a defensive-copy plugin, and two component selectors
(`selectAdminShellOverrides`, `selectAdminLoginPageOverrides`) plus a private
`DeepPartial`; `packages/ui/src/i18n/plugin.ts` duplicates the same key /
snapshot / plugin scaffolding for an empty component set. Meanwhile
`useComponentI18n` requires every call site to pass the package's
`overridesKey`, `emptySnapshot`, and a per-component `selectOverrides`
function.

This boilerplate is unnecessary: locale resources are standardized at
`src/locales/<ComponentName>.json` (locale-first records) and message-shape
types are generated from them (`src/locales/locale-types.generated.ts`), so
the override transport, the empty snapshot, and the component slice selector
are all derivable from the library's locale schema. The shared
`@noob-naive-ui/i18n` package should own one generic plugin factory; the
packages should only supply their locale schema.

## Goals

1. `@noob-naive-ui/i18n` exports `createLibraryI18nPlugin<LocaleName, Locale>({ libraryId })`
   producing the Vue plugin, its typed injection key, the frozen empty
   snapshot, and a generic `selectComponentOverrides(messages, componentId)`
   — one implementation for any component library.
2. `packages/admin/src/i18n/plugin.ts` and `packages/ui/src/i18n/plugin.ts`
   become thin instantiations of the factory (no hand-written key, snapshot,
   selector, or `DeepPartial`).
3. `useComponentI18n` takes `{ messages, plugin, componentId }` — the
   per-package `overridesKey` / `emptySnapshot` / `selectOverrides` options
   disappear; the component slice is selected generically by its resource
   file stem.
4. `AdminLocaleOverrides` derives from the shared override type so the
   `DeepPartial` machinery lives in exactly one place.

## Non-goals

- No change to override semantics, precedence, immutability, locale
  ownership, or fallback authority (parent-task contracts stand).
- No change to locale resources, message keys, or the generated locale types
  module.
- No change to `I18nText` / `i18nTextSchema` / `resolveI18nText` /
  `useGlobalI18nSync`.
- No change to the admin package's public plugin API surface that hosts
  rely on (`adminI18nPlugin`, `adminI18nOverridesKey`, `DEFAULT_SNAPSHOT`,
  `AdminI18nPluginOptions`, `AdminI18nSnapshot` keep their names and shapes).
- No new component translations.

## Acceptance criteria

1. `createLibraryI18nPlugin` exists in `@noob-naive-ui/i18n` and is the only
   implementation of the plugin / key / empty-snapshot / selector transport;
   neither `admin` nor `ui` contains hand-written equivalents (grep for
   `app.provide` and `Object.freeze({ messages` outside `packages/i18n` is
   empty).
2. `useComponentI18n({ messages, plugin, componentId })` works for both
   packaged-defaults-only and plugin-override paths; the per-package
   selector functions are deleted and every call site migrates (clean
   cutover, no shims).
3. `packages/admin` public exports keep `adminI18nPlugin`,
   `adminI18nOverridesKey`, `DEFAULT_SNAPSHOT`, `AdminI18nPluginOptions`,
   `AdminI18nSnapshot`; `selectAdminShellOverrides` /
   `selectAdminLoginPageOverrides` are removed with all importers updated
   (components, tests, barrel).
4. `packages/ui` instantiates the factory with an empty component schema;
   `noobUiI18nPlugin` and its exported types behave identically; `ui`
   declares `@noob-naive-ui/i18n` as a `workspace:*` dependency and adds it
   to build externals.
5. `AdminLocaleOverrides` / `NoobUiLocaleOverrides` derive from the shared
   override type; the per-package `DeepPartial` definitions are deleted.
6. Tests: i18n package covers the factory (snapshot immutability, generic
   slice selection, empty-library instantiation) and the refactored
   composable; admin contract tests migrate to the factory's generic
   selector; existing behavior assertions unchanged.
7. Gates green: `pnpm exec tsc -b --noEmit`, `pnpm lint`, `pnpm format:check`,
   `pnpm --filter @noob-naive-ui/i18n test`, admin + admin-vue-router + ui
   test suites, builds for i18n/admin/admin-vue-router/ui/demo.
8. `library-i18n-contract.md` spec updated to the plugin-factory contract
   (`createLibraryI18nPlugin`, `useComponentI18n({ messages, plugin,
   componentId })`).

# PRD: Extract shared i18n composables into internal @noob-naive-ui/i18n package

Parent: `07-31-library-i18n-integration` (child of `08-03-library-i18n-scaffolding`)
Status: planning

## Problem

`AdminShell` (`admin-shell.tsx:L221-265`) and `AdminLoginPage`
(`admin-login-page.tsx:L61-105`) contain byte-identical i18n setup blocks:
inject the plugin override snapshot (with frozen empty fallback), create a
local Composer (`useScope: "local"`, `inheritLocale: true`,
`fallbackRoot: false`), apply the vue-i18n 11.4.8 post-creation
`fallbackRoot = false` correction, destructure `mergeLocaleMessage`/`t`,
then merge packaged defaults followed by the component override slice.
`AdminShell` additionally repeats a store-locale → global-Composer watcher
that any future package component needing locale sync would copy.

These are reusable library behaviors. `I18nText` (type, Zod codec,
resolver) is already a cross-package primitive (admin + admin-vue-router +
demo's descriptor typing) but currently lives inside `@noob-naive-ui/admin`,
forcing `admin-vue-router` to depend on `@noob-naive-ui/admin` (currently
undeclared) just for the schema.

## Goals

1. New internal workspace package `@noob-naive-ui/i18n` (`packages/i18n`,
   private, following the admin package's build/typecheck/test conventions)
   hosting all shared i18n logic.
2. Move the `I18nText` primitives there: `I18nText` type, Zod codec
   (renamed `i18nTextSchema` — the `admin` prefix is wrong in a shared
   home), and `resolveI18nText`.
3. Extract the duplicated composer setup into a `useComponentI18n`
   composable: override injection + local-Composer creation + the 11.4.8
   fallbackRoot correction + defaults-then-overrides merge, returning
   `{ composer, t, locale }`.
4. Extract the store-locale → global-Composer sync into a
   `useGlobalLocaleSync(source)` composable (immediate by default).
5. Refactor `AdminShell` and `AdminLoginPage` onto the composables with
   identical runtime behavior.

## Non-goals

- No change to locale resources, message keys, or override semantics.
- No change to `adminI18nPlugin`'s public options contract.
- No Composer in serializable Pinia state; locale stays one-way
  store → Composer (existing contract preserved).
- Not touching the prototype package, admin-starter, or the demo's menu
  mechanism.

## Acceptance criteria

1. No duplicated inject/composer/merge blocks remain in admin components —
   each component's i18n setup is one composable call plus its own
   messages/selector arguments.
2. All `I18nText`/`i18nTextSchema`/`resolveI18nText` importers resolve from
   `@noob-naive-ui/i18n`; the admin barrel no longer exports the moved
   symbols (clean cutover, no shims).
3. `admin` and `admin-vue-router` declare `@noob-naive-ui/i18n` as a
   `workspace:*` dependency; `packages/i18n` is registered in
   pnpm-workspace.yaml and both tsconfig path maps.
4. New composable tests in `packages/i18n` cover: defaults-then-overrides
   precedence, absent-plugin empty-snapshot path, post-creation
   `fallbackRoot = false`, returned `t` renders merged messages, and
   `useGlobalLocaleSync` writes the watched locale into the global
   Composer.
5. Full gates green: `tsc -b --noEmit`, oxlint, format:check, builds
   (admin, admin-vue-router, ui, i18n, demo), 51 admin + 69 router tests +
   new i18n package tests.
6. Browser regression: en↔zh-CN switch still updates shell, menu, page, and
   reactive tab titles; login page renders localized; fr unsupported-locale
   fallback unchanged.

---
type: concept
title: Tooling — Workspace Vite Plugins
description: The two monorepo Vite plugins — the workspace vue-i18n locale preset with HMR companion and the JSON-to-TypeScript locale-type generator with build and watcher variants.
tags: [tooling, vite, i18n, codegen]
---

# Tooling — Workspace Vite Plugins

`tooling/vite/` holds two shared Vite plugins that make the workspace locale
pipeline work: JSON locale resources are **precompiled** (message ASTs) and their
shapes are **generated into TypeScript types**. Both are used by package builds
and the demo dev server; built package consumers configure nothing.

## `vue-i18n.ts` — `createWorkspaceVueI18nPlugin()`

A Vite plugin **preset** (nested array, flattened by Vite) composed of:

1. `VueI18nPlugin` from `@intlify/unplugin-vue-i18n/vite`, whose `include` globs
   cover the conventional workspace locale-resource directories — every
   `src/locales` tree under `apps/*` and `packages/*` — resolved relative to
   this helper, not to the consumer. Source-consuming application builds only;
   built package output already contains precompiled message ASTs.
2. `createWorkspaceLocaleHmrPlugin()` — a serve-only companion (`apply:
   "serve"`, `enforce: "pre"`) that:

   - records static JSON imports from untransformed source modules
     (`JSON_IMPORT_PATTERN`) and tracks importers per normalized locale file;
   - **injects an HMR accept boundary** for plain-module aggregators that both
     import a workspace locale resource and declare a top-level
     `createI18n`/`createComposer` (`COMPOSER_DECL_PATTERN`): on locale edit the
     callback re-applies the re-imported precompiled virtual module through
     `(composer.global ?? composer).setLocaleMessage(locale, messages)`, so text
     updates in place without app-side `import.meta.hot.accept` code. Vue
     component importers (`.vue`/`.tsx`/`.jsx`) already self-accept through
     plugin-vue/plugin-vue-jsx; modules with their own `import.meta.hot.accept`
     are skipped (no double boundary). Production builds strip `import.meta.hot`
     blocks.
   - `handleHotUpdate` redirects a changed locale resource to its Intlify
     virtual module (`virtual:intlify-i18n-*`), letting Vite propagation reach
     both importer kinds; returns nothing when no virtual dependency is
     reachable so Vite falls back to default handling (never a forced full
     reload for unrelated files).

Consumers: `apps/demo/vite.config.ts` and `packages/prototype-i18n-verification`
(a direct `vueI18n` include, not the preset).

## `json-locale-types.ts` — JSON → TS type generation

Generic generator plus two Vite plugins. Scans a directory recursively for JSON
files and emits a committed TS module with one interface per file plus a
file-stem → type map (`LocaleFileMap`), so consumers derive message types from
the actual resources instead of hand-declaring them. Type-only output — erased at
runtime, safe for any pipeline.

- `tsTypeFor(value, indent)` mirrors `resolveJsonModule` inference: strings widen
  to `string`, arrays to element-union arrays (`never[]` when empty), objects to
  inline object types with quoted non-identifier keys.
- `pascalCaseTypeName` PascalCases a stem's path segments (`admin/foo-bar` →
  `AdminFooBar`); leading digits get a `_` prefix (`2fa` → `_2fa`); an empty
  result falls back to `File`. Type-name collisions throw naming both files.
- `generateJsonLocaleTypes(files, options)` emits the module; `scanJsonLocaleFiles`
  collects files sorted for stability; `regenerateLocaleTypes(dir, outFile,
  options)` writes only when changed (returns whether it changed).
- `createJsonLocaleTypesPlugin({ dir, outFile })` — build-time plugin
  (`enforce: "pre"`, `buildStart`): fails the build on empty directory or
  unparseable JSON naming the offending file. Registered by the **admin package
  build** (`packages/admin/vite.config.ts`) pointing at
  `packages/admin/src/locales` → `src/locales/locale-types.generated.ts`.
- `createJsonLocaleTypesWatcherPlugin({ dir, outFile })` — dev-server variant:
  regenerates at `buildStart` and on `watchChange` for `*.json` under `dir`,
  logging (not failing) on mid-save errors so the next change retries.
  Registered by **apps/demo** pointed at the admin locale directory, keeping
  tsserver/watch-mode typechecks fresh without an admin rebuild.

## The end-to-end chain (admin)

`packages/admin/src/locales/AdminShell.json` + `AdminLoginPage.json` →
(json-locale-types at build start) → `src/locales/locale-types.generated.ts`
(committed) → `src/i18n/admin-locale.ts` derives `AdminShellLocale` /
`AdminLoginPageLocale` from `LocaleFileMap[...]["en"]` → the declaration build
emits `dist/locales/locale-types.generated.d.ts` so published types stay
resolvable. See the build pipeline section in
[Repository Overview](../architecture/overview.md).

## Tests — `packages/admin/tests/json-locale-types.test.ts`

- widens primitives and quotes non-identifier keys; nested object types with
  indentation; array types (uniform, mixed, empty);
- PascalCases stems including path segments; emits the file-stem map with default
  and custom names;
- throws on type-name collisions (generator and plugin paths);
- stability: same input → identical output;
- writes the module on first run and reports a change; no-op when already up to
  date; picks up type-visible JSON edits and deletions (watchChange path);
- throws on unparseable JSON naming the file; creates missing output directories;
- matches a fresh generation from the actual locale resources (no drift);
- exposes the exact per-locale shapes admin derives.

## Related

- [i18n package](../packages/i18n.md)
- [Admin i18n](../packages/admin/i18n.md)
- [Repository overview](../architecture/overview.md) — build pipeline

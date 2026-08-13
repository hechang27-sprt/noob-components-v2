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
   "serve"`, `enforce: "pre"`) that makes locale edits hot-reload. It injects
   no code: no `import.meta.hot.accept` boundary and no app-side HMR code.

   **The problem.** `VueI18nPlugin` rewrites every `src/locales/*.json` import
   into a precompiled Intlify virtual module (`virtual:intlify-i18n-*`). At
   runtime no component imports the raw JSON file; the virtual module is its
   only graph connection. A raw JSON edit therefore has no importer for
   Vite's default HMR to propagate from.

   **The fix.** The companion bridges the raw file to its virtual module in
   two hooks:

   - `transform` (before the precompiler, so the filesystem path is still
     visible) scans untransformed source for static JSON imports
     (`JSON_IMPORT_PATTERN`). It keeps those whose resolved path matches
     `isWorkspaceLocaleResource` — JSON under `apps/*/src/locales` or
     `packages/*/src/locales`, mirroring the unplugin `include` globs — and
     records each importer per normalized locale file.
   - `handleHotUpdate` looks up the changed file's recorded importers,
     resolves each in the module graph, and returns the Intlify virtual
     modules among their dependencies. Returning those modules makes Vite run
     its normal propagation from them to the importing component. The
     component self-accepts via plugin-vue/plugin-vue-jsx (`.vue`/`.tsx`/
     `.jsx`), so the edit re-executes the component and its setup re-applies
     the freshly precompiled resource.

   When no virtual module is reachable the hook returns nothing. Vite then
   falls back to default handling; an empty array would force a full reload,
   so this never reloads the page for unrelated files.

   **Constraint.** Locale resources must be imported and wired inside a
   component (e.g. a host `LocaleProvider`), not at app setup in a plain
   module. A plain-module aggregator has no self-accept boundary, so locale
   edits would degrade to Vite's default full-reload behavior.

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

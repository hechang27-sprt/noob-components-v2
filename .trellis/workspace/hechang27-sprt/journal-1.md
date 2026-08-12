# Journal - hechang27-sprt (Part 1)

> AI development session journal
> Started: 2026-07-10

---



## Session 1: Bootstrap Trellis specs

**Date**: 2026-07-10
**Task**: Bootstrap Trellis specs

### Summary

Replaced Trellis template specs with source-backed UI, admin, starter, and shared-boundary guidance; validated package checks and archived the bootstrap task.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `a22919a2` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: Prefer Naive UI components

**Date**: 2026-07-15
**Task**: Prefer Naive UI components

### Summary

Replaced AdminShell native preference and tab controls with direct NDropdown/NButton composition; added popup-layer behavior tests and documented the convention.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `8dbddbca743c` | (see git log) |

### Testing

- `pnpm --filter @noob-naive-ui/admin test` — 21 passed
- `pnpm --filter @noob-naive-ui/admin typecheck` — passed
- `pnpm --filter @noob-naive-ui/admin build` — passed

### Status

[OK] **Completed**

### Next Steps

- None - task complete

## Session 3: Establish package-owned Tailwind CSS builds

**Date**: 2026-07-15
**Task**: Define Tailwind package consumption boundary

### Summary

Established independent UI/admin CSS build artifacts and converted demo-local presentation to Tailwind utilities. UI builds before admin, and admin builds before focused demo commands; library styles omit Preflight and use explicit Tailwind layers.

### Main Changes

- Added UI's public compiled stylesheet and admin aggregation through its workspace dependency.
- Added clean-checkout prerequisite builds and CSS side-effect metadata.
- Converted demo-local layout/page CSS to Tailwind with app-local automatic source detection.

### Git Commits

| Hash | Message |
|------|---------|
| `9b38e810` | feat: establish package-owned Tailwind CSS builds |

### Testing

- Clean UI → admin → demo builds passed.
- `pnpm --filter @noob-naive-ui/admin test` — 21 passed.
- Browser smoke verified login, navigation, tabs, sign out, clean console, and no application API request.

### Status

[OK] **Completed**

### Next Steps

- None - task complete.


## Session 3: Polish AdminShell controls and navigation

**Date**: 2026-07-16
**Task**: Polish AdminShell controls and navigation

### Summary

Polished authenticated header controls with Vicons, direct theme toggling, hover preference/account menus, safe logout handling, and controlled NTabs. Synchronized NMenu highlighting with host-authoritative tab state, added demo source HMR aliases, expanded regression coverage, and verified admin/demo typechecks, tests, builds, and browser flows.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `ecba53c4` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: AdminShell page-instance navigation

**Date**: 2026-07-20
**Task**: AdminShell page-instance navigation

### Summary

Completed the AdminShell page-instance navigation redesign across all changes since vtm (35f80d17): adopted immutable page-instance IDs and the discriminated host navigation boundary; archived 07-16-simplify-admin-shell-navigation; demonstrated non-menu detail navigation; moved tab resolution policy to the call-scoped second argument of navigate so destinations remain durable data-only values; persisted complete public AdminShellTabDescriptor values in Vue Router state while keeping descriptor params independent from URL query parameters; and added the fail-fast useAdminShell() descendant context exposing reactive active descriptor state plus navigation without RouterView prop forwarding. Verified admin tests/typecheck/build, demo typecheck/build, and browser duplicate-detail navigation; archived 07-20-expose-admin-shell-destination-requests.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `35f80d17..3c531d07` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 5: Schema-driven admin Vue Router navigation

**Date**: 2026-07-22
**Task**: Schema-driven admin Vue Router navigation

### Summary

Renamed destination params to payload, added Zod-owned URL/history codecs and metadata-only AdminShell Vue Router navigation, migrated demo, and verified adapter tests, workspace types, builds, lint, formatting, and authenticated browser startup.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `a2a0c98a` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 6: Scope AdminShell history navigation

**Date**: 2026-07-23
**Task**: Scope AdminShell history navigation

### Summary

Scoped Vue Router tab metadata to transient auth sessions, added history-healing navigation, corrected inactive-tab close history writes, and added adapter regressions.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `d021e044` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 7: Package-owned admin Vue Router runtime

**Date**: 2026-07-25
**Task**: Package-owned admin Vue Router runtime
**Package**: admin

### Summary

Added the opinionated admin router factory, package-owned Pinia runtimes, and demo cutover.

### Main Changes

- Added package-owned createAdminRouter root-route runtime with auth and history-scope lifecycle.
- Moved auth, menu, and navigation dependencies into SSR-safe Pinia runtime contracts.
- Simplified the demo bootstrap and preserved lower-level Vue Router runtime escape hatches.
- Verified admin/router test suites, package typechecks/builds, and demo typecheck/build.


### Git Commits

| Hash | Message |
|------|---------|
| `572d9be73a34170374639a4e1152614ba76cba51` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 8: Harden admin router lifecycle boundaries

**Date**: 2026-07-25
**Task**: Harden admin router lifecycle boundaries
**Package**: admin

### Summary

Fixed reserved auth metadata, recoverable scope-entry settlement, safe redirect decoding fallback, typed menu state, and aligned runtime specs. Added RED/GREEN regressions for scope-entry recovery and malformed/history-dependent redirects.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `b0693e36986f9dfc37abe53f0b3d8f79fb9ef715` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 9: Fix pnpm lint errors

**Date**: 2026-07-26
**Task**: Fix pnpm lint errors
**Package**: admin

### Summary

Removed unused test fixtures and narrowed router-neutral report IDs before display stringification; verified workspace lint, affected tests, and demo typecheck/build.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `291e117d9824bcc79b65870f2619231084554fc4` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 10: Normalize monorepo build and typecheck workflows

**Date**: 2026-07-27
**Task**: Normalize monorepo build and typecheck workflows
**Package**: demo

### Summary

Fixed admin-vue-router test helper generics and enabled test-file typechecking. Split typecheck and declaration-build tsconfigs across library packages, resolved workspace packages directly from source for typecheck, Vitest, and Vite, and removed pretypecheck, pretest, and build:deps hooks. Updated root TypeScript scope so tsc -b --noEmit, pnpm typecheck, package tests, and direct dependency-free builds pass. Identified generated tsconfig.tsbuildinfo files as disposable incremental metadata that should be gitignored.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `2045fb20` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 11: Restore authentication before protected navigation

**Date**: 2026-07-28
**Task**: Restore authentication before protected navigation
**Package**: admin

### Summary

Added unconditional host auth restoration, protected-router readiness gating, safe navigation-error reporting, frontend-only demo restoration, regression tests, and runtime contract guidance.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `8911dd1dd7bc8a6e85ea8c76338bca2c428fcac5` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 12: Prototype i18n verification

**Date**: 2026-08-01
**Task**: Prototype i18n verification
**Package**: ui

### Summary

Built and browser-verified a private component-local Vue I18n package, integrated it with demo preference-driven locale synchronization, documented fallback/declaration-build findings, and fed the result into the parent design.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `08cadb2fb85dda69119d628294094e1c3c9decce` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 13: Refine prototype i18n boundaries

**Date**: 2026-08-01
**Task**: Refine prototype i18n boundaries
**Package**: ui

### Summary

Moved fallback authority to the host global Composer, replaced host-relative locale paths with a package-owned Vite integration export, adopted tsafe objectEntries without casts, and reconciled prototype, parent, and shared contracts.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `A71174e48454577b2fe3462877f781239ea086e2` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 14: Shared workspace Vue I18n Vite preset

**Date**: 2026-08-02
**Task**: Shared workspace Vue I18n Vite preset
**Package**: ui

### Summary

Replaced package-specific locale-resource exports with one repository-owned Vue I18n Vite preset, migrated demo, removed package helper artifacts, added tooling TypeScript coverage, and verified no-prebuild source consumption plus standalone builds.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `7cfbae248fd98cba5f804daaf4091a9ff4ab7e12` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 15: Fix workspace locale JSON HMR

**Date**: 2026-08-02
**Task**: Fix workspace locale JSON HMR

### Summary

Added component-scoped locale HMR to the shared Vue I18n Vite preset; verified English and Chinese edits update without page reload.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `F3c225cb5c7131a4d8ef8ed8ff415c778be57fb1` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 16: Refine workspace i18n demo

**Date**: 2026-08-03
**Task**: Refine workspace i18n demo

### Summary

Flattened component locale resources, refined workspace HMR tooling, added i18n contract tests and documentation, moved the locale demo to Demo > Internationalization, and separated routed pages under pages/demo with a consolidated routes.ts module.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `966b90026085d9ab4089055900754a9c12af6b93` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 17: Library i18n scaffolding with I18nText tab labels

**Date**: 2026-08-03
**Task**: Library i18n scaffolding with I18nText tab labels
**Package**: admin

### Summary

Session summary was not supplied.

### Main Changes

Implemented production i18n scaffolding across the workspace.

Admin package:
- Component-local Vue I18n for AdminShell and AdminLoginPage with bundled en/zh-CN locale-first resources (src/locales/AdminShell.json, AdminLoginPage.json), precompiled by the Intlify plugin added to the admin build.
- adminI18nPlugin override transport (immutable startup snapshot, typed partial overrides, self-contained locale interfaces, tsafe objectEntries).
- Store-owned naiveUiConfig computed (theme incl. system dark via setSystemUsesDark, 13/14/16px font overrides, naive-ui size tier, naive-ui locale via resolveAdminNaiveUiLocale with host fallbackLocale initialize option); host binds n-config-provider.
- AdminShell owns store -> global Composer locale sync via an immediate watcher; host seeds createI18n with the hydrated preference for the pre-auth login page.

Shared I18nText (design revision after user feedback):
- I18nText discriminated union ({kind:"string",value} | {kind:"i18n",key,named}) in admin i18n/i18n-text.ts with Zod codec and resolver; AdminShellTabDescriptor.label is I18nText; the shell resolves i18n-kind labels against the global Composer at render time, so open AND history-restored tabs follow locale switches; the adapter persists labels as I18nText (named values must be JSON primitives).
- Fixed DOMException "Proxy object could not be cloned" from structuredClone on reactive tab labels: snapshotTab returns plain-data copies; navigation catches log the original error before the localized tab error.

Demo host:
- App-level demo messages (src/locales/demo.json), shared i18n.ts module, menu labels as reactive render functions, tab labels as I18nText keys (detail uses named interpolation), all pages localized, matchMedia -> setSystemUsesDark, n-config-provider bound to naiveUiConfig.

ui package: i18n plugin scaffold with empty component registry.

Tests: 51 admin (i18n-contract plugin/fallback/zh-CN, shell locale sync + I18nText reactivity), 69 router (label persistence schema). Browser-verified: en/zh-CN switching incl. tab titles, persistence, fr unsupported-locale fallback with active locale unchanged.

Also fixed two pre-existing lint errors (floating promises in auth.ts / auth-store.test.ts) with the void operator.


### Git Commits

| Hash | Message |
|------|---------|
| `412714b6` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 18: Extract shared i18n composables into @noob-naive-ui/i18n

**Date**: 2026-08-04
**Task**: Extract shared i18n composables into @noob-naive-ui/i18n
**Package**: admin

### Summary

Session summary was not supplied.

### Main Changes

Extracted the duplicated AdminShell/AdminLoginPage i18n setup into a new internal workspace package @noob-naive-ui/i18n (packages/i18n) with shared composables and primitives.

Package contents:
- i18n-text.ts: I18nText primitives moved from packages/admin/src/i18n/ (type, Zod codec renamed adminI18nTextSchema -> i18nTextSchema, resolveI18nText). Clean cutover: admin barrel no longer re-exports them; admin-vue-router imports i18nTextSchema from the new package.
- use-component-i18n.ts: useComponentI18n({ messages, overridesKey, emptySnapshot, selectOverrides }) -> { composer, t, locale }. Encapsulates the previously duplicated block: inject override snapshot with frozen empty fallback, fresh local Composer (useScope local, inheritLocale true), the vue-i18n 11.4.8 post-creation fallbackRoot=false correction, defaults-then-overrides merge loops with the undefined guard. Generic over the plugin snapshot (S extends { messages: M }) so package plugins keep their typed keys/selectors.
- use-global-i18n-sync.ts: useGlobalI18nSync(source, { immediate }) -> global Composer; one-way store locale -> global Composer watcher (immediate by default), replacing AdminShell's manual watcher.

Refactors:
- admin-login-page.tsx / admin-shell.tsx: one composable call each; shell syncs via useGlobalI18nSync(() => preferences.locale) and resolves reactive tab labels against the returned global Composer.
- Dependency wiring: admin deps, router peers, demo deps declare @noob-naive-ui/i18n; router vite externalizes it (was bundling a schema copy); root + package tsconfig path maps.

Typing notes (design risk resolutions):
- tsafe objectEntries widens generic keys to string|number|symbol, failing mergeLocaleMessage's Locale key -> merge loops use Object.entries (identical runtime semantics, cast-free).
- Bare vue-i18n I18n type annotation loses the Legacy=false binding (global becomes VueI18n|Composer union) -> tests infer createI18n's return type instead of annotating.

Tests: 15 new in packages/i18n (schema/resolver, composable defaults/override-precedence/absent-plugin/fallbackRoot/locale-follow, sync immediate/deferred/change). Full gates green: tsc -b --noEmit, oxlint, format:check, all 5 package builds, 51 admin + 69 router + 15 i18n tests. Browser regression on demo: login page, sign-in, zh-CN switch (shell/menu/page/reactive tab titles), detail tab named interpolation + activation, en switch-back with 3 open tabs, fr fallback with preference unchanged.

trellis-check agent reviewed all files against the task specs; fixed one defect: unused tsafe dependency in the new package (removed from package.json, vite external, lockfile).


### Git Commits

| Hash | Message |
|------|---------|
| `b69530c9` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 19: Generic JSON-to-TS locale type generator (tooling) wired into admin

**Date**: 2026-08-04
**Task**: Generic JSON-to-TS locale type generator (tooling) wired into admin
**Package**: admin

### Summary

Session summary was not supplied.

### Main Changes

Built a generic JSON→TS locale type generator in tooling and replaced the admin package's manual message-shape interfaces with derived types.

tooling/vite/json-locale-types.ts (new shared module, same convention as the vue-i18n preset; zero runtime deps):
- generateJsonLocaleTypes(files, { typeName?, mapName?, sourceDir? }): pure generator emitting one widened interface per JSON file (string/number/boolean/null, indented inline object types, quoted non-identifier keys like "zh-CN", arrays X[] / sorted (A|B)[] / never[]) plus a file-stem → type map (default LocaleFileMap). Deterministic: sorted scan + sorted element types, stable header (no timestamps). Type-name collisions throw naming both stems.
- scanJsonLocaleFiles(dir): recursive sorted *.json scan (exported for tests/drift guard); JSON.parse failures rethrow naming the file and path.
- createJsonLocaleTypesPlugin({ dir, outFile, typeName?, mapName? }): vite plugin (enforce: pre) regenerating outFile on buildStart before the module graph / unplugin-dts runs; empty dir and parse errors fail the build loudly.

Admin wiring:
- packages/admin/vite.config.ts registers the plugin first (dir=src/locales, outFile=src/locales/locale-types.generated.ts).
- packages/admin/src/locales/locale-types.generated.ts: committed generated module (in .prettierignore; build regenerates it).
- packages/admin/src/i18n/admin-locale.ts: AdminShellLocale = LocaleFileMap["AdminShell"]["en"], AdminLoginPageLocale likewise; AdminLocaleName/AdminComponentId/AdminLocale/AdminLocaleOverrides/DeepPartial retained as contract glue. No manual message-shape interfaces remain.
- Published d.ts self-contained: dist/locales/locale-types.generated.d.ts emitted by unplugin-dts; admin-locale.d.ts references the sibling d.ts; no JSON imports in dist declarations.

Tests: 9 new in packages/admin/tests/json-locale-types.test.ts (primitives, quoted keys, nested indentation, arrays, PascalCase incl. digit-start, collisions, map default/custom, output stability, drift guard comparing the committed file to a fresh generation from the live resources).

Design decision (user-directed): physical committed generated file over a vite virtual module — virtual modules cannot satisfy standalone tsc (TS2307 outside vite) or the published d.ts (dangling virtual: imports for consumers), and a type-only module has no runtime payload to serve.

Gates green: tsc -b --noEmit, oxlint, format:check, 60 admin + 69 router + 15 i18n tests, all 5 package builds, dist audit. trellis-check agent reviewed all files; fixed one defect: JSON parse errors now name the offending file (were raw SyntaxErrors with no path).

Task-dir consolidation note: task.py create registered the task under 08-04-json-locale-types-plugin while the plan artifacts were written under 08-05; merged into 08-04 (kept task.json registry linkage) and removed the 08-05 dir before archiving.


### Git Commits

| Hash | Message |
|------|---------|
| `4c434104` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 20: Dev watchChange regeneration for locale type generator

**Date**: 2026-08-04
**Task**: Dev watchChange regeneration for locale type generator
**Package**: admin

### Summary

Session summary was not supplied.

### Main Changes

Follow-up to 08-04-json-locale-types-plugin (direct change, no task): added dev-time regeneration to the JSON→TS locale type generator.

tooling/vite/json-locale-types.ts:
- Extracted regenerateLocaleTypes(dir, outFile, options): scans, generates, writes only when the content differs, returns whether it changed; throws on scan/parse errors naming the file.
- Plugin now has a watchChange hook (thin glue): regenerates when a *.json under dir changes during dev servers (create/update/delete), guarded by isJsonUnderDir (excludes the .ts output file), logging a warning instead of failing the dev server on mid-save parse errors. buildStart keeps the hard-fail empty-dir/parse semantics.
- Runtime HMR was already unaffected (the generated module is type-only, erased); the hook closes the type-freshness gap: editing a locale JSON in a dev server now refreshes the committed generated file so tsserver/watch-mode tests stay current.

Tests: 6 new in packages/admin/tests/json-locale-types.test.ts (first-run write, no-op when identical — value-only JSON edits correctly do not rewrite, shape edits do, deletion drops the type, parse-error naming, collision, mkdir -p for nested outFile). 66 admin tests green; tsc -b, oxlint, format:check, admin build green.

Verified end to end with a scratch vite dev server: buildStart wrote the module; editing the fixture JSON produced `extra: boolean` in the output within ~2s (watchChange fired).

Docs: library-i18n-contract.md now states regeneration on build AND dev watchChange; archived design.md API section updated.

Note: demo dev server does not register the plugin (its config only loads the shared vue-i18n preset) — demo-dev type freshness still requires an admin build; registering the generator in the demo config remains an option the user has not selected.


### Git Commits

| Hash | Message |
|------|---------|
| `ee4e9fe7` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 21: Split dev watcher plugin for locale type regeneration

**Date**: 2026-08-04
**Task**: Split dev watcher plugin for locale type regeneration
**Package**: admin

### Summary

Session summary was not supplied.

### Main Changes

Follow-up to the locale type generator (direct change, no task): split the watchChange hook out of the build plugin into a dedicated dev watcher plugin, per the user's architecture point that a library build never watches.

tooling/vite/json-locale-types.ts:
- createJsonLocaleTypesPlugin is now build-time only (buildStart generation, hard-fail on empty dir/parse errors) — its watchChange was dead code in its only registration site (the admin library build has no watcher).
- New createJsonLocaleTypesWatcherPlugin: buildStart (initial freshness) + watchChange on *.json under dir; failures logged via a shared regenerateOrWarn helper, never fatal (mid-save parse errors retry on the next event). Guards: isJsonUnderDir excludes the .ts output file; regenerateLocaleTypes only writes on content change.

apps/demo/vite.config.ts: registers the watcher plugin pointed at packages/admin/src/locales (consistent with the existing admin→src alias dev pattern), so editing an admin locale JSON in demo dev regenerates the committed generated types for tsserver/watch-mode runs.

Verified live: demo dev server running, added __wcProbe to AdminShell.json → locale-types.generated.ts contained __wcProbe within ~3s; reverted → file reverted (count 0); drift-guard test green (66/66).

Docs: library-i18n-contract.md and the archived task design.md now describe the two-plugin split (library registers the build plugin; dev-facing apps register the watcher).


### Git Commits

- `c258e303` feat: split dev watcher plugin from build-time locale type plugin; register in demo

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 22: Fold per-package i18n plugin logic into shared factory

**Date**: 2026-08-04
**Task**: Fold per-package i18n plugin logic into shared factory

### Summary

Added createLibraryI18nPlugin to @noob-naive-ui/i18n: factory owns plugin transport, injection key, frozen empty snapshot, and generic selectComponentOverrides. admin/ui plugin.ts became thin instantiations; useComponentI18n now takes { messages, plugin, componentId }; AdminLocaleOverrides derived from shared type. Added source aliases for i18n in admin, admin-vue-router, demo vite configs. Gates: tsc, lint, format, 20 i18n + 66 admin + 69 router tests, all builds, demo smoke.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `ece31612` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 23: Refactor createAdminRouter into a Vue plugin (createAdminRouterPlugin)

**Date**: 2026-08-04
**Task**: Refactor createAdminRouter into a Vue plugin (createAdminRouterPlugin)
**Package**: admin

### Summary

Converted admin-vue-router's createAdminRouter factory into createAdminRouterPlugin, a Vue plugin whose install resolves Pinia via getActivePinia() (throws if not installed), binds admin stores, registers four extracted lifecycle helpers (installRouterErrorHandler, installAuthGuard, installScopeGuard, installAuthTransitionGuard), installs the router, and provides cleanup via app.provide(ADMIN_DISPOSE_KEY) instead of an Object.defineProperty hack. Removed the pinia option; demo + tests updated to plugin shape; admin package gained the owning-module AdminAuthStore type export. All gates green (72 package tests, typechecks, builds) and demo browser smoke passed (deep link redirect, login restore, logout).

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `xlupzpvn` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete



## Session 24: Fix duplicate tabs on browser Back after close+reopen

**Date**: 2026-08-04
**Task**: Fix duplicate tabs on browser Back after close+reopen
**Branch**: `dev`

### Summary

Fixed duplicate AdminShell tabs on browser Back after close+reopen via a new heal request variant.

### Main Changes

### Summary
Fixed duplicate AdminShell tabs on browser Back after close+reopen (reported as an i18n-integration regression). Root cause: closing a tab leaves its stamped history entry; re-opening the same destination gets a new page-instance id; Back restores the old id, which the shell recorded as a new tab. Verified the locale switch is not the trigger (reproduces identically without it); shell/adapter history logic is byte-identical pre/post i18n.

Fix: new `heal` variant on `AdminShellNavigationRequest`. The shell requests it from the navigation watch when a history revive presents an id that was recorded before (knownPageIds) but is not committed and whose navKey matches a committed tab (newest visible match, same policy as requestDestination). The adapter restamps the current history entry in place (router.replace) only when the committed descriptor resolves to the same fullPath; otherwise no-op, preserving revive behavior for payload-bearing pages. Also added missing @noob-naive-ui/i18n source path to apps/demo/tsconfig.json (pre-existing demo typecheck gap).

Gates: 20 i18n + 4 prototype + 68 admin + 72 admin-vue-router tests pass; workspace typecheck + lint + all builds pass; browser-verified close+reopen+locale+Back no longer duplicates (single Settings tab after heal, forward traversal stable).


### Git Commits

| Hash | Message |
|------|---------|
| `08d5e9c3` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 25: Verify and fix fallow findings; refactor AdminShell

**Date**: 2026-08-05
**Task**: Verify and fix fallow findings; refactor AdminShell
**Package**: admin
**Branch**: `dev`

### Summary

Triaged fallow dead-code/health report on dev branch: removed tsafe from packages/admin deps; kept DEFAULT_SNAPSHOT, replacePreferences, reset as documented public API (false positives). Refactored AdminShell (871->351 LOC) by extracting tab-navigation state machine into useAdminShellTabs composable + pure presentational AdminShellNavbarControls/AdminShellTabbar. Behavior-neutral; admin-shell + shell-preferences tests pass (27/27); typecheck clean; fallow genuine findings resolved. Added fallow false-positive guidance to library-conventions spec.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `a5d380e8` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 26: AdminShell controller rework + i18n API rename per design review

**Date**: 2026-08-05
**Task**: AdminShell controller rework + i18n API rename per design review
**Package**: admin
**Branch**: `dev`

### Summary

Addressed user design review of the AdminShell refactor: (1) renamed useComponentI18n -> createComponentI18n (returns Composer only, provides via module-private key) and added getComponentI18n(); fixed resolveI18nText translate-param doc to say pass vue-i18n t directly. (2) Widened useAdminShell to the full tabs controller (navigate + tabs/visibleTabs/tabError/canActivateTab/activateTab/closeTab) via a new use-admin-shell.ts module that also breaks the admin-shell<->tabbar import cycle. (3) Reworked AdminShellTabbar / AdminShellNavLeft / AdminShellNavRight into self-sufficient real components that read stores + getComponentI18n + useAdminShell directly (no callback props); host tab labels resolve via global Composer (resolveI18nText(label, globalT)). AdminShell 871 -> ~237 LOC. tsafe removed from packages/admin (only genuine fallow dead-dep); DEFAULT_SNAPSHOT/replacePreferences/reset kept as documented public API. Typecheck clean across 6 packages + demo; tests 14 (i18n) + 27 (admin) pass; fallow shows no new genuine findings.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `90601c3a` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 27: Convert AdminShell slot renderers to functional components per style guide

**Date**: 2026-08-05
**Task**: Convert AdminShell slot renderers to functional components per style guide
**Package**: admin
**Branch**: `dev`

### Summary

User review: object-style setup() in the sub-components violates .trellis/spec/admin/frontend/tsx-components-and-tests.md. Converted AdminShellTabbar / AdminShellNavLeft / AdminShellNavRight to plain Vue functional components returning VNode directly (no defineComponent), mounted as descendants in ProLayout slots so getComponentI18n/useAdminShell/useI18n/stores resolve against AdminShell. Evaluated user's food-for-thought (plain useI18n() in children) empirically: a functional child's useI18n() does not inherit the parent's locally-merged package messages, so getComponentI18n() stays necessary. Found and documented a Vue test-pollution quirk: a setup-throwing mount leaves the render instance global stale for later functional-component renders; moved the throws test last in the AdminShell describe (i18n suite already does this). Admin-shell + shell-preferences 27/27, i18n 14/14, typecheck clean, fallow health down to 7.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `25f6824e` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 28: Flip i18n fallbackRoot to true; single-composer tabbar; controller-return composable

**Date**: 2026-08-05
**Task**: Flip i18n fallbackRoot to true; single-composer tabbar; controller-return composable
**Package**: admin
**Branch**: `dev`

### Summary

User review: the tabbar's dual-composer pattern (getComponentI18n + useI18n({useScope:'global'})) looked wrong. Explained host vs package message scopes and that fallbackRoot:false blocks host-global keys from resolving through the package local Composer. User: 'the local i18n scope should inherit host's global i18n messages shouldn't it?' — empirically probed: with fallbackRoot:true a single local Composer resolves BOTH package keys and host-global keys. User approved the flip. Changes: (1) createComponentI18n fallbackRoot false->true (options + post-creation correction) + doc; (2) tabbar now single getComponentI18n().t for aria text AND host tab labels via resolveI18nText(label, t); (3) useAdminShellTabs now builds+provides+returns AdminShellContext directly, AdminShell consumes shellContext.navigate with no round-trip, unused imports removed; (4) library-i18n-contract spec updated in 3 spots; (5) tests assert fallbackRoot true + prove host-key resolution via a host registry seeded at createI18n time (mergeLocaleMessage-after-mount does not re-render, so seed before mount). Verification: typecheck clean across i18n/admin/ui/prototype-i18n-verification/admin-vue-router/demo; tests i18n 23, admin 70 (incl. host tab-label resolution + locale-switch reactivity), admin-vue-router 75.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `d7d32848` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete



## Session 29: Fix font-size preference resizing (componentOptions + shell chrome + base font)

**Date**: 2026-08-06
**Task**: Fix font-size preference resizing (componentOptions + shell chrome + base font)

### Summary

Investigated why the font-size preference only resized the menu text: ProLayout does NOT block naive-ui componentOptions (verified in browser). Root causes: (1) AdminShell header nav buttons and tab strip hardcoded size props, so componentOptions could not resize them; (2) naive-ui sets body font-size statically (14px), so themeOverrides never reaches plain HTML. Fixed: mapped naiveUiConfig size tier to NConfigProvider componentOptions; removed hardcoded chrome sizes; exported resolveAdminNaiveBaseFontSize (13/14/16px); demo App applies it to the root so rem-based content scales. Verified in browser (top bar + content resize with the preference).

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `2f8ca5f3` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 30: Merge default with review-20260805 (AdminShell fallow refactor + font-size preference fix)

**Date**: 2026-08-06
**Task**: Merge default with review-20260805 (AdminShell fallow refactor + font-size preference fix)

### Summary

Merged the review-20260805 workspace into default via jj new (two parents): combined the font-size preference fix (default) with the AdminShell fallow refactor (review). Resolved admin-shell.tsx conflicts to the refactored delegation (AdminShellNavLeft/Right, AdminShellTabbar, use-admin-shell), then re-applied the chrome size-removals to the extracted admin-shell-navbar-controls.tsx (5x size=large) and admin-shell-tabbar.tsx (size=small) so the preference still resizes the top bar. Reconciled the concurrent journal: review sessions 25-28 (earlier commit) keep numbers, this session's font-size entry renumbered 25->29; index Total Sessions 29. Prompted the review-window agent via herdr for its committed state before merging and notified it after. Verified: admin typecheck, 72/72 admin tests, demo typecheck, and browser (top bar + content resize with preference at large).

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `1d981c99` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 31: Workspace locale JSON HMR boundaries + AdminShell tab-state survival

**Date**: 2026-08-06
**Task**: Workspace locale JSON HMR boundaries + AdminShell tab-state survival

### Summary

Preset-injected locale accept boundary (no app-side patch); AdminShell slot components converted to defineComponent for leaf-level HMR; open-tab registry moved to Pinia store so HMR remounts preserve tabs; verified in browser (demo.json, tabbar class edit, AdminShell.json) + 149 tests + builds.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `zqzpnwxu` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete

## Session 32: ProLayout preference config: tabbar overflow fix + useLayoutMenu migration

**Date**: 2026-08-06
**Task**: ProLayout preference config: tabbar overflow fix + useLayoutMenu migration

### Summary

Investigated how naive-ui-pro ProLayout size is configured: componentOptions (NConfigProvider) never resizes ProLayout's plain-HTML chrome; heights come from props (tabbarHeight 38 default) emitted as CSS vars, and vertical layout's content-margin math requires prop == rendered height. Measured tabbar overflow at every tier (1/5/12px). Added runtime/pro-layout-config.ts (AdminProLayoutConfig, PRO_LAYOUT_TABBAR_HEIGHTS 41/45/52) + proLayoutConfig getter on the preferences store; AdminShell binds it on ProLayout. Migrated sidebar menu to useLayoutMenu with an activeKey watcher as the single navigation seam (echo-guarded), enabling future layout-mode switching. Browser-verified no overflow at all tiers, menu nav/highlight/collapse intact; 72/72 tests pass; spec updated.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `128768fee877` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete

## Session 33: Tabbar bottom border removal + tab strip bottom-alignment

**Date**: 2026-08-06
**Task**: Tabbar bottom border removal + tab strip bottom-alignment

### Summary

Follow-up micro-fix: ProLayout tabbar bottom border removed via ProLayout tabbarClass='border-b-transparent!' in components/admin-shell.tsx. Diagnosed why the earlier attempt (class in stores/shell-preferences.ts) generated nothing: the admin Tailwind stylesheet uses source(none) + @source './components', so class strings outside components/ are never compiled; and once generated, the bare variant would lose to pro-naive-ui's unlayered cssr border (Tailwind utilities are in @layer utilities), so the !important variant is required. User verified both border rules coexist in compiled CSS with the important one winning. Also bottom-aligned the card tab strip (wrapper w-full h-full + NTabs h-full justify-end). Browser-verified: no overflow, tab flush to bottom, clean visual; only the intentional naive-ui card-strip divider remains. Admin typecheck + 72/72 tests pass.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `0596ba17816e` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete

## Session 34: Merge fix-tabbar-css into main; resolve tabbar conflict

**Date**: 2026-08-06
**Task**: Merge fix-tabbar-css into main; resolve tabbar conflict

### Summary

Resolved the admin-shell-tabbar.tsx 2-sided conflict (defineComponent structure + fix-tabbar-css CSS); validated merged tree (admin typecheck + 74 tests, demo typecheck + build, root tsc, fmt, lint, browser HMR regressions); archived merge task; notified the fix-tabbar-css agent to sync.

### Main Changes

- Detailed change bullets were not supplied; see the summary above.

### Git Commits

| Hash | Message |
|------|---------|
| `rnmouzwt` | (see git log) |

### Testing

- Validation was not recorded for this session.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 35: Archive completed tasks: library-i18n-integration, fallow-refactor-admin-shell

**Date**: 2026-08-07
**Task**: Archive completed tasks: library-i18n-integration, fallow-refactor-admin-shell

### Summary

Session summary was not supplied.

### Main Changes

- Archived 07-31-library-i18n-integration (3/3 done)
- Archived 08-05-fallow-refactor-admin-shell (done)

### Git Commits

| Hash | Message |
|------|---------|
| `ptzssynousyy` | (see git log) |
| `xmmytukwowys` | (see git log) |

### Status

[OK] **Completed**

### Next Steps

- Continue 07-15-demo-app


## Session 36: Theme UI text/layout via naive-ui design tokens

**Date**: 2026-08-10
**Task**: Theme UI text/layout via naive-ui design tokens
**Package**: admin

### Summary

Session summary was not supplied.

### Main Changes

- Convert demo pages and admin components to Typography (NH1/NP/NText) and NFlex/NLayout/NGrid over raw html+tailwind so text and layout stay theme-able
- Mount NGlobalStyle in demo host so the themed body background covers the whole page (dark mode no longer only paints the card)
- Wrap admin-login-page in a full-page NFlex instead of <main>; size the anonymous-status text via NElement tag=p consuming the inherited --font-size-tiny token
- Add FONT_SIZE_OVERRIDES tiers (common font sizes, Typography p/header, Flex gapMedium) driven through naiveUiConfig themeOverrides + componentOptions; drop pro-layout-config

### Git Commits

| Hash | Message |
|------|---------|
| `8c4770ae` | (see git log) |

### Testing

- [OK] Admin typecheck pass; login page tests 4/4; prototype tests 4/4; lint pass
- [OK] Browser: full-page dark mode on login+shell; demo pages render NFlex+NH1/NP; status text renders 13px token-driven (medium tier)
- [OK] 2 pre-existing admin-suite failures (shell-preferences themeOverrides shape, navbar delay hover) from earlier uncommitted work, unrelated

### Status

[OK] **Completed**

### Next Steps

- Decide whether to codify a small-text convention (NElement tag=p + --font-size-tiny) or expose a themed caption token


## Session 37: Spec: mandate naive-ui design-token theming for ui components

**Date**: 2026-08-10
**Task**: Spec: mandate naive-ui design-token theming for ui components
**Package**: admin

### Summary

Session summary was not supplied.

### Main Changes

- Add 'Design tokens and theming' section to admin/frontend/tsx-components-and-tests.md: Typography for text, NFlex/NLayout/NGrid for layout, no hardcoded colors/sizes, NElement + --font-size-tiny for smaller-than-base text, NGlobalStyle for full-page backgrounds, rem-based Tailwind allowed
- Login anonymous-status now uses text-(length:--font-size-tiny): Tailwind's bare text-(--var) resolves to color (color: var(--var)), not font-size, so the shorter form silently left the size inherited

### Git Commits

| Hash | Message |
|------|---------|
| `c75d68cd` | (see git log) |

### Testing

- [OK] Admin typecheck pass; login tests 4/4; lint pass
- [OK] Browser: login status renders 13px (medium tier) via NElement exposing --font-size-tiny; generated rule confirmed font-size: var(--font-size-tiny)

### Status

[OK] **Completed**

### Next Steps

- Consider exposing a themed caption token in FONT_SIZE_OVERRIDES if smaller-than-tiny text is needed

## Session 38: AdminProvider root provider + opaque preferences store

**Date**: 2026-08-12
**Task**: 08-12-demo-component-local-i18n-chrome
**Package**: admin, demo, i18n

### Summary
Built the admin-package `AdminProvider` root provider and consolidated the host configuration + locale HMR surface around it: provider-seeded global locale (validated HMR without the regex injection), a single `useAdminProvider()` consumption composable over Pinia stores, an opaque blob-persistence preferences store, and moving the admin i18n text override from `app.use(adminI18nPlugin, …)` into the provider's `overrides` prop.

### Main Changes
- `AdminProvider` (functional `defineComponent` per `tsx-components-and-tests.md`), props `messages`/`menu`/`preferences`/`theme`/`overrides`: seeds the host global Composer + active locale, `preferences.initialize` + `menu.configure` (not `main.ts`), `provide(adminI18nOverridesKey, …)` snapshot from `overrides`, renders `NConfigProvider`.
- `useAdminProvider()`: single consumption surface over the stores; semantic setters + derivation (`preferences`/`naiveUiConfig`/`proLayoutConfig`) moved out of the store; tabs-style composable-over-store (no provide/inject; SSR + HMR safe).
- `shell-preferences` store reduced to opaque blob persistence: `preferences` (persisted) + `runtime` reactive objects; storage/persistence only, no field semantics (tabs.ts-style minimalism).
- Removed the regex accept-block injection from `createWorkspaceLocaleHmrPlugin.transform` (validated: locale HMR now runs on component self-accept + `handleHotUpdate` redirect; `demo.json` edits bound at `App.tsx`).
- Demo: `main.ts` trims to auth + router; `App.tsx` consumes `AdminProvider` (imports `demo.json`, passes `overrides`); `locale-provider.tsx` deleted.
- `library-i18n-contract.md`: locale resources imported+wired in a component (host `AdminProvider`), not app setup.

### Git Commits
| Hash | Message |
|------|---------|
| `64a093d0` | feat(admin): AdminProvider root provider + opaque preferences store |
| `66128185` | (prior spike: provider-seeded i18n.global + injection removal) |

### Testing
- [OK] admin + demo typecheck; demo build; oxlint; oxfmt.
- [OK] Admin tests 80/82 — 2 pre-existing failures from the in-progress font-size theme work (naiveUiConfig `themeOverrides` fontSize; admin-shell "Large" dropdown), NOT regressions.
- [OK] `AdminProvider` 6/6 (incl. new overrides-provide test); `useAdminProvider` tests.
- [OK] Browser (`DEBUG=vite:hmr`): edit `demo.json` → `hmr update /src/App.tsx`, beforeunload counter 0, text updates/reverts in place.

### Status
[OK] **Committed** (working copy clean). Session recorded.

### Next Steps
- Resolve the 2 pre-existing font-size theme test failures (in-progress theme work, outside this task).
- Replace/flag the stale `noob-workspace-locale-hmr-boundaries` skill (user-authored; still documents the removed injection).
- Optionally `task.py archive` this task via `/trellis:finish-work`.

## Session 39: Archive 08-12-demo-component-local-i18n-chrome

**Date**: 2026-08-12
**Task**: 08-12-demo-component-local-i18n-chrome
**Package**: admin, demo

### Summary
Archived the completed task (AdminProvider root provider + opaque preferences store + locale HMR consolidation). Squashed the two checkpoint commits into one; updated the workspace index with sessions 38 (the work) and 39 (this archive).

### Main Changes
- Archived `08-12-demo-component-local-i18n-chrome` → `.trellis/tasks/archive/2026-08/`; status completed.
- Squashed spike + feature checkpoints into a single commit `e6e36d27`.
- Updated `index.md` (Total Sessions 39, Last Active 2026-08-12, Session History rows 38–39).

### Git Commits
| Hash | Message |
|------|---------|
| `dec71be9` | chore(task): archive 08-12-demo-component-local-i18n-chrome |
| `e6e36d27` | feat(admin): AdminProvider root provider + opaque preferences store |

### Testing
- [OK] No code change; commit history consolidated and task archived.

### Status
[OK] **Archived**

### Next Steps
- Resolve the 2 pre-existing font-size theme test failures (in-progress theme work).
- Replace/flag the stale `noob-workspace-locale-hmr-boundaries` skill.

## Session 40: Remove AdminProvider-era vestiges; shrink i18n descriptor

**Date**: 2026-08-12
**Task**: 08-12-remove-adminprovider-vestiges
**Package**: admin, ui, i18n

### Summary
Removed code superseded by the AdminProvider architecture and shrank the shared i18n factory now that its plugin transport is unused. `packages/ui/src/theme` naive bridge deleted (theme overrides flow via the AdminProvider `theme` prop); `adminI18nPlugin` removed (the `overrides` prop provides the snapshot via the injection key). Renamed `createLibraryI18nPlugin` -> `createLibraryI18nDescriptor`, dropped the Vue plugin transport and `LibraryI18nPluginOptions`; the descriptor now carries only `overridesKey` + `emptySnapshot` + `selectComponentOverrides`. `createComponentI18n` option `plugin` -> `descriptor`; ui dropped the last `.plugin` consumer (`noobUiI18nPlugin`).

### Main Changes
- ui: deleted `packages/ui/src/theme/naive.ts` (dead bridge, no consumers); removed its re-export.
- admin: removed `adminI18nPlugin` from `i18n/plugin.ts` + `index.ts`; `AdminProviderProps.overrides` now `AdminLocaleOverrides`; dropped `AdminI18nPluginOptions`.
- i18n: renamed factory to `createLibraryI18nDescriptor` (file `library-i18n-descriptor.ts`); dropped `.plugin` + `LibraryI18nPluginOptions`; `CreateComponentI18nOptions.plugin` -> `descriptor`.
- ui: removed `noobUiI18nPlugin` + `NoobUiI18nPluginOptions`; exported `noobUiI18n` descriptor seam.
- tests: `i18n-contract` rewritten to the AdminProvider overrides-provide path; factory plugin-install test dropped; `use-component-i18n` provides the snapshot via the key.
- spec: `library-i18n-contract.md` updated throughout (descriptor + provide path).

### Git Commits
| Hash | Message |
|------|---------|
| `54d48c6f` | feat(admin,ui,i18n): remove AdminProvider-era vestiges; shrink i18n descriptor |
| `e8b7974b` | chore(task): archive 08-12-remove-adminprovider-vestiges |

### Testing
- [OK] i18n tests 22/22; admin 82 pass / 2 pre-existing theme failures (fontSize, "Large" dropdown).
- [OK] admin + ui + i18n + demo + prototype typecheck clean; builds clean; oxlint + oxfmt clean.

### Status
[OK] **Archived**

### Next Steps
- Resolve the 2 pre-existing font-size theme test failures (in-progress theme work).
- Regenerate openwiki (references removed `createLibraryI18nPlugin`/`adminI18nPlugin`).

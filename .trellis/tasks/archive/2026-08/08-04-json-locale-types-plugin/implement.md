# Implement: JSON→TS locale type generator

## Phase A — Plugin module

1. `tooling/vite/json-locale-types.ts`:
   - Pure `generateJsonLocaleTypes(files, options)` (per design §2): type
     emitter (string/number/boolean/null/object/array, quoted keys),
     PascalCase naming, collision detection (throw), map emission, stable
     header (glob, no timestamp).
   - `createJsonLocaleTypesPlugin(options)` — vite `Plugin`:
     `buildStart` globs `include`, parses JSON, generates, writes
     `outFile` (mkdir -p); parse errors fail the build naming the file.
2. No package.json changes (tooling stays shared source; module imports
   only node builtins + `type { Plugin } from "vite"`).

## Phase B — Admin wiring + cutover

3. `packages/admin/vite.config.ts`: register
   `createJsonLocaleTypesPlugin({ include: resolve(__dirname,
   "src/locales/**/*.json"), outFile: resolve(__dirname,
   "src/locales/locale-types.generated.ts") })` FIRST in the plugins array.
4. Run the admin build once to generate
   `src/locales/locale-types.generated.ts`; commit it.
5. `packages/admin/src/i18n/admin-locale.ts`: delete the two manual
   interfaces; derive `AdminShellLocale` / `AdminLoginPageLocale` from
   `LocaleFileMap` (design §4). Keep `AdminLocaleName`, `AdminComponentId`,
   `AdminLocale`, `AdminLocaleOverrides`, `DeepPartial`.

## Phase C — Tests

6. `packages/admin/tests/json-locale-types.test.ts` — the pure generator:
   nested objects, quoted keys, primitives, arrays (uniform/mixed/empty),
   naming + collisions, map emission (default/custom mapName), output
   stability, and a drift guard asserting the committed generated file
   equals a fresh generation.
7. Existing 51 admin tests green (override/selector typing unchanged).

## Phase D — Gates

8. `pnpm --filter @noob-naive-ui/admin build` — dist audit:
   `dist/locales/locale-types.generated.d.ts` emitted, no `*.json` in dist
   d.ts, precompiled AST markers still present in the bundle.
9. Full gates: `tsc -b --noEmit`, oxlint, format:check, all package tests
   (51 admin / 69 router / 15 i18n), demo + router + ui builds.
10. trellis-check → spec update (`library-i18n-contract.md`: type
    generation contract; note the tooling module) → jj commit → archive +
    journal.

## Rollback

- Phase A/B: delete the plugin registration + generated file + revert
  admin-locale.ts — full prior state, no other files touched.
- Phase C: test-only additions are additive.

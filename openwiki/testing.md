---
type: guide
title: Testing — Suites, Harnesses, and Commands
description: Where every focused test suite lives, what invariants it proves, the harness conventions used, and the narrowest validation commands per package.
tags: [testing, vitest, happy-dom]
---

# Testing — Suites, Harnesses, and Commands

All tests run under **Vitest** with per-package `vitest run`
(`pnpm test` in each package; `pnpm --filter <name> test` from the root).
Package vite configs define `test.include: ["tests/**/*.test.{ts,tsx}"]`; suites
that mount components annotate `// @vitest-environment happy-dom` (admin shell,
login page, i18n contract, admin i18n contract, prototype contract,
use-component-i18n, use-global-i18n-sync), while pure-logic suites run in the
default `node` environment.

Suite inventory (test-file counts from `grep` of `it(` blocks):

| Package | Suite | Focus |
|---|---|---|
| admin-vue-router | `tests/create-admin-router.test.ts` | plugin contract, generated routes, overrides, guards, dispose, redirect restoration (43 `it`) |
| admin-vue-router | `tests/navigation.test.ts` | navigation adapter: heal, scope guard, enterScope, fallback identity, metadata persistence (24 `it`) |
| admin-vue-router | `tests/route-registry.test.ts` | registry binding, codec encode/decode, error propagation (8 `it`) |
| admin | `tests/admin-shell.test.tsx` | shell layout, i18n sync, descendant context, tabs state machine, HMR/session behavior (24 `it`: 19 shell + 5 navigation store) |
| admin | `tests/auth-store.test.ts` | auth store lifecycle, restoration, login/logout, race containment (19 `it`) |
| admin | `tests/admin-login-page.test.tsx` | login form submission, non-login states, error surface (4 `it`) |
| admin | `tests/shell-preferences.test.ts` | hydration, persistence, normalization, storage-failure safety (6 `it`) |
| admin | `tests/admin-provider.test.tsx` | AdminProvider: Composer seeding/re-seeding, store init, menu config, NConfigProvider render, override provision (6 `it`) |
| admin | `tests/use-admin-provider.test.ts` | composable projection, action delegation, pure-projection invariant, naiveUiConfig/proLayoutConfig derivation (4 `it`) |
| admin | `tests/i18n-contract.test.tsx` | admin override snapshot/slices, defaults, fallback (5 `it`) |
| admin | `tests/json-locale-types.test.ts` | codegen correctness, stability, drift, watch path (15 `it`) |
| i18n | `tests/i18n-text.test.ts` | I18nText schema + resolution (8 `it`) |
| i18n | `tests/library-i18n-plugin.test.ts` | factory descriptor, slices, defensive copy (5 `it`) |
| i18n | `tests/use-component-i18n.test.tsx` | packaged defaults, override merge, fallbackRoot, host-key resolution, nearest-composer (7 `it`) |
| i18n | `tests/use-global-i18n-sync.test.tsx` | one-way locale sync (3 `it`) |
| prototype | `tests/i18n-contract.test.ts` | plugin snapshot, slices, card locale ownership (4 `it`) |

## Harness conventions

- **admin-shell.test.tsx** — `mountShell()` builds a fresh Pinia, configures the
  menu/navigation/auth stores (restore settles authenticated), mounts AdminShell
  with caller-owned synthetic slots, and `cleanMountedApps()` unmounts apps and
  clears the happy-dom document after each test. `settle()` flushes promise
  continuations + `nextTick`. Dropdown interactions dispatch real mouse events.
- **create-admin-router.test.ts** — `createTestHarness()` creates an app with
  Pinia + the plugin (memory history); `authenticate()` / `configureAuth()` set
  auth store state; `mockWaitForRestoration()` replaces
  `waitForRestoration` with a controlled promise; `getDispose()` resolves
  `ADMIN_DISPOSE_KEY` via `app.runWithContext`.
- **navigation.test.ts** — `createHarness()` builds a memory router + registry +
  runtime with deterministic `createPageId` (`generated-N`) and scope
  `"scope-1"`; `afterNextNavigation` resolves after the router's next
  `afterEach`.
- **admin-provider.test.tsx / use-admin-provider.test.ts** — mount under a real
  Pinia and a host-owned global `createI18n`; `mountProvider()` re-renders
  `AdminProvider` from a render-prop so reactive prop changes propagate;
  `mountApi()` captures the `useAdminProvider()` API object during setup.
  `configureStores()` (initialize + menu configure) is the consumer-owned step
  the composable must never perform itself.
- **i18n suites** — mount under a host-owned global `createI18n`, optionally
  `app.use(plugin, { messages: overrides })`; assertions read rendered
  `data-*` attributes.

## Narrowest validation per change area

| Change area | Narrowest command |
|---|---|
| Route registry / codecs | `pnpm --filter @noob-naive-ui/admin-vue-router test` (or `vitest run tests/route-registry.test.ts`) |
| Navigation adapter / scope guard / heal | `pnpm --filter @noob-naive-ui/admin-vue-router test tests/navigation.test.ts` |
| Router plugin / guards / dispose | `pnpm --filter @noob-naive-ui/admin-vue-router test tests/create-admin-router.test.ts` |
| Shell / tabs / navigation store | `pnpm --filter @noob-naive-ui/admin test tests/admin-shell.test.tsx` |
| Auth store / login page | `pnpm --filter @noob-naive-ui/admin test tests/auth-store.test.ts tests/admin-login-page.test.tsx` |
| Preferences persistence / naive-ui config | `pnpm --filter @noob-naive-ui/admin test tests/shell-preferences.test.ts` |
| AdminProvider / useAdminProvider / provider refactor | `pnpm --filter @noob-naive-ui/admin test tests/admin-provider.test.tsx tests/use-admin-provider.test.ts tests/shell-preferences.test.ts` |
| Locale JSON changes (admin) | regenerate `locale-types.generated.ts`, then `pnpm --filter @noob-naive-ui/admin typecheck && pnpm --filter @noob-naive-ui/admin test tests/i18n-contract.test.tsx` |
| Locale-type codegen changes | `pnpm --filter @noob-naive-ui/admin test tests/json-locale-types.test.ts` |
| i18n package changes | `pnpm --filter @noob-naive-ui/i18n test` |
| Prototype i18n changes | `pnpm --filter @noob-naive-ui/prototype-i18n-verification test` |
| Cross-package integration | `pnpm --filter demo typecheck` then `pnpm --filter demo build`, plus the package suites above |

Root-wide checks: `pnpm -r --if-present typecheck` (per-package `tsc --noEmit`),
`pnpm lint` (oxlint `--type-aware`), `pnpm format:check` (oxfmt). Full CI
validation for a change that touches multiple packages is `pnpm -r --if-present
typecheck && pnpm -r --if-present test` followed by `pnpm build`.

# Implement: shared i18n composables

## Phase A — Package scaffold

1. `pnpm-workspace.yaml`: add `packages/i18n`.
2. `packages/i18n/`:
   - `package.json` (`@noob-naive-ui/i18n`, private, dist entry, deps
     vue/vue-i18n/zod catalog + tsafe, devDeps per admin conventions).
   - `tsconfig.json` (extends `../../tsconfig.library.json`, paths
     self-map), `tsconfig.build.json` (copy admin's shape).
   - `vite.config.ts` (lib build, dts, external vue/vue-i18n/zod/tsafe,
     vueJsx plugin for tests, node test env).
3. Root `tsconfig.json`: add `@noob-naive-ui/i18n` path → src.
4. `pnpm install` (link the new workspace member).

## Phase B — Move primitives

5. Create `packages/i18n/src/i18n-text.ts` (schema renamed
   `i18nTextSchema`, body identical), `use-component-i18n.ts`,
   `use-global-i18n-sync.ts` (per design §2, incl. Option A: returns the
   global Composer), `index.ts` barrel.
6. Delete `packages/admin/src/i18n/i18n-text.ts`; remove the three
   re-exports from `packages/admin/src/index.ts`; update
   `admin-shell.tsx` internal import.
7. `admin-vue-router`: `navigation.ts` schema import → `i18nTextSchema`
   from `@noob-naive-ui/i18n`.
8. Declare `"@noob-naive-ui/i18n": "workspace:*"` in admin + admin-vue-router
   package.jsons; add `@noob-naive-ui/i18n` to admin vite external list.

## Phase C — Refactor components onto composables

9. `admin-shell.tsx`: replace the inject/composer/merge block with
   `useComponentI18n({ messages: adminShellMessages, overridesKey:
   adminI18nOverridesKey, emptySnapshot: DEFAULT_SNAPSHOT, selectOverrides:
   selectAdminShellOverrides })`; replace the globalComposer + watcher with
   `useGlobalI18nSync(() => preferences.locale)` (keep label resolution
   against the returned global Composer).
10. `admin-login-page.tsx`: same swap with AdminLoginPage messages/selector;
    delete the manual composer block.
11. Grep for `adminI18nTextSchema` / leftover `composer.fallbackRoot` /
    manual merge loops — no stragglers outside the composable.

## Phase D — Tests

12. `packages/i18n/tests/i18n-text.test.ts` (schema + resolver, moved).
13. `packages/i18n/tests/use-component-i18n.test.tsx` (5 assertions per
    design §6).
14. `packages/i18n/tests/use-global-i18n-sync.test.tsx` (immediate /
    deferred / change propagation).
15. Verify admin + router suites still green (they cover the refactored
    components).

## Phase E — Gates + browser

16. `pnpm exec tsc -b --noEmit`, `pnpm lint`, `pnpm format:check`,
    `pnpm --filter @noob-naive-ui/i18n test`, builds for i18n/admin/
    admin-vue-router/ui/demo.
17. Browser regression on `demo-dev`: en↔zh-CN switch (shell, menu, page,
    reactive tab titles), login page locale, fr fallback.
18. `trellis-check` → spec update (`library-i18n-contract.md` gains the
    composable contract; note the package in the index) → jj commit →
    archive + journal.

## Rollback points

- After A: package scaffold only — no behavior touched.
- After B/C: revert moves + refactor restores exact prior code; tests green
  at 15.
- After D: test-only additions are additive.

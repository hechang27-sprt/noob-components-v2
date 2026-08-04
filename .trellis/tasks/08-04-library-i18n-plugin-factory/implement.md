# Implement: shared library i18n plugin factory

## Phase A — i18n package core

1. `packages/i18n/package.json`: add `"tsafe": "^1.8.12"` dependency.
2. Create `packages/i18n/src/library-i18n-plugin.ts`: `DeepPartial`,
   `LibraryI18nOverrides`, `LibraryI18nSnapshot`, `LibraryI18nPluginOptions`,
   `LibraryI18nPlugin`, `selectComponentOverrides` (tsafe `objectEntries`),
   `createLibraryI18nPlugin` per design.
3. Rewrite `packages/i18n/src/use-component-i18n.ts` to
   `{ messages, plugin, componentId }`; keep the merge loops, the 11.4.8
   `fallbackRoot` correction, and the `Object.entries` key-widening comment.
4. `packages/i18n/src/index.ts`: export the factory symbols; update the
   `UseComponentI18nOptions` export.
5. `pnpm install` (link tsafe).

## Phase B — admin package

6. Rewrite `packages/admin/src/i18n/plugin.ts` as a factory instantiation;
   keep `adminI18nPlugin`, `adminI18nOverridesKey`, `DEFAULT_SNAPSHOT`,
   `AdminI18nPluginOptions`, `AdminI18nSnapshot`; add `adminI18n` descriptor
   export; delete the two component selectors.
7. `packages/admin/src/i18n/admin-locale.ts`: derive `AdminLocaleOverrides`
   from `LibraryI18nOverrides`; delete private `DeepPartial`.
8. `admin-shell.tsx` + `admin-login-page.tsx`: swap
   `{ messages, overridesKey, emptySnapshot, selectOverrides }` for
   `{ messages, plugin: adminI18n, componentId }`.
9. `packages/admin/src/index.ts`: update the i18n plugin re-exports (drop
   the two selectors; keep plugin/key/snapshot/options types; add
   `adminI18n`, `adminI18nOverridesKey`, `DEFAULT_SNAPSHOT` as currently
   exported).
10. Grep for `selectAdminShellOverrides` / `selectAdminLoginPageOverrides` /
    `selectOverrides` stragglers in packages/admin.

## Phase C — ui package

11. Rewrite `packages/ui/src/i18n/plugin.ts` as a factory instantiation with
    `Record<never, never>` schema; keep `noobUiI18nPlugin` and the exported
    types (`NoobUiI18nSnapshot`, `NoobUiI18nPluginOptions`,
    `NoobUiLocaleOverrides` derived from `LibraryI18nOverrides`).
12. `packages/ui/package.json`: add `"@noob-naive-ui/i18n": "workspace:*"`
    dependency; add `@noob-naive-ui/i18n` to the vite external list.
13. `pnpm install`.

## Phase D — tests

14. `packages/i18n/tests/use-component-i18n.test.tsx`: refactor to build the
    plugin via `createLibraryI18nPlugin`; assert defaults-only and
    override-slice paths.
15. New `packages/i18n/tests/library-i18n-plugin.test.ts`: defensive
    snapshot copy (caller mutation after install), generic slice selection
    per locale, empty-library instantiation, absent-plugin default snapshot.
16. `packages/admin/tests/i18n-contract.test.tsx`: migrate selector imports
    to `adminI18n.selectComponentOverrides`; keep behavioral assertions.

## Phase E — gates + finish

17. `pnpm exec tsc -b --noEmit`, `pnpm lint`, `pnpm format:check`.
18. `pnpm --filter @noob-naive-ui/i18n test`; admin + admin-vue-router + ui
    suites; builds for i18n/admin/admin-vue-router/ui/demo.
19. Browser smoke on `demo-dev`: defaults render; (commented override block
    still valid against the exported `adminI18nPlugin`).
20. `trellis-check` → update `library-i18n-contract.md` (factory contract +
    composable signature) → jj commit → `task.py archive` + journal.

## Rollback points

- After A: additive package change only; admin/ui still compile against the
  old composable signature? No — A rewrites the signature, so keep A+B+C+D
  reviewable together; rollback = revert to the pre-task tree (all gates
  green before Phase A).
- After B/C: behavior identical; any failing admin/ui test indicates a
  migration bug, fix before Phase D.

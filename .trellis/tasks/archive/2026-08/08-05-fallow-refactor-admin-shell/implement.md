# Implement — fallow triage + AdminShell refactor

Working dir: `/home/hechang27/Documents/sprt/noob-components-v2-worktrees/review-20260805` (jj collocated repo, bookmark `dev`; use `jj`, not git). Dispatch context: `prd.md` → `design.md`.

## Ordered checklist

### Step 1 — Remove genuine dead code (tsafe only; see KEEP table in design.md)

1. `packages/admin/package.json` — remove `tsafe` from `dependencies`. Verify `packages/i18n` and `packages/prototype-i18n-verification` still declare it.
   - KEEP `DEFAULT_SNAPSHOT` in `packages/admin/src/i18n/plugin.ts` and `replacePreferences`/`reset` in `shell-preferences.ts` — documented public API per design.md's KEEP table.

### Step 2 — i18n package API rework (design §2f)

2. `packages/i18n/src/use-component-i18n.ts`:
   - Rename `useComponentI18n` → `createComponentI18n`. Add module-private `componentI18nKey: InjectionKey<Composer>`.
   - After building the local Composer, `provide(componentI18nKey, composer)`.
   - Change return type to `Composer` (drop `UseComponentI18nReturn`'s `{ composer, t, locale }` wrapper; callers destructure `const { t } = createComponentI18n(...)`).
   - Add `getComponentI18n(): Composer` — `inject(componentI18nKey)`, throw a clear error if absent (mirror `useAdminShell`'s fail-fast pattern).
   - Update `UseComponentI18nOptions` → `CreateComponentI18nOptions` (rename for consistency) or keep; pick one and apply everywhere.
3. `packages/i18n/src/index.ts` — export `createComponentI18n` (renamed), `getComponentI18n`, and updated option type. Remove `useComponentI18n`/`UseComponentI18nReturn`.
4. `packages/i18n/src/i18n-text.ts` — rewrite `resolveI18nText`'s `translate` param doc: it is vue-i18n's `t` passed directly (e.g. `resolveI18nText(label, composer.t)`); named values are forwarded as-is (undefined named is fine).
5. `packages/i18n/tests/use-component-i18n.test.tsx` — rename usage; adapt to `createComponentI18n` returning a composer; add a `getComponentI18n` throws-without-ancestor test and a resolves-nearest-ancestor test. `packages/i18n/tests/i18n-text.test.ts` — update expectations only if the signature changed (it should NOT: behavior identical).

### Step 3 — AdminShell controller + sub-components rework (design §2e, §2g)

6. `packages/admin/src/components/use-admin-shell-tabs.ts` — unchanged internal composable (already landed). It stays internal: do NOT export from `packages/admin/src/index.ts`.
7. `packages/admin/src/components/admin-shell.tsx`:
   - Use `createComponentI18n` (renamed import) for the local composer; pass `t` into `useAdminShellTabs`.
   - Widen `AdminShellContext` to the full tabs controller (see design §2e) and provide `{ navigate: requestDestination, tabs, visibleTabs, tabError, canActivateTab, activateTab, closeTab }`.
   - Render sub-components as real components in slots (`tabbar: () => <AdminShellTabbar />`, nav slots mount `AdminShellNavbarControls`), so they have their own setup context. Fix `resolveI18nText(label, globalComposer.t)` (drop the wrapper).
8. `packages/admin/src/components/admin-shell-tabbar.tsx` — rework to self-sufficient: `useAdminShell()` for tabs state/actions; `getComponentI18n().t` for `tabs.openPages` aria AND host tab labels via `resolveI18nText(label, t)` (single composer, fallbackRoot true); `useAdminShellNavigationStore()` for `activeId`. Drop the callback/data props and the `useI18n({ useScope: "global" })` dual-composer lookup.
9. `packages/admin/src/components/admin-shell-navbar-controls.tsx` — rework to self-sufficient: `useAdminShellPreferencesStore()`, `useAdminAuthStore()`, `getComponentI18n().t`; call store actions directly. Decide nav-left vs nav-right split (one component mounted in both slots, or `AdminShellNavLeft`/`AdminShellNavRight`). Drop handler/store props.

### Step 4 — Verify

10. Update `packages/admin/tests/admin-shell.test.tsx` `ShellContextConsumer` key assertion to the widened controller key set (sorted); all behavior tests must still pass.
11. Update `.trellis/spec/admin/frontend/runtime-contract.md` (`useAdminShell` is now the tabs controller, not command-only) and `.trellis/spec/ui/frontend/library-i18n-contract.md` (`createComponentI18n` / `getComponentI18n` naming + `resolveI18nText` usage).
12. `pnpm install` (lockfile update for admin tsafe removal).
13. Typecheck touched packages: `pnpm -r exec tsc --noEmit` (or per-package `tsc`), plus `apps/demo` typecheck.
14. Run admin tests (`admin-shell`, `shell-preferences`) and i18n tests (`use-component-i18n`, `i18n-text`). Fix regressions.
15. Re-run `fallow`; confirm zero genuine dead-code/duplication findings; record remaining false positives.

## Review gates

- Behavior-neutral refactor: no changes to `AdminShell`'s public API or rendered output.
- No formatter/linter/project-wide suite runs beyond the targeted commands above.

## Rollback

- jj: the WC sits on top of `dev`; refactor lands as WC changes. To discard: `jj restore` the touched files / `jj abandon` the working-copy change before commit.

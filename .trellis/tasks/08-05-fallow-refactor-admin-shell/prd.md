# Verify and fix fallow dead-code/health findings; refactor AdminShell

## Goal

Triage the `fallow` dead-code/duplication/health report run against the `dev` branch, fix only the genuine findings, and reduce the size/complexity of the over-long `AdminShell` component. Distinguish real issues from fallow false positives (vite configs not treated as entry points, generated locale-types file, framework CSS imports, root-level monorepo devDeps) and leave those untouched.

## Background

`fallow` reported (exit code 1): 1 unused file, 2 unused exports, 2 unused store members, 3 unused dependencies, 2 unused devDependencies, 6 unresolved imports, 5 unlisted dependencies, 2 duplicate clone groups, and 8 health-above-threshold files. Several findings are false positives that must not be "fixed" by contorting the code.

## Requirements

- **Verify each fallow finding** against the actual code before acting. Fix only genuine issues.
- **Remove genuine dead code:**
  - `packages/admin/package.json` — `tsafe` dependency unused by `packages/admin/src` and `packages/admin/tests` (only `packages/i18n` and `packages/prototype-i18n-verification` import it). Remove from admin's dependencies. Do NOT remove from packages that use it.
- **Do NOT remove (documented public API, fallow false positives):**
  - `DEFAULT_SNAPSHOT` in `packages/admin/src/i18n/plugin.ts` — `.trellis/spec/ui/frontend/library-i18n-contract.md:51` lists it as a public alias consuming packages re-export. Keep it.
  - `replacePreferences` / `reset` in `packages/admin/src/stores/shell-preferences.ts` — `useAdminShellPreferencesStore` is re-exported from `index.ts`; these are public store actions a host may call. Keep both.
- **Refactor `packages/admin/src/components/admin-shell.tsx`** (871 LOC; `AdminShell` 635 lines; `requestDestination` CRAP 71.3, `closeTab` 49.5) into smaller, single-responsibility units WITHOUT changing behavior. Split at least the tab-navigation state machine out of the component; the header/nav and tabbar render slots are also candidates. Behavior must be byte-identical to the current implementation for consumers.
- **Do NOT "fix" false positives:** treat these as intentional and leave code unchanged:
  - `tooling/vite/vue-i18n.ts` "unused file" — actually imported by `apps/demo/vite.config.ts` (vite configs aren't entry points).
  - `noobUiI18n` "unused export" in `packages/ui/src/i18n/plugin.ts` — feeds the exported `noobUiI18nPlugin` (`noobUiI18n.plugin`).
  - `tailwindcss/theme.css` / `tailwindcss/utilities.css` unresolved imports — Tailwind v4 CSS-first imports, framework-specific.
  - `@intlify/unplugin-vue-i18n`, `@tailwindcss/vite`, `@vitejs/plugin-vue-jsx`, `unplugin-dts`, `vite-plugin-vue-devtools` "unlisted" — declared at repo root `package.json`, consumed in package vite configs (monorepo root-devDep pattern).
  - Duplication in `packages/admin/src/locales/locale-types.generated.ts` — generated file (from `tooling/vite/json-locale-types.ts` via vite plugin); never hand-edit; regenerate instead.
- **Where reasonable**, add `fallow-ignore` annotations or a documented ignore config so re-running `fallow` reports only genuine findings — but only if it does not harm readability or hide real regressions. Keep it minimal.

## Acceptance Criteria

- [ ] Every fallow finding is triaged as fix / false-positive, with the triage recorded in the task notes or `implement.md`.
- [ ] `tsafe` removed from `packages/admin/package.json` dependencies; `packages/i18n` and `packages/prototype-i18n-verification` still declare/use it.
- [ ] `DEFAULT_SNAPSHOT`, `replacePreferences`, `reset` retained unchanged (documented public API).
- [ ] `admin-shell.tsx` split so no single unit exceeds the repo's conventions; `AdminShell` component body meaningfully smaller (target: component + render under ~400 LOC, with tab-navigation logic extracted to a composable); behavior unchanged — `admin-shell.test.tsx` passes.
- [ ] False positives left untouched; `tooling/vite/vue-i18n.ts` still imported by `apps/demo/vite.config.ts`; `noobUiI18n` still feeds `noobUiI18nPlugin`; generated file untouched.
- [ ] `pnpm install` (or equivalent) is clean after dependency changes; `pnpm -r exec tsc --noEmit` typechecks across touched packages; targeted tests pass.
- [ ] Re-running `fallow` reports zero genuine dead-code/duplication findings (false positives may remain, documented).

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- This is a **complex** task: `design.md` (refactor shape + false-positive taxonomy) and `implement.md` (ordered checklist) are required before `task.py start`.

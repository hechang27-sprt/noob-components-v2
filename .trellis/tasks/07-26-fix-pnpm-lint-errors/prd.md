# Fix pnpm lint errors

## Goal

Restore a clean workspace-wide `pnpm lint` run by fixing the five reproducible source-level lint errors without changing observable application or test behavior.

## Background

`pnpm lint` currently runs `oxlint --type-aware` across all six workspace projects and reports:

- `packages/admin/tests/admin-shell.test.tsx:95`: unused `preferences` declaration.
- `packages/admin-vue-router/tests/navigation.test.ts:192`: unused `home` declaration.
- `packages/admin-vue-router/tests/navigation.test.ts:240`: unused `home` declaration.
- `packages/admin-vue-router/tests/navigation.test.ts:64`: unsafe implicit base-object stringification of `nav.payload?.reportId`.
- `apps/demo/src/admin-navigation.ts:21`: unsafe implicit base-object stringification of `destination.payload?.reportId`.

The separate `MODULE_TYPELESS_PACKAGE_JSON` warning originates from the workstation-level pnpm installation under `/home/hechang27` and is not a repository lint error.

## Requirements

- Remove declarations that are genuinely unused rather than suppressing the lint rule.
- Narrow or validate router-neutral payload values before converting a report ID to display text, so objects cannot silently become `"[object Object]"`.
- Preserve the existing test intent and demo tab-label behavior for supported scalar report IDs.
- Keep changes limited to the reported lint failures and directly affected assertions or fixtures.

## Acceptance Criteria

- [ ] `pnpm lint` exits successfully with no repository source errors.
- [ ] The affected admin and admin-vue-router test suites pass.
- [ ] The demo still produces `Report <reportId>` for supported report-detail destinations.
- [ ] No lint-disable comments, placeholder variables, or broad type assertions are introduced.

## Out of Scope

- Modifying the user-level `/home/hechang27/package.json` to suppress pnpm's module-type warning.
- Unrelated refactors, dependency changes, or formatting churn.

## Key Decisions

- This is a lightweight, PRD-only task: the failures are reproduced, localized, and independently verifiable.
- Fix root causes in fixtures and display-value narrowing instead of weakening lint configuration.

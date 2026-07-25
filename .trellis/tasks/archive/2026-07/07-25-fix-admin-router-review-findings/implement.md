# Implementation plan: Fix admin router review findings

## Phase 1 — Regression boundaries first

1. Add R3 regression coverage in `packages/admin-vue-router/tests/create-admin-router.test.ts`.
   - Force the first authenticated scope-entry attempt to reject through a host-controlled dependency.
   - Prove current code leaves transition orchestration unable to perform the next eligible attempt or emits an unhandled rejection.
   - Run the focused test and record RED before production edits.

2. Add R4 regression coverage in `packages/admin-vue-router/tests/create-admin-router.test.ts` and, only if the route-input contract changes independently, `route-registry.test.ts`.
   - Cover malformed codec payload and missing history-state payload fallback.
   - Preserve a valid protected URL redirect restoration case.
   - Run the focused tests and record RED before production edits.

## Phase 2 — Fix router invariants

3. Harden route metadata in `packages/admin-vue-router/src/create-admin-router.ts`.
   - Stamp shell `requiresAuth: true` after host metadata.
   - Keep login `requiresAuth` absent/false regardless of host metadata.
   - Add observable route-resolution tests for both reserved-key attempts and ordinary metadata.

4. Make auth-transition settlement explicit in `create-admin-router.ts`.
   - Bound `scopeEntryPending` with `try/finally`.
   - Route detached subscription invocations through explicit rejection handling.
   - Keep status ownership and router lifecycle unchanged.
   - Run R3 test to GREEN.

5. Make redirect reconstruction safe and honest.
   - Define a narrow route-read input in `packages/admin-vue-router/src/route-registry.ts` if needed to accept both loaded and resolved routes without casts.
   - Catch redirect codec/schema failures only in `resolvePostLoginDestination()` and return home.
   - Do not weaken strict codec behavior for normal navigation.
   - Run R4 tests to GREEN.

## Checkpoint — Router package

- `pnpm --filter @noob-naive-ui/admin-vue-router typecheck`
- `pnpm --filter @noob-naive-ui/admin-vue-router test`
- `pnpm --filter @noob-naive-ui/admin-vue-router build`

## Phase 3 — Delete type erasure

6. Type `packages/admin/src/stores/menu.ts` with `AdminMenuTree` and remove the cast from `packages/admin/src/components/admin-shell.tsx`.
   - Reuse the existing public alias; add no validator or wrapper.
   - Run admin typecheck and tests.

## Phase 4 — Persistence alignment

7. Rewrite `.trellis/spec/demo/frontend/runtime-integration-contract.md` around `createAdminRouter()` and current ownership.
   - Remove nonexistent API/component names.
   - Correct redirect-validation and scope-repair ownership.
   - Keep browser validation requirements aligned with the demo.

8. Review `.trellis/spec/admin/frontend/runtime-contract.md` for any now-stale statement and change only contradictions introduced by the fixes.

## Final verification

- `pnpm --filter @noob-naive-ui/admin typecheck`
- `pnpm --filter @noob-naive-ui/admin test`
- `pnpm --filter @noob-naive-ui/admin build`
- `pnpm --filter @noob-naive-ui/admin-vue-router typecheck`
- `pnpm --filter @noob-naive-ui/admin-vue-router test`
- `pnpm --filter @noob-naive-ui/admin-vue-router build`
- `pnpm --filter demo typecheck`
- `pnpm --filter demo build`
- Start the demo and browser-smoke anonymous deep link, successful redirect restoration, malformed redirect fallback, authenticated shell, and logout.

## Review gates

- Confirm R3 and R4 tests failed for the intended reason before source edits.
- Review exported type changes with LSP references before editing.
- Adversarially review async settlement and redirect-boundary decisions before finalizing.
- Do not add retry state, logging APIs, or route wrappers unless a failing regression proves they are necessary.

# Fix admin router review findings

## Goal

Restore the factory-owned admin-router invariants identified by the `swt..snv` audit, align persistence documentation with the implemented integration, and remove avoidable type erasure. The fixes must preserve the current public integration shape while making auth routing failures safe and regression-tested.

## Background

The audit established five in-scope defects:

1. `.trellis/spec/demo/frontend/runtime-integration-contract.md:16-27,35-39,72-79` documents a nonexistent `createAdminShellVueRouterNavigation` API and obsolete demo-owned login/shell route components.
2. `packages/admin-vue-router/src/create-admin-router.ts:215-219` lets host metadata override package-owned `requiresAuth` invariants.
3. `packages/admin-vue-router/src/create-admin-router.ts:260-305` leaves `scopeEntryPending` set after scope-entry settlement and discards rejected transition promises.
4. `packages/admin-vue-router/src/create-admin-router.ts:119-142` casts a synthetic resolved route to a loaded route and allows malformed/unrestorable redirect payload decoding to throw instead of falling back home.
5. `packages/admin/src/stores/menu.ts:13-30` erases `AdminMenuTree` to `unknown[]`, forcing `packages/admin/src/components/admin-shell.tsx:490` to cast it back.

## Requirements

### R1 — Persist the factory-owned integration

- Replace obsolete manual navigation signatures and nonexistent route-component ownership in the demo runtime contract with `createAdminRouter()`.
- Attribute generated routes, auth guards, redirect validation, auth-transition routing, and scope repair to `@noob-naive-ui/admin-vue-router`.
- Attribute Pinia/history/registry/presentation/scope inputs to the host.

### R2 — Protect reserved route metadata

- Shell routes must remain protected regardless of host metadata.
- Login routes must remain public regardless of host metadata.
- Host metadata must continue to merge for non-reserved keys.
- The API documentation must identify `requiresAuth` as package-owned rather than additive host metadata.

### R3 — Settle auth-transition orchestration safely

- `scopeEntryPending` must describe an in-flight operation and reset after both success and failure.
- Rejected scope entry must not produce an unhandled promise rejection.
- A failed transition must not suppress a later eligible authenticated transition.
- Add a regression test that fails against the current implementation before changing production code.

### R4 — Treat redirect reconstruction as an untrusted boundary

- Root-relative protected URLs with valid URL-decodable payloads must continue to restore their destination.
- External, public, login, unmatched, malformed, codec-invalid, and history-state-dependent redirects must fall back to `homeDestination` without rejecting the auth transition.
- Remove the false `RouteLocationNormalizedLoaded` cast from synthetic `router.resolve()` results.
- Add regression tests that fail against the current implementation before changing production code.

### R5 — Preserve menu typing end to end

- `useAdminShellMenuStore` must accept and expose `AdminMenuTree` (or the equivalent `MenuOption[]`) directly.
- `AdminShell` must consume the store without a cast.
- No runtime validation layer is required because this is an in-process typed host boundary, not persisted/untrusted input.

## Out of Scope

- New router features, retry UI, telemetry, backend/session behavior, or new public wrappers.
- Redesigning route codecs beyond the minimum shared input boundary needed to remove the unsafe cast.
- Cleanup of auxiliary task/history artifacts or unrelated dead types.

## Acceptance Criteria

- [ ] AC1: The demo runtime persistence contract exclusively documents real exported APIs and current ownership.
- [ ] AC2: Host metadata cannot make the shell public or login protected; unrelated host metadata remains present.
- [ ] AC3: A scope-entry rejection is handled, pending state is released, and a later eligible transition can execute.
- [ ] AC4: Invalid or non-URL-restorable redirect codec data resolves to `homeDestination` without an unhandled rejection.
- [ ] AC5: Valid protected redirect URLs still restore their canonical destination.
- [ ] AC6: Menu options remain typed from configuration through rendering with no assertion cast.
- [ ] AC7: Regression tests for R3 and R4 demonstrate RED before implementation and GREEN afterward.
- [ ] AC8: Admin, admin-vue-router, and demo typecheck/test/build checks pass.

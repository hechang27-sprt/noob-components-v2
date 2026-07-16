# Implementation plan: Candidate A controlled navigation

## Scope

Implement the selected string-keyed `AdminShellNavigation` contract across `@noob-naive-ui/admin` and `apps/demo`. Preserve shell-local open-tab lifecycle and replace the demo's split `RouterLink`/tab callback flow with one controlled navigation callback.

## Ordered implementation

1. **Change the public navigation contract**
   - In `packages/admin/src/components/admin-shell.tsx`, add `AdminShellActiveNavigation` with optional `menuKey`.
   - Replace `AdminShellTabController` with `AdminShellNavigation` using `active`, `navigate`, and `closeTab`.
   - Keep `AdminShellTabInput` and shell-local `AdminShellTab` string-keyed; add no generic key or destination-policy types.
   - Update `packages/admin/src/index.ts` exports as a clean cutover with no alias.

2. **Route menu and tabs through the selected adapter**
   - Derive tab selection and tab recording from `navigation.active.key`.
   - Derive menu selection from `navigation.active.menuKey ?? navigation.active.key`.
   - Bind `NMenu.onUpdateValue` and `NTabs.onUpdateValue` to the same guarded async `navigation.navigate` path.
   - Rename close integration to `navigation.closeTab`.
   - Preserve duplicate-action suppression, session-version invalidation, close fallback selection, membership mutation only after resolved close, and generic UI-safe errors.
   - Ensure selection remains host-authoritative when navigation rejects.

3. **Update focused admin behavioral coverage**
   - Migrate controller fixtures in `packages/admin/tests/admin-shell.test.ts` to the new contract.
   - Prove menu and tab actions invoke the same `navigate` callback.
   - Prove `menuKey` overrides menu highlighting without changing active tab identity; absent `menuKey` falls back to `key`.
   - Prove host `active` changes synchronize menu, active tab, and visited membership.
   - Preserve existing activation rejection, close success/failure, concurrent close, ordering/reindexing, and auth/controller replacement coverage.

4. **Simplify the demo adapter**
   - In `apps/demo/src/App.tsx`, remove `RouterLink` menu labels and use plain labels.
   - Replace `tabController` with one stable `navigation` adapter.
   - Expose `active` directly from `router.currentRoute.value`; remove the intermediate `currentTab` computed unless another actual consumer remains.
   - Implement `navigate` and `closeTab` with the app-owned router.
   - Keep route definitions as the only route-to-label/closability registry and keep open-tab membership out of the demo.

5. **Align executable contracts**
   - Update `.trellis/spec/admin/frontend/runtime-contract.md` with the selected public signatures, controlled menu behavior, and `menuKey` semantics.
   - Update `.trellis/spec/demo/frontend/runtime-integration-contract.md` with the one-adapter demo flow and plain menu labels.
   - Update any declaration/type assertions that reference `AdminShellTabController`.

## Verification

Run in order:

```bash
pnpm --filter @noob-naive-ui/admin test
pnpm --filter @noob-naive-ui/admin typecheck
pnpm --filter @noob-naive-ui/admin build
pnpm --filter demo typecheck
pnpm --filter demo build
```

Browser smoke test with `pnpm --filter demo dev`:

1. authenticate into the demo;
2. select each menu item and observe route, menu highlight, active tab, and page content converge;
3. activate existing tabs and observe the same convergence;
4. use browser back/forward and direct route entry;
5. close an active tab and verify fallback navigation plus membership removal;
6. confirm no duplicate navigation, console warning, or console error.

## Review gates

- Public declarations contain `AdminShellNavigation` and `AdminShellActiveNavigation`; `AdminShellTabController` is absent.
- `packages/admin` imports no Vue Router API and receives no route object or destination model.
- `apps/demo` contains no `RouterLink` menu label or duplicate open-tab collection.
- `NMenu` and `NTabs` request activation through the same callback.
- Active selection changes only from `navigation.active`, never optimistically from the requested key.
- Existing close/session race protections remain intact.

## Risk and rollback points

- **Public contract cutover:** all workspace consumers and tests must migrate in the same change. Roll back the contract and callers together; do not leave an alias.
- **Async activation path:** reusing or refactoring the existing pending logic can accidentally permit duplicate menu/tab requests. Preserve per-tab ownership and session guards.
- **Menu value mismatch:** `menuKey` may identify a parent menu item while `key` identifies the tab. Tests must assert both values simultaneously.
- **Naive UI event behavior:** avoid nested links and ensure controlled menu updates do not optimistically change the host-authoritative value.

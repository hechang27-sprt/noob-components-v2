# Implement: heal stale revives on history traversal

## Order of work

1. **Adapter heal branch** — `packages/admin-vue-router/src/navigation.ts`:
   add `kind: "heal"` handling in `handleNavigation` with the fullPath guard.
2. **Shell request union + reconciliation** —
   `packages/admin/src/components/admin-shell.tsx`:
   - extend `AdminShellNavigationRequest` with the heal variant (with doc
     comment);
   - in the navigation watch, replace the plain `recordCurrentTab` path with
     a helper `reconcileRevivedTab(navigation, active)` that either records
     immediately or fires the async heal.
3. **Adapter tests** — `packages/admin-vue-router/tests/navigation.test.ts`:
   - heal rewrites a stale stamped entry to the committed descriptor (id
     changes in history state, active id follows);
   - heal no-ops when the destination resolves to a different URL
     (`detail/:reportId`);
   - heal no-ops when the current descriptor already matches the destination.
4. **Shell tests** — `packages/admin/tests/admin-shell.test.tsx`: simulate a
   history-traversal revive (navigation.active switches to an uncommitted id
   with a committed navKey match) and assert only the committed instance
   survives and the heal request is issued; and a revive with no navKey match
   is still recorded.
5. **Contract doc** — extend the heal sentence in
   `.trellis/spec/admin/frontend/runtime-contract.md`.
6. **Verify** — vitest (admin, admin-vue-router), typecheck (admin,
   admin-vue-router, demo), then browser reproduction.

## Test strategy notes

- Adapter tests use the existing `createHarness` (memory router, deterministic
  ids). Build the close+reopen history shape manually: open tab-1 → open
  tab-2 → close tab-2 (push fallback) → open tab-3 (new id for same navKey) →
  `router.back()` → assert active id is the old one → `handleNavigation({kind:
  "heal", destination: tab-3})` → assert `router.options.history.state`
  metadata id is tab-3's id and position/URL unchanged.
- Shell tests: the shell watches `nav.navigation.active`; drive it by
  swapping the configured fake navigation's `active` getter (existing shell
  test harness pattern) and asserting `openedDescriptors()` / visible tab
  count after the heal resolves.

## Out of scope

- Changing close to replace instead of push (history-stack bloat is cosmetic;
  the duplicate is the defect).
- Dashboard unstamped fallback identity.

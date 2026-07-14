# Implementation plan: map-backed AdminShell tabs

## Task 1: Define the host/local tab boundary

Update `AdminShellTabInput`, `AdminShellTab`, and `AdminShellTabController` in `packages/admin/src/components/admin-shell.tsx`; update the public barrel and runtime-contract specification.

**Acceptance criteria**
- `current` accepts descriptor input only.
- Shell state carries `index` and per-operation pending ownership.
- Declarations expose the new types intentionally.

**Verification**
- Add compile-time-oriented type usage in the component test.
- `pnpm --filter @noob-naive-ui/admin typecheck`

## Task 2: Replace ordered-array and global pending state

Refactor tab membership to `reactive(Map)` plus `visibleTabs` and one documented reindex helper. Update recording, rendering, suggested-next selection, clearing, activation, and closing to use the new state.

**Acceptance criteria**
- No `pendingActivations` or `pendingCloses` remains.
- UI order and indexes follow `visibleTabs` after append/remove.
- Host descriptor updates retain local state.

**Verification**
- Focused happy-dom cases for append order, close reindex, and descriptor refresh.

## Task 3: Preserve async/session invariants

Attach request ownership to the tab record. Keep `sessionVersion` checks and guard every post-await update/clear against both current session and matching per-tab request ownership.

**Acceptance criteria**
- Duplicate requests are suppressed.
- Rejected requests retain membership and expose generic feedback.
- A stale settlement cannot affect a new session or newer request.

**Verification**
- Focused pending, rejection, resolved-close, controller/auth transition tests.

## Checkpoint

- [x] `pnpm --filter @noob-naive-ui/admin test -- admin-shell`
- [x] `pnpm --filter @noob-naive-ui/admin typecheck`
- [x] `pnpm --filter @noob-naive-ui/admin build`
- [x] Review confirms no router/menu-boundary regression and no stale global pending records.

## Files expected

- `packages/admin/src/components/admin-shell.tsx`
- `packages/admin/tests/admin-shell.test.ts`
- `packages/admin/src/index.ts`
- `.trellis/spec/admin/frontend/runtime-contract.md`

## Rollback

Revert this task’s component/type/test/spec edits together. No persisted state or migration is involved.

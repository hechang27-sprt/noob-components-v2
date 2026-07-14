# Refactor AdminShell tab state

## Goal

Simplify `AdminShell`’s local open-tab state without changing its router-neutral boundary or its observable tab behavior. The shell will store tab records by key in a reactive map and keep their render order separately.

## Confirmed facts

- `AdminShell` currently owns an ordered `ref<AdminShellTab[]>` and separate pending-activation/close records.
- `AdminShellTabController.current` currently uses `AdminShellTab`, even though the host only owns a tab descriptor.
- `AdminShell` invalidates stale async callbacks through `sessionVersion` when authentication or the controller changes.
- The tab type is exported from the public barrel; changing it requires declaration, runtime-contract, and behavioral-test coverage.

## Requirements

1. Replace the ordered array with `const tabs = reactive(new Map<string, AdminShellTab>())` and `const visibleTabs = ref<string[]>([])`.
2. Make `visibleTabs` the sole tab-order source. Recalculate each stored tab’s `index` after every insertion and removal, including resolved close.
3. Make `AdminShellTab` shell-local state: it contains the host descriptor fields plus `index` and per-tab activation/close pending ownership fields.
4. Introduce a distinct host descriptor/input type for `AdminShellTabController.current`. `recordCurrentTab` updates only `key`, `label`, and `closable`; it must preserve local index and pending ownership fields.
5. Remove `pendingActivations` and `pendingCloses` completely. Per-tab pending fields must suppress duplicate actions.
6. Preserve session invalidation: a settled earlier request must not mutate a newer auth/controller session or clear a newer request’s pending state.
7. Preserve existing direct opaque-menu, router-free, and default-slot boundaries.

## Acceptance criteria

- [x] The component has exactly the map-backed tab registry and ordered key list; rendering and next-tab selection iterate `visibleTabs`, not map insertion order.
- [x] Every local tab has its current render `index`; successful close removes the key and reindexes all remaining tabs.
- [x] `AdminShellTabController.current` accepts a host descriptor/input, not shell-local tab state; emitted declarations and public exports expose the correct separation.
- [x] Host descriptor refreshes update label/closable state without overwriting index or in-flight ownership fields.
- [x] Duplicate activation/close remains suppressed per tab, and a stale promise cannot clear/mutate a newer request or session.
- [x] Focused happy-dom tests cover ordering/reindexing, descriptor-state separation, pending ownership, close success/failure, and session/controller invalidation.
- [x] Admin package tests, typecheck, and build pass.

## Out of scope

- Fixing the separate code-review findings about the controller’s plain-object reactivity contract or ARIA tab keyboard/focus behavior.
- Router integration, persisted tabs, changes to menu composition, or new public navigation APIs.

## Open questions

None. The user specified the state split and required host/local type boundary.

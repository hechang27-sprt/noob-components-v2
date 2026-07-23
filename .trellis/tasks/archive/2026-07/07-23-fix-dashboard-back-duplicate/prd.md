# Fix duplicate dashboard tab on browser back

## Goal

Keep an unstamped initial dashboard history entry bound to one stable page-instance descriptor while the user traverses away from and back to it.

## Requirements

- Reproduce the duplicate-dashboard behavior with the real memory router and navigation adapter.
- Preserve fallback descriptor identity across intervening stamped history entries.
- Scope fallback identity to a browser-history entry so distinct unstamped entries can still represent distinct page instances.
- Do not persist destination data or introduce a second tab-state owner.
- Keep the change within `@noob-naive-ui/admin-vue-router`; the demo must not add workaround logic.

## Acceptance Criteria

- [ ] A regression test fails before the fix when navigating from the initial unstamped dashboard to a stamped route and back.
- [ ] Returning to that initial dashboard yields the exact original fallback descriptor ID.
- [ ] Repeated reads of an unstamped entry remain stable.
- [ ] Existing codec, metadata restoration, open, activate, close, and replace tests pass.
- [ ] Adapter typecheck/build and demo typecheck pass.

## Notes

The route/history snapshot objects are not themselves stable page-instance identity across browser traversal. The adapter should key fallback descriptors by the router history entry identity exposed in history state, with a deterministic fallback for an unstamped initial entry.

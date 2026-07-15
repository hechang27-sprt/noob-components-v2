# Fix AdminShell concurrent close ordering

## Goal

Prevent concurrent tab-close completions from removing the wrong visible-order key after an earlier close shifts indexes.

## Root cause

`closeTab` captures a tab index before awaiting the starter’s async close callback, then splices that captured position after resolution. Another successful close can shift the target’s current position during the await.

## Requirements

1. Preserve the pre-await index only for calculating the starter’s suggested-next key.
2. At successful guarded settlement, locate the requested tab key in the current `visibleTabs` order before removing it.
3. Delete the map entry, remove exactly that key from `visibleTabs`, and reindex remaining tabs.
4. Add a deterministic regression test with two concurrent close requests where the earlier tab resolves first.

## Acceptance criteria

- [x] For `[a, b, c]`, concurrent closes of `a` and `b` that resolve in that order leave only `c` rendered and ordered.
- [x] No visible-order key lacks a matching tab record after either close settles.
- [x] Existing close suggestion, duplicate suppression, failure, session, typecheck, and build behavior remain intact.

## Out of scope

- The separately tracked plain-controller reactivity and ARIA keyboard/focus review findings.

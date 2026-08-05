# Design: heal stale revives on history traversal

## Context

`AdminShell` records host-confirmed descriptors by immutable `id`
(`recordCurrentTab`). Browser history entries carry stamped tab metadata
(`scopeId` + `{ id, label, closable? }`). Closing a tab removes it from the
shell's map but leaves its stamped history entry; re-opening the destination
allocates a new id. Backing onto the old entry restores the old id, which the
shell adds as a *new* tab — a duplicate of the re-opened tab.

The shell already dedupes menu-driven navigation by exact destination (newest
matching tab wins: same `navKey` and equal `payload` record, compared with
`es-toolkit` `isEqual`). History-driven revives do not apply that policy.

## Approach

Extend the *sole host callback* (`AdminShellNavigation.handleNavigation`) with
a `heal` request variant, and have the shell request it from the navigation
watch when a revive is redundant.

### 1. `heal` request variant (package admin, shell-owned type)

```ts
| {
    kind: "heal";
    /** Supplies the exact committed page instance that becomes the canonical identity for the current history entry. */
    destination: AdminShellTabDescriptor;
    /** Supplies the host-authoritative active page before healing, or null when none exists. */
    current: AdminShellTabDescriptor | null;
  }
```

Semantics: "the current browser-history entry's persisted identity is stale;
re-stamp it with this exact committed descriptor, replacing in place."

### 2. Adapter implementation (package admin-vue-router)

In `handleNavigation`:

- If `kind === "heal"`: read the current descriptor. If it is already the
  destination's id, no-op. Resolve `toScopedLocation(destination)` and compare
  `router.resolve(location).fullPath` with
  `router.currentRoute.value.fullPath`. On mismatch (payload-bearing route
  like `detail/:reportId`), no-op: return `{ active: currentDescriptor() }`.
  On match, `await navigateToDescriptor(destination, true)` — a `replace`,
  so the stack position and URL are preserved and only the entry's stamped
  identity changes.
- Return `{ active: currentDescriptor() }`.

No other request kind changes. `force: true` (already in `toScopedLocation`)
makes the same-route replace an actual navigation.

### 3. Shell reconciliation (package admin, watch path)

In the navigation watch (history traversal path only — never the
open-completion path):

- Compute the active descriptor.
- If its id is committed → `recordCurrentTab` as today.
- Else find the newest committed tab with the same exact destination (reverse
  `visibleTabs` order, same policy as `requestDestination`).
  - No match → `recordCurrentTab` (existing revive/restore behavior).
  - Match → fire `handleNavigation({ kind: "heal", destination:
    snapshotTab(match), current: active })` asynchronously. Guard re-entry
    with a per-revived-id pending set. On completion, record the healed
    active only if it is still uncommitted (the heal's own replace re-fires
    the watch with the committed id, which records as an update). If the
    heal no-ops (location mismatch), the revived descriptor is recorded as a
    new tab, preserving current behavior for parameterized pages.
- On heal rejection, fall back to recording the revived tab and surface the
  error via the existing `tabError` channel? (Keep it minimal: log via
  `console.error` like `activateTab`/`closeTab` do, and record the revived
  tab.)

Why shell decides and adapter executes: membership (who is closed / which
destination is committed) is shell-owned; history metadata writes are adapter-owned.
The location guard lives in the adapter because only it can resolve locations
(registry + router).

## Why not alternatives

- **Erase the closed entry from history**: the History API cannot remove
  arbitrary entries.
- **Adapter-side substitution in `currentDescriptor()`**: would require the
  adapter to track committed membership, which the runtime contract assigns
  to the shell.
- **`activate` with `replace` flag**: muddies "activate" semantics; a named
  `heal` variant is self-documenting and matches the established "lazily heal
  stale stack positions with replace" pattern from the auth scope guard.

## Scope of change

- `packages/admin/src/components/admin-shell.tsx` — request union + watch
  reconciliation helper.
- `packages/admin-vue-router/src/navigation.ts` — heal branch.
- Tests: `navigation.test.ts` (adapter), `admin-shell.test.tsx` (shell),
  optionally `create-admin-router.test.ts`.
- Docs: `.trellis/spec/admin/frontend/runtime-contract.md` documents the
  request union — extend the heal variant sentence.

## Risks

- Re-entrancy: the heal's replace re-fires the watch; the committed-id check
  makes the second pass a plain update. Per-id pending set prevents duplicate
  concurrent heals for the same revive.
- The scope guard passes the heal's replace (current entry already has the
  current scope; stale-scope entries are replaced by the guard before the
  watch runs).
- Restore-after-refresh of a healed entry shows the committed tab's id —
  consistent, since the entry now carries that id.

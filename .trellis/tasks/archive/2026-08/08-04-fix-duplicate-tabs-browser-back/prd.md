# Fix duplicate tabs on browser Back after close+reopen

## Goal

Stop the AdminShell tab bar from showing duplicate page instances for one
destination when the user closes a tab, re-opens the same destination, and
then traverses back to the closed tab's browser-history entry.

## Background / Root cause

Reproduced in the demo (Chrome, `localhost:5199`):

1. Open Internationalization, Reports, Settings; close Settings then Reports.
2. Switch locale (observed by the reporter; not a trigger — reproduced without it).
3. Re-open Settings — a fresh page-instance id (`crypto.randomUUID()`).
4. Browser Back three times → two Settings tabs: the re-opened one plus the
   old one revived from its still-stamped history entry.

Mechanism:

- Closing a tab never removes its browser-history entry; `close` pushes a
  fallback entry and the closed entry stays stamped with the old tab id.
- Re-opening the same destination allocates a new page-instance id.
- Back lands on the old entry; the adapter restores the old persisted
  descriptor, and `AdminShell`'s navigation watch calls `recordCurrentTab`,
  which keys tabs by immutable `id` and therefore adds the revived id as a
  *new* tab.
- The shell's own menu-driven navigation already dedupes by exact destination
  ("activates the newest matching tab" — same `navKey` and an equal `payload`
  record, compared with `es-toolkit` `isEqual`), so revived tabs violate the
  shell's own dedupe policy.

The i18n integration did not change adapter or shell history logic (verified
against the pre-i18n sources); the locale switch merely re-renders labels and
made the duplicate visible.

## Requirements

- The `AdminShellNavigationRequest` union gains a `heal` variant: "rewrite
  the current history entry's persisted identity to an exact committed tab,
  replacing in place".
- The adapter executes `heal` only when the committed tab's location resolves
  to the same URL as the current route (same `fullPath`); otherwise it no-ops
  so a payload-bearing destination is never silently rewritten onto a
  different URL.
- The shell, when a history-traversal revive presents an id that is not
  committed but whose exact destination (same `navKey` and equal `payload`)
 matches a committed tab, requests `heal` with
  the newest committed match (same reverse visible-order policy as
  `requestDestination`) instead of adding the revived tab.
- No duplicate destination state is persisted: `heal` reuses the committed
  tab's descriptor; metadata still contains only `id`, `label`, optional
  `closable`, and `scopeId`.
- Keep the change within the existing ownership boundaries: shell owns
  membership (it decides when to heal); adapter owns history metadata (it
  executes the replace and the location guard); codec validation is unchanged.

## Acceptance Criteria

- [ ] Adapter regression test: open A, open B, close B, open B again (new
      id), `router.back()` to B's old entry, `handleNavigation({ kind:
      "heal", destination: newB })` rewrites the entry to newB's metadata and
      `navigation.active.id` becomes newB's id.
- [ ] Adapter regression test: `heal` with a destination whose location does
      not match the current route no-ops (active descriptor unchanged, no
      history-state rewrite).
- [ ] Shell regression test: a revived descriptor whose destination equals a
      committed tab is healed (no new tab committed; the committed tab stays
      the only instance of that destination).
- [ ] Shell regression test: a revived descriptor with the same navKey but a
      different payload is recorded as its own page instance (never healed).
- [ ] Shell regression test: a revived descriptor with no committed
      destination match is still recorded as a new tab (existing restore
      behavior).
- [ ] Existing navigation, shell, and create-admin-router tests pass; demo
      typecheck/build pass.
- [ ] Browser verification: close+reopen+Back no longer produces duplicate
      tabs, with and without a locale switch.

## Notes

- Do not attempt to erase arbitrary history entries (History API limitation);
  lazy replace of the entry the user landed on is the established pattern
  (auth scope guard).
- The Dashboard fallback-identity contract (unstamped entries) is untouched:
  `heal` only fires for stamped revives whose id is not committed.

# Admin shell page-instance navigation

## Purpose

Record the architecture direction that supersedes the original one-tab-per-route Candidate A assumptions for `simplify-admin-shell-navigation`.

## Current settled direction

- Use a shell-originated page-instance model.
- `AdminShell` owns opened-tab membership, ordering, indexes, pending operation state, close fallback, and shell-generated immutable tab IDs.
- A tab ID is the primary identity of one opened page instance. Multiple tabs may have identical destinations, including identical navigation keys and parameters.
- A router-neutral destination contains a string navigation key and optional host-interpreted parameters. Parameters must be a plain JSON object suitable for history serialization, but they are not implicitly URL query parameters.
- The host does not maintain a duplicate tab registry. Every final navigation request supplies public tab/destination snapshots sufficient for the host to resolve routing.
- Use one host callback with a discriminated request union for open, activate, and close operations; do not use positional boolean flags.
- The optional second `navigate(destination, resolveTabNavigation?)` argument is call-specific. It receives every opened public tab descriptor in visible order and may select any valid tab or force a new instance; it is never retained in `AdminShellDestination` or a tab record.
- Without a resolver, the shell selects the most recently opened tab with the same `navKey`, ignoring parameters; if none exists, it opens a new instance.
- Shell-local fields such as `index`, `activationPending`, and `closePending` never cross the public boundary.
- New tabs are candidates until host navigation resolves. Failed navigation must not commit membership or active state.
- The host persists the complete public `AdminShellTabDescriptor` in browser history state. Back/forward restores the exact active page instance and its destination/presentation snapshot; shell-private fields are never persisted.
- Optional `menuKey` is removed. Menu selection is derived from the navigation key when it matches a menu option; pages without a corresponding menu item have no selected menu item.

## Active assumptions

- All tab-producing navigation is routed through the shell navigation boundary.
- Host-originated redirects must preserve or deliberately replace the tab ID in history state.
- Public tab snapshots contain immutable page-instance identity and destination/presentation data, while internal tab records extend those snapshots with mutable shell state.
- Tab-record identity or exact object ownership replaces session-version checks for tab-owned async operations.

## Implemented integration notes

- Plain Naive UI menu selection supplies scalar `navKey`; the host resolves its route registry and confirms presentation before shell membership commit. In the demo, the optional `@noob-naive-ui/admin-vue-router` registry uses each key as both `navKey` and Vue Router route name. Its bound codecs map destination params into explicit path/query/hash state and reconstruct canonical data from the current URL; omitted codecs silently omit params and decode none. The host's separate tab-presentation policy supplies labels and closability when creating descriptors.
- `useAdminShell()` is a command-only descendant seam: routed pages invoke `navigate(destination, resolveTabNavigation?)` without receiving host-authoritative active descriptor state. Destination-defining inputs are consumed through route props after the adapter URL codec maps them. The composable resolves the nearest shell and throws when no ancestor `AdminShell` exists; the scoped default-slot navigation control remains compatible.
- First-time opens use an uncommitted candidate whose object identity invalidates stale completion across auth or adapter replacement.
- An unstamped direct URL derives a transient host descriptor; shell-originated open, activation, and close-fallback navigations persist complete public descriptors through Vue Router state. Hosts must not mutate browser history behind their router.
- Navigation keys are not tab primary keys; requests therefore carry both immutable page-instance ID and destination-bearing public snapshots.
- Mutable indexes and pending fields remain shell-private, and exact committed tab-record identity replaces version counters.

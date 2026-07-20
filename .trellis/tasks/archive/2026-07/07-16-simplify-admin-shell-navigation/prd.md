# AdminShell page-instance navigation

## Goal

Replace the tab-specific controller and split menu/tab routing paths with one router-neutral page-instance navigation boundary. The shell must support multiple simultaneously opened tabs whose destinations may use the same navigation key and the same or different parameters.

## Background

- `AdminShell` already owns ephemeral open-tab membership, ordering, indexes, close fallback, pending operations, and safe UI feedback.
- The demo owns Vue Router, route definitions, menu construction, and actual navigation.
- A route or navigation key cannot identify an opened tab: two page instances may represent identical destinations.
- Passing only a tab ID to the host is insufficient because the host needs the corresponding destination to navigate without maintaining a duplicate tab registry.
- Native links inside `NTab` are out of scope; Naive UI tab activation remains controlled.
- The previously planned `active.key`/`menuKey` adapter is superseded. `menuKey` crosses the wrong boundary and does not model tabs without menu entries.

## Requirements

1. Model a router-neutral destination as a stable string `navKey` plus optional host-interpreted parameters. Parameters must use `unknown`, not `any`.
2. Give every opened page instance an immutable `id` independent of its destination. Multiple IDs may share identical destinations.
3. Keep mutable shell fields—index and pending flags—private to `AdminShell`; public navigation requests carry immutable destination-bearing tab snapshots.
4. Use one `handleNavigation` callback with a discriminated request union for open, activate, and close. Do not use positional boolean flags.
5. Allow each navigation destination to supply an optional `resolveTabNavigation` callback. It receives every opened public descriptor in visible order and may activate any valid tab or force a new instance.
6. Default unresolved navigation to the most recently opened tab with the same `navKey`, ignoring parameters, and open a new instance only when no such tab exists.
7. Resolve and validate tab policy inside the shell, then send only the final open or activate request to the host.
8. For menu/link navigation that resolves to open, allocate a candidate page instance but do not commit membership or active state until host navigation succeeds.
9. For existing-tab activation and close fallback, send the host complete destination-bearing tab descriptors so it needs no duplicate tab registry.
10. Keep active state host-authoritative. The host persists the page-instance ID in browser history state and reports the confirmed active descriptor from the current route plus history identity.
11. Allow direct URL/bootstrap navigation by allocating an initial page-instance ID when history has none; subsequent back/forward navigation must restore the persisted ID.
12. Derive menu highlighting only when the active destination's `navKey` matches a menu option key. A tab may have no corresponding menu item.
13. Keep `@noob-naive-ui/admin` router-neutral: no Vue Router imports, route objects, history implementation, backend state, persistence, or destination policy.
14. Keep the demo free of duplicate open-tab membership. It may map routes to frontend presentation and translate destinations into Vue Router locations.
15. Replace session-version and pending-version ownership for tab-owned operations with immutable tab-record identity and boolean pending fields. Define separate stale-candidate handling for uncommitted open operations.
16. Perform a clean public-contract cutover with no aliases or compatibility shims.

## Acceptance Criteria

- [ ] Two or more tabs can coexist with the same `navKey`, including identical parameter records, while retaining distinct IDs and independent close/activation behavior.
- [ ] `AdminShell` indexes membership and visible order by page-instance ID, not destination equality.
- [ ] Every host callback request contains enough destination information to navigate without looking up shell state.
- [ ] Open, activate, and close are distinct variants of one `handleNavigation` method; invalid boolean combinations are unrepresentable.
- [ ] Failed open navigation does not add a tab; failed activation does not change the host-authoritative active ID; failed close retains membership.
- [ ] Successful close removes exactly the requested page instance even when another tab has the same destination.
- [ ] Browser back/forward restores the exact active page instance through history state.
- [ ] Direct URL entry produces one confirmed initial page instance without requiring a pre-existing shell tab ID.
- [ ] Each navigation call may supply a tab-resolution callback that receives every opened tab descriptor and can activate any valid tab or force a new instance.
- [ ] Without a resolver, a menu/link request activates the most recently opened tab with the same `navKey`, ignoring parameters, or opens a new instance when no match exists.
- [ ] The shell validates resolver-selected IDs and sends only the resolved open/activate operation to the host.
- [ ] Menu navigation and tab navigation use the same callback boundary; the demo contains no `RouterLink` menu labels.
- [ ] A destination without a matching menu key leaves the sidebar unselected without an explicit `menuKey` field.
- [ ] Public descriptors contain no `index`, `activationPending`, or `closePending` fields.
- [ ] `@noob-naive-ui/admin` imports no Vue Router API and the demo mirrors no shell tab collection.
- [ ] Focused tests cover duplicate destinations, candidate commit/rejection, exact-instance activation/close, history identity, direct bootstrap, and stale async completions.
- [ ] Admin tests/typecheck/build and demo typecheck/build/browser smoke verification pass.

## Out of Scope

- Native anchor semantics for tabs, including middle-click and link context menus.
- External-window and iframe destination policy.
- Backend routes, sessions, RBAC, transport, or persistent tab storage.
- A general router plugin package.
- Visual redesign of the shell menu or tab strip.

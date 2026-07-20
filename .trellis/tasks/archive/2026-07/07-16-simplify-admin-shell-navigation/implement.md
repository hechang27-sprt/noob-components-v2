# Implementation plan: page-instance navigation

## Scope

Replace the route-keyed controller/interim adapter with one router-neutral page-instance navigation boundary across `@noob-naive-ui/admin` and `apps/demo`. Support duplicate destinations, shell-owned instance membership, host-owned routing, and history-state restoration.

## Ordered implementation

1. **Lock behavioral coverage before the contract cutover**
   - Update focused admin tests to express immutable instance IDs, duplicate destinations, and one discriminated callback.
   - Add failing cases for two tabs with identical destinations, rejected candidate opens, exact-instance close, and stale completion ownership.
   - Preserve existing auth branches, tab ordering/reindexing, close fallback, safe errors, and Naive UI accessibility semantics.

2. **Replace the public contract**
   - Add documented `AdminShellDestination`, `AdminShellTabDescriptor`, `AdminShellNavigationRequest`, `AdminShellNavigationResult`, and `AdminShellNavigation` types.
   - Keep mutable `AdminShellTab` fields internal to shell behavior; do not pass index/pending state to the host.
   - Remove `AdminShellTabController`, interim active-navigation types, `menuKey`, and compatibility aliases.
   - Export only the intentional frontend-ready types from `packages/admin/src/index.ts`.

3. **Re-key shell membership by page-instance ID**
   - Store `tabs = reactive(new Map<string, AdminShellTab>())` by `id`.
   - Store visible tab IDs as the sole ordering source.
   - Use immutable IDs and exact record identity for async ownership.
   - Replace pending-version integers and global session-version checks for committed tabs with `activationPending`/`closePending` booleans.
   - Keep current-order close fallback correct under concurrent closes.

4. **Implement the unified navigation state machine**
   - Accept a per-call `resolveTabNavigation` policy on the requested destination.
   - Invoke the resolver with every opened public tab descriptor in visible order; never prefilter the list.
   - Default to the most recently opened tab with the same `navKey`, ignoring parameters; open a new instance when no match exists.
   - Validate custom activation IDs against current shell membership, then send only the resolved `kind: "activate"` or `kind: "open"` request to the host.
   - Menu/link navigation allocates an uncommitted candidate `{ id, nav }` only after resolution and commits the host-returned descriptor only after successful navigation.
   - Existing tab clicks send `kind: "activate"` with complete destination/current snapshots.
   - Close sends `kind: "close"` with closing and fallback snapshots; remove membership only after resolution.
   - Add candidate-specific invalidation for auth/navigation replacement and stale open completions.
   - Keep controlled active selection derived only from `navigation.active.id`.

5. **Derive menu selection without `menuKey`**
   - Keep menu options structurally opaque and unchanged.
   - Send scalar menu keys as open destinations with `navKey`.
   - Highlight `navigation.active.nav.navKey` only when Naive UI has a matching rendered key; unmatched/detail destinations remain unselected.
   - Keep menu and tab operations on the same `handleNavigation` boundary.

6. **Migrate the demo host adapter**
   - Keep plain menu labels and no `RouterLink` labels.
   - Resolve `AdminShellDestination` through the route registry, including parameters.
   - Return confirmed label/closability for open requests.
   - Persist page-instance IDs in Vue Router history state for open, activate, and close fallback navigation.
   - Derive `navigation.active` from the confirmed route plus history ID; allocate a bootstrap ID when direct entry has none.
   - Do not add an application-owned open-tab collection.

7. **Align executable contracts**
   - Update admin and demo runtime specs with page-instance identity, the request union, history-state ownership, duplicate destinations, and no-`menuKey` semantics.
   - Update the TSX/testing guide where it names the prior controller.
   - Keep `docs/admin-shell-page-instance-navigation.md` as the decision handoff and remove any now-resolved open-risk wording.

## Verification

Run in order:

```bash
pnpm --filter @noob-naive-ui/admin test
pnpm --filter @noob-naive-ui/admin typecheck
pnpm --filter @noob-naive-ui/admin build
pnpm --filter demo typecheck
pnpm --filter demo build
```

Browser smoke test with the internal browser tool and `pnpm --filter demo dev`:

1. authenticate into the demo;
2. open two distinct routes and activate existing tabs;
3. open two page instances with the same route using different parameters;
4. open two page instances with identical route and parameters and verify distinct IDs/close behavior;
5. use back/forward and verify exact page-instance restoration;
6. refresh/direct-enter a route with and without existing history identity;
7. close the active tab and verify fallback routing and exact-instance removal;
8. verify unmatched destinations leave the menu unselected;
9. confirm zero duplicate navigation, console warnings, or console errors.

## Review gates

- Public API separates instance ID from destination.
- One discriminated `handleNavigation` callback covers open, activate, and close.
- Host requests contain destination-bearing snapshots and no mutable shell fields.
- Shell membership/order is keyed by instance ID; duplicate destinations work.
- No `menuKey`, route-keyed membership assumption, pending-version integer, or tab-level session-version check remains.
- Host-authoritative active state is restored from route plus browser history identity.
- Admin imports no Vue Router API; demo owns no duplicate tab registry.
- Rejected and stale async operations cannot mutate replacement tab records or sessions.

## Risk and rollback points

- **Contract cutover:** migrate package, tests, demo, and specs together; no interim aliases.
- **Identity migration:** route-key assumptions affect map lookup, ordering, close fallback, rendering keys, and test selectors; verify each by duplicate-destination tests.
- **Candidate handshake:** do not commit membership before host confirmation; rollback the open-state-machine slice as a unit if metadata/result semantics fail.
- **History integration:** route success without persisted instance identity breaks back/forward exactness; verify in a real browser before cleanup.
- **Async simplification:** exact record identity must replace—not merely supplement—obsolete version counters to avoid dual ownership systems.

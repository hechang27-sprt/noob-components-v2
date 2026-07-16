# Simplify AdminShell route-driven navigation

## Goal

Make the demo’s menu highlight, active tab, and opened-tab lifecycle follow one clear host-owned navigation source instead of passing separate projections of `router.currentRoute` through menu and tab-controller paths.

## Background

- `apps/demo/src/App.tsx` maps the active route to `AdminShellTabInput` through `currentTab`, then exposes it through `tabController.current`.
- `AdminShell` uses `tabController.current.key` as the controlled value for both `NMenu` and `NTabs`, and watches the full descriptor to record or refresh shell-local tabs.
- Menu clicks follow a separate path: router-aware `RouterLink` labels navigate directly, while tab clicks call `tabController.activate`.
- `AdminShell` intentionally remains router-neutral; the demo owns Vue Router, final `MenuOption[]`, route metadata, and navigation callbacks.
- `AdminShell` owns ephemeral open-tab membership and ordering; the application must not duplicate that list.
- Seven Awesome Naive UI admin projects were inspected at pinned current branch heads. All use controlled tab activation callbacks rather than nested `RouterLink` labels.
- The stronger upstreams derive selected navigation from confirmed route state, keep visited-tab membership under one owner, exclude new-window external links from local tabs, and keep tabbed iframe content in an ordinary internal route lifecycle.
- Soybean Admin and Naive UI Admin support a route-derived menu-key override for detail routes whose active tab identity differs from the sidebar item that should remain highlighted.
- Decision: `@noob-naive-ui/admin` will implement Candidate A only: a string-keyed, router-neutral controlled navigation adapter. Rich internal/external/iframe destination policy is deferred to the proper starter template.

## Requirements

1. Establish one explicit application-owned source of active navigation identity and presentation metadata.
2. Feed menu highlighting and tab synchronization from that source without independent route-derived projections drifting apart.
3. Preserve router neutrality in `@noob-naive-ui/admin`; do not pass a Vue Router instance or route object into the package.
4. Preserve demo ownership of route definitions, final menu composition, and navigation callbacks.
5. Preserve `AdminShell` ownership of open-tab membership, ordering, close behavior, pending operations, and safe async error handling.
6. Keep the public integration contract minimal; do not introduce a store or abstraction unless it removes an existing responsibility split.
7. Preserve authoritative route updates after successful navigation and browser-driven route changes.
8. Support a menu-highlight override as part of the same active descriptor when menu identity differs from tab identity; do not add a separately synchronized active-menu ref.

## Acceptance Criteria

- [ ] `AdminShellNavigation.active` is the one host-authoritative descriptor used for tab selection/recording and, through `menuKey ?? key`, menu highlighting.
- [ ] Menu selection and tab selection invoke the same async `navigate(key)` callback; the demo no longer embeds `RouterLink` labels.
- [ ] Menu highlight and active tab cannot disagree after direct URL navigation, browser history navigation, menu navigation, or tab activation.
- [ ] Visiting a route still records its tab exactly once, and closing a tab retains current async/navigation semantics.
- [ ] `@noob-naive-ui/admin` imports no Vue Router API and receives no route object or destination-policy model.
- [ ] The demo does not mirror `AdminShell`’s open-tab collection.
- [ ] Focused tests cover `menuKey` fallback/override, shared navigation callbacks, synchronization, and rejected navigation.
- [ ] Admin and demo type-check/build verification remains green.

## Out of Scope

- Backend routes, session state, RBAC, transport, or persistence.
- Moving open-tab membership from `AdminShell` into the demo.
- Changing the visual design of the sidebar or tab bar.
- Native anchor semantics for internal menu/tab items.
- External-window and iframe destination policy; this belongs to the future proper starter template.


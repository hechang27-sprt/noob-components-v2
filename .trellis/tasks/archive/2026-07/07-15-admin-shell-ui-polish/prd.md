# Polish AdminShell controls

## Goal

Make the authenticated `AdminShell` header and open-tab bar feel like a cohesive Naive UI admin frame while preserving its frontend-only, router-neutral contract.

## Confirmed facts

- `AdminShell` renders header controls through `ProLayout`'s `nav-right` slot and uses direct Naive UI primitives in `packages/admin/src/components/admin-shell.tsx`.
- The only authenticated identity presentation input is the optional frontend-ready `authStatus.userLabel`; no avatar URL or backend user/session data crosses the package boundary.
- Logout is the existing starter-owned `authActions.logout` callback.
- Theme, font-size, locale, and sidebar state are owned by the existing shell-preferences store; they must remain the only state mutation path.
- Open tabs remain host-authoritatively selected and locally managed for membership, ordering, close lifecycle, and async error feedback.
- The package has no icon dependency or existing icon primitive. The user explicitly selected Vicons for the new icon controls.

## Requirements

1. Replace the text-labelled header controls with compact Vicons-based controls:
   - a left-aligned sidebar-collapse icon button;
   - an icon-only theme action that shows moon to enter dark mode and sun to exit dark mode;
   - icon-only font-size and language menus;
   - a right-aligned account trigger containing a generic user icon and the supplied `userLabel` fallback.
2. Open font-size, locale, and account dropdowns immediately on hover (`delay={0}`). The theme action toggles `light`/`system` to `dark` and `dark` to explicit `light`. The account menu exposes the existing logout action and replaces the demo's duplicate default-slot sign-out button without adding backend/session behavior.
3. Retain accurate accessible names, disabled locale behavior, preference-store mutations, controlled sidebar collapse state, and keyboard-accessible native Naive controls.
4. Render open tabs with controlled `NTabs type="card"` and direct `NTab` children, without `NTabPane`; preserve every existing tab-controller lifecycle and error contract. Bind `NMenu.value` to the host-authoritative current tab key so tab-driven navigation updates the menu highlight.
5. Add the required Vicons package as a declared admin dependency and externalize it from the library build. Do not add router, backend, session, avatar, or public-contract changes, and do not alter persisted preference shape.
6. In demo serve mode, alias exact admin/UI package roots and stylesheet subpaths to source so `pnpm --filter demo dev` hot-reloads package changes; production builds continue consuming package artifacts.

## Acceptance Criteria

- [x] Authenticated header places the sidebar icon control on the left, settings controls and account trigger on the right, and uses no visible text labels for theme, font-size, or locale controls.
- [x] The theme action shows a Vicons moon icon for light and system preferences and a Vicons sun icon for dark preference, toggles directly without a dropdown, and exposes an action-oriented accessible name.
- [x] Font-size, locale, and account menus open immediately through hover; selecting preference options updates the existing store, and selecting logout calls the supplied callback.
- [x] The account trigger visibly combines a Vicons generic-user icon with the supplied user label or fallback, without requiring backend user/session data.
- [x] Open tabs use controlled `NTabs`/`NTab`, retain activation/close/order/error/pending behavior, and synchronize the `NMenu` highlight after tab-driven navigation.
- [x] The demo removes its duplicate default-slot sign-out button; logout remains reachable only through the authenticated AdminShell account menu.
- [x] Demo serve mode hot-reloads admin TSX and UI CSS source edits without restarting; production build resolution remains artifact-based.
- [x] Focused happy-dom tests observe hover menu interactions, icon/accessibility contracts, logout invocation, menu/tab synchronization, and retained tab lifecycle behavior.
- [x] `@noob-naive-ui/admin` typecheck, test suite, and build pass; the demo is browser-checked for header controls, hover menus, direct theme action, logout, NTabs activation/close, menu synchronization, and responsive behavior.

## Out of scope

- Avatar/photo support, user-profile navigation, backend/session modeling, router ownership, new preferences, or changes to the persisted storage schema.
- New public icon APIs.


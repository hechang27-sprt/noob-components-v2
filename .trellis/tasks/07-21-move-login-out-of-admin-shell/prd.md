# Move login out of AdminShell

## Goal

Make the demo's login page a standalone, public `/login` route. Move frontend authentication presentation state into an admin-package Pinia store so `AdminShell` and `AdminLoginPage` consume internal status, while host callbacks perform real login/logout work. Preserve router-neutral admin core and the existing optional `@noob-naive-ui/admin-vue-router` integration boundary.

## Confirmed current state

- `AdminShell` currently receives `AdminAuthStatus` and `AdminAuthActions`, renders loading/anonymous/authenticated branches, delegates anonymous rendering to `AdminLoginPage`, and invokes `authActions.logout` from its account menu.
- `AdminLoginPage` currently receives the same two props and owns form pending/error feedback.
- The demo currently owns an `App.tsx` auth ref, fake login/logout functions, navigation scope, route composition, and global history-scope guard.
- Domain records are top-level and one `RouterView` is mounted inside `AdminShell`.
- `@noob-naive-ui/admin-vue-router` already owns generic registry, codec, and history-metadata integration. It does not own auth, guards, pages, or route records.
- The child adapter and active-context tasks are archived complete; this task consumes their contracts.

## Requirements

1. Add an admin-package Pinia auth runtime whose state is private to package actions: `loading`, `anonymous` with safe reason, or `authenticated` with frontend presentation identity. Hosts observe status but do not set it.
2. Hosts configure `login(values): Promise<AdminAuthIdentity>` and `logout()` callbacks at the admin auth-runtime boundary. `AdminAuthIdentity` is the narrow presentation shape `{ userLabel?, avatarUrl?, subtitle? }`; it is not a backend session model. A package action invokes the callback, updates status only after success, and preserves/reports failure without exposing backend errors in packaged UI.
3. `AdminLoginPage` reads auth status and invokes the package login action internally; it no longer receives `authStatus` or `authActions` props. It remains independently composable and router-neutral.
4. `AdminShell` reads the same internal auth status for authenticated account presentation and logout. It no longer receives `authStatus` or `authActions` props, and never renders the login page.
5. `AdminShell`'s authenticated layout is mounted only by the protected shell route. `/login` mounts `AdminLoginPage` without `AdminShell`.
6. `@noob-naive-ui/admin` imports no Vue Router API and exports no router records or router instances. `@noob-naive-ui/admin-vue-router` remains the optional reusable Vue Router integration boundary.
7. The demo owns the route tree: public `/login`; a protected shell-layout parent containing `AdminShell` and an inner `RouterView`; current domain records as children without URL or stable route-name changes.
8. The demo root renders providers and outer `RouterView`; its login and shell route components own redirect/navigation composition, not auth-state mutation.
9. The guard redirects anonymous protected navigation to `/login` with `redirectUrl: to.fullPath`, permits `/login`, and preserves valid same-session adapter history traversal.
10. The login route restores only a router-resolved internal non-login protected redirect target. Missing, external, malformed, login-targeting, or public-only values use the default protected route.
11. Authenticated navigation to `/login` redirects to the default protected route. Logout callback success changes package status to anonymous; the host route layer then navigates to `/login` without shell content.
12. Preferences remain in `useAdminShellPreferencesStore`. The new auth store has no storage/persistence, backend session, or router dependency.
13. Remove obsolete prop callers and update public runtime-contract docs/tests in one clean cutover.
14. Move generic protected-history scope repair from the demo into `@noob-naive-ui/admin-vue-router`. The host supplies a router-neutral designated home destination; the adapter ignores routes outside its registry, repairs stale/missing protected history to one scoped home descriptor, and exposes explicit scope entry for valid post-login deep links.

## Resolved API decision

Successful `login(values)` resolves `AdminAuthIdentity` (`userLabel?`, `avatarUrl?`, `subtitle?`). The package converts that presentation-only result into authenticated status. This supports starter templates whose displayed identity differs from the submitted credential without importing session or transport types.

## Acceptance Criteria

- [ ] `/login` renders `AdminLoginPage` without mounting `AdminShell`.
- [ ] Protected domain URLs render the shell layout in the outer view and the matched domain page in its inner view.
- [ ] The public shell/login APIs expose no externally settable `authStatus` prop or caller-owned auth-state mutation path.
- [ ] Login/logout callbacks are invoked by package auth actions; successful login receives `AdminAuthIdentity` and changes internal status, while rejection leaves state safe and produces generic UI feedback.
- [ ] Anonymous protected navigation redirects to encoded `/login`; direct login navigation is not caught by the protected guard.
- [ ] Successful login restores a valid protected target; invalid redirect values fall back to the default protected route.
- [ ] Authenticated `/login` redirects to the default protected route; logout ends at `/login` without shell content.
- [ ] Core remains router-free; adapter contracts, page-instance navigation, history scope, menus, tabs, and preferences work on protected routes.
- [ ] Fake demo auth is configured through host callbacks but stored only in the admin-package auth runtime; no persistence or backend model is introduced.
- [ ] Admin core, adapter, and demo tests/typechecks/builds pass; browser smoke coverage proves redirect, login, logout, history behavior, and no console errors.
- [ ] The demo contains no direct `_noobAdminShell` history parsing or one-shot scope-replacement guard; adapter tests cover current-scope traversal, stale/missing scope repair, public-route bypass, loop prevention, stable home identity, and explicit scope entry.

## Out of Scope

- Backend routes, API clients, session persistence, RBAC, or transport design.
- Deployment-server/BFF route interception.
- Changes to adapter route-registry, codec, descriptor, or history-scope contracts.
- A router abstraction in admin core.
- Login visual redesign unrelated to standalone route composition.
- Moving shell-private tab/navigation state into Pinia.

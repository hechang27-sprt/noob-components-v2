# Move login out of AdminShell

## Goal

Move login out of `AdminShell` so the demo presents login and authenticated application pages as separate host-owned routes. Preserve `@noob-naive-ui/admin` as a router-free, backend-neutral frontend package while retaining reusable login presentation and authenticated shell behavior.

## Background

- `AdminShell` currently accepts `AdminAuthStatus` and `AdminAuthActions`, renders `AdminLoginPage` for anonymous state, and renders authenticated layout/content otherwise.
- `AdminLoginPage` is already public and router-neutral.
- `apps/demo` currently stores fake auth state in `App.tsx`, mounts `AdminShell` around its only `RouterView`, and registers all domain pages as top-level routes.
- The starter owns router construction, backend/session integration, redirects, domain pages, menus, and mapping host route state into the shell's router-neutral page-instance navigation contract.
- The admin package already owns persisted frontend-only presentation preferences through `useAdminShellPreferencesStore`.

## Requirements

1. `AdminShell` renders only authenticated shell layout and slotted application content. It no longer receives auth status/actions, branches on authentication, or renders `AdminLoginPage`.
2. `AdminLoginPage` remains a public, independently composable, router-neutral presentation component.
3. `@noob-naive-ui/admin` imports no Vue Router API and exports no route records, route factories, route installers, or router adapter.
4. The host owns the complete nested route tree:
   - `/login` is a top-level public sibling route;
   - a starter-owned shell-layout parent composes `AdminShell` and an inner `RouterView`;
   - demo domain pages are children of that shell-layout record.
5. `apps/demo` demonstrates the architecture with an outer application `RouterView`, a standalone login route component, and an authenticated shell route component containing the inner `RouterView`.
6. Demo authentication shared by sibling route components moves from an `App.tsx` local ref into a demo-owned Pinia store. It remains fake, in-memory demonstration behavior and must not imply an admin-package session model.
7. Frontend-only presentation state genuinely shared between independently routed login and shell components belongs in an admin-package Pinia store, following `useAdminShellPreferencesStore`. Existing shell-private tab/navigation operation state and login-private form/feedback state remain component-local because they are not shared.
8. A starter-owned guard redirects unauthenticated domain navigation to `/login` with the original internal target encoded as the `redirectUrl` query parameter.
9. Successful login restores a valid internal `redirectUrl`; absent, external, login-targeting, or otherwise invalid values fall back to the default domain route.
10. Authenticated navigation to `/login` redirects to the default domain route.
11. Frontend guards are navigation/presentation gating only. Backend authorization remains mandatory for protected data and operations; deployment-server/BFF interception is outside this task.
12. Existing shell page-instance navigation, menu, tab, preference, and descendant-context contracts remain intact.
13. Remove obsolete shell-auth code through a clean cutover; leave no compatibility props, aliases, or deprecated branch.

## Acceptance Criteria

- [ ] `/login` renders `AdminLoginPage` without mounting `AdminShell`.
- [ ] Demo domain URLs render the starter-owned shell route into the outer view and the matched domain page into the shell route's inner view.
- [ ] Anonymous navigation to any demo domain URL redirects to `/login?redirectUrl=<encoded internal target>`.
- [ ] Successful login restores a valid requested internal URL and otherwise navigates to the default domain URL.
- [ ] Authenticated navigation to `/login` redirects to the default domain URL.
- [ ] Logout clears demo auth state and navigates to `/login` without rendering authenticated shell content.
- [ ] `AdminShell` exposes no auth props or anonymous/loading rendering branch and imports no router.
- [ ] `AdminLoginPage` remains independently exported and backend/router-neutral.
- [ ] Demo auth uses a demo-owned Pinia store; backend/session state does not enter an admin-package store.
- [ ] Existing admin-package shell behavior remains covered under the authenticated-only contract.
- [ ] Admin package tests, typecheck, and build pass.
- [ ] Demo typecheck and build pass.
- [ ] A running-demo browser smoke test proves anonymous redirect, standalone login, successful redirect restoration, authenticated shell rendering, and logout return to login.

## Out of Scope

- Backend routes, API clients, session payloads, RBAC, or transport design.
- Production authentication persistence for the fake demo.
- Deployment-server/BFF route interception.
- A router abstraction or reusable route-module API in `@noob-naive-ui/admin`.
- Login visual redesign beyond what is necessary to compose it outside the shell.
- Moving shell-private ephemeral tab/navigation state into Pinia without a real cross-route consumer.

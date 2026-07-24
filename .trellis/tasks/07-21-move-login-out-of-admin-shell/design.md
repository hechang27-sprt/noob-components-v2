# Design: routed login with package-owned frontend auth state

## Auth-runtime boundary

`@noob-naive-ui/admin` adds one non-persistent Pinia auth runtime. It owns status transitions and safe frontend presentation identity; hosts supply effects only.

```text
AdminLoginPage click
  → admin auth action.login(values)
  → host login callback (transport/session work, if any)
  → callback resolves authenticated presentation identity
  → admin auth runtime sets authenticated status
  → login route restores validated redirect

AdminShell account-menu click
  → admin auth action.logout()
  → host logout callback
  → callback resolves
  → admin auth runtime sets anonymous { reason: "signed-out" }
  → host route layer navigates to /login
```

A callback rejection does not transition to authenticated/anonymous success state. Package components own pending state and generic feedback; hosts do not pass raw errors into them.

The public setup API configures `login(values): Promise<AdminAuthIdentity>` and `logout()` once for the application's Pinia instance. `AdminAuthIdentity` contains only optional `userLabel`, `avatarUrl`, and `subtitle`; the package creates authenticated status from it. The store exposes status as observed runtime state plus login/logout actions; callers do not receive a setter or direct transition API. The implementation must reject use before configuration and document initialization timing. It remains frontend-only: no persistence, session DTO, tokens, router, or backend import.

## Route tree and ownership

```text
App providers + configureAdminAuth(...)
└─ outer RouterView
   ├─ /login → DemoLoginRoute → AdminLoginPage
   └─ protected shell-layout parent → DemoShellRoute → AdminShell → inner RouterView
      ├─ /dashboard
      ├─ /workspace/reports
      ├─ /workspace/reports/:reportId
      └─ /settings
```

The shell-layout parent has an empty path, preserving child URLs. Registry domain records become its children and retain generated names/codecs. `/login` is outside the registry because it is not an `AdminShellDestination`.

`App.tsx` provides theme/config and the outer view. `DemoLoginRoute` observes status only to perform post-login redirect and renders `AdminLoginPage`. `DemoShellRoute` creates menu/navigation integration and inner view; `AdminShell` reads its own auth runtime for account label/logout. The demo does not own an auth store.

## Guard sequencing

Protected routes carry `meta.requiresAuth`. The guard reads package auth status and first applies:

1. anonymous → protected: redirect to named login with `redirectUrl: to.fullPath`;
2. authenticated → login: redirect default protected route;
3. otherwise: continue.

Only after protected navigation is admitted may the existing history-scope repair run. Login navigation bypasses scope repair; otherwise logout could be replaced by Dashboard. The login route resolves redirect text and accepts only internal matched protected non-login locations. It uses the default protected location otherwise.

The host observes successful logout and replaces to login. This router effect remains host-owned; the package auth action has no router dependency.

## Adapter-owned history-scope lifecycle

`createAdminShellVueRouterNavigation` remains usable without scope repair. When configured with a router-neutral `homeDestination`, it exposes an installer for the generic history-scope guard and an explicit `enterScope(destination)` operation.

The installed guard acts only when `registry.fromRoute(...)` recognizes the target route. Public and unrelated routes, including `/login`, pass through untouched. A current-scope history entry proceeds normally. A stale or missing scope is replaced with one home descriptor cached for the current scope, with loop prevention internal to the adapter. `enterScope(destination)` stamps a valid protected destination for a newly created auth scope so post-login deep-link restoration is not mistaken for stale history.

The host still chooses the home destination, creates/rotates scope IDs, validates login redirects, decides when to enter a new scope, and owns guard installation/removal lifecycle. The adapter gains no auth-state dependency and no knowledge of `/login`.

## Existing adapter and navigation

The existing `demoRouteRegistry` and `createAdminShellVueRouterNavigation` stay unchanged in responsibility. They serve protected registry routes only. The app retains tab presentation, codec definitions, route records, descriptor creation, and navigation-scope policy. `/login` unmounts the shell and therefore clears shell-local tab state through existing cleanup.

## State ownership

- **Admin auth runtime:** loading/anonymous/authenticated presentation state, configured callbacks, safe transition rules.
- **Admin preferences store:** theme, font, locale, sidebar state.
- **Host:** callback effects, router tree, guards, redirect routing, protected routes, domain pages, menus, navigation adapter, history scope.
- **Admin shell:** authenticated layout, account control, tabs and navigation operation state.
- **Admin login page:** form fields, local feedback/pending state, package login action invocation.

## Migration and rollback

1. Define/configure the auth runtime and update login/shell public contracts and tests.
2. Move demo fake effects into callbacks supplied during startup; delete its local auth ref/actions.
3. Split routes and nest domain records while preserving adapter contracts.
4. Replace the global scope guard with auth-aware protected-route guard sequencing.
5. Update runtime specs, then execute static and browser checks.

Rollback is a source revert; no persisted state migrates.

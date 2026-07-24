# Implementation plan

> **Resolved contract:** the host login callback resolves `AdminAuthIdentity` (`userLabel?`, `avatarUrl?`, `subtitle?`). Package auth actions alone transition the internal status.

## 1. Create the package auth runtime

- Define `AdminAuthIdentity` and the host callback configuration contract: `login(values): Promise<AdminAuthIdentity>` plus `logout()`.
- Add the non-persistent Pinia auth store/runtime with guarded configuration, observed status, package-owned login/logout actions, and safe success/failure transitions.
- Keep state mutation private to package actions; do not expose a host setter.
- Add unit tests for unconfigured use, login success, login rejection, logout success, logout rejection, pending protection, and safe anonymous reasons.

## 2. Cut over package components

- Remove `authStatus` and `authActions` from `AdminShell` and `AdminLoginPage` props and public usage.
- Make `AdminLoginPage` read package auth status/action; retain its local form and generic feedback behavior.
- Make `AdminShell` read package auth state for account presentation/logout, but always render shell layout when mounted. It must never delegate login or render a loading/anonymous shell branch.
- Preserve router-neutral navigation, tabs, menu, preferences, slot API, and `useAdminShell()` behavior.
- Update `packages/admin` public exports and affected runtime-contract/spec documentation.

Validation:

```sh
pnpm --filter @noob-naive-ui/admin test
pnpm --filter @noob-naive-ui/admin typecheck
pnpm --filter @noob-naive-ui/admin build
```

## 3. Restructure demo route composition

- Configure admin auth callbacks against the demo Pinia instance during startup. The fake callbacks validate trimmed credentials and resolve the approved presentation identity; they do not mutate auth status.
- Reduce `App.tsx` to providers/theme bridge plus outer `RouterView`.
- Add `DemoLoginRoute` that renders `AdminLoginPage` and routes after observed successful status.
- Add `DemoShellRoute` that renders `AdminShell`, the existing navigation adapter/menu, and inner `RouterView`.
- Nest registry domain records beneath the protected shell-layout route without changing URLs, names, codecs, or tab presentation. Add public `/login` outside the registry.

## 4. Move generic history-scope repair into the adapter

- Extend `createAdminShellVueRouterNavigation` with optional designated `homeDestination` configuration, a scope-guard installer, and explicit `enterScope(destination)` support.
- Recognize protected/admin routes through the bound registry; bypass `/login` and all unrelated routes without requiring auth metadata inside the adapter.
- Internalize namespace parsing, current-scope comparison, one-shot loop prevention, and one stable home descriptor per scope.
- Add adapter tests for current scope, stale/missing scope, public-route bypass, stable home identity, post-login scoped deep-link entry, and cleanup.
- Remove direct `_noobAdminShell` parsing and the local replacement guard from the demo.

## 5. Add ordered router auth guards


- Mark protected records with `meta.requiresAuth`.
- Read package auth status in the host guard. Redirect anonymous protected targets to login and authenticated login targets to the default protected route.
- Install the adapter scope guard after auth gating; because it recognizes only registry routes, login and unrelated routes bypass repair.
- Validate login redirect restoration with `router.resolve`, accepting only internal matched protected non-login locations.
- Observe successful logout and replace to `/login`; keep this router effect outside the package action.

## 6. Verify

Add observable tests for package callback/status transitions and demo route behavior:

- standalone `/login` without an `AdminShell` mount;
- login success/rejection and logout success/rejection;
- anonymous deep-link redirect, valid restoration, invalid/external/login/public fallback, authenticated-login redirect;
- same-session Back/Forward and stale protected history-scope replacement;
- unchanged shell page-instance navigation on protected routes.

Run:

```sh
pnpm --filter @noob-naive-ui/admin test
pnpm --filter @noob-naive-ui/admin typecheck
pnpm --filter @noob-naive-ui/admin build
pnpm --filter @noob-naive-ui/admin-vue-router test
pnpm --filter @noob-naive-ui/admin-vue-router typecheck
pnpm --filter @noob-naive-ui/admin-vue-router build
pnpm --filter demo typecheck
pnpm --filter demo build
```

Browser smoke: anonymous protected deep link; standalone login; success restoration; invalid redirect fallback; authenticated `/login`; logout to login; current-session Back/Forward; prior-scope history repair; preference continuity; zero console errors and no application API request.

## Review gates

- Auth transition ownership is package-internal; host callbacks provide effects only.
- Admin core has no Vue Router import/dependency; the existing adapter owns no auth/guard policy.
- Core renders no login page and no auth-status prop branch.
- Login and logout failures retain safe state and generic presentation feedback.
- Route guards neither loop on login nor repair valid current-session history.
- No package auth state is persisted or backend-shaped.

## Rollback

Revert core auth-runtime/component changes and the demo route split together. No data migration exists.

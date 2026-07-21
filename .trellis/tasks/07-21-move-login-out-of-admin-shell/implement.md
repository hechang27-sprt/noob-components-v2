# Implementation plan

## 1. Change the admin shell contract

- Update admin-shell tests to assert the authenticated-only contract and remove anonymous/loading delegation expectations.
- Remove `authStatus` and `authActions` from `AdminShellProps` and delete auth branching/login delegation from `AdminShell`.
- Preserve shell navigation, tabs, menu, preferences, logout interaction contract, default slot, and descendant context.
- Update public-contract documentation/spec references affected by the clean cutover.

Validation:

```sh
pnpm --filter @noob-naive-ui/admin test
pnpm --filter @noob-naive-ui/admin typecheck
pnpm --filter @noob-naive-ui/admin build
```

## 2. Introduce demo-owned authentication state

- Add a setup-style demo Pinia store for fake in-memory auth status and login/logout transitions.
- Keep backend/session semantics out of `@noob-naive-ui/admin`.
- Retain `AdminLoginPage`'s existing frontend callback contract unless implementation evidence requires a minimal contract correction.

## 3. Split demo route-level composition

- Reduce the root app component to shared providers plus the outer `RouterView`.
- Add a starter-owned login route component that composes `AdminLoginPage` with the demo auth store.
- Add a starter-owned shell route component that composes `AdminShell`, the existing menu/navigation adapter, and an inner `RouterView`.
- Convert demo domain records into children of the shell-layout record while preserving public URLs and route names.

## 4. Add host-owned route gating

- Mark or otherwise identify the shell route branch as authentication-gated.
- Redirect anonymous domain navigation to `/login` with `redirectUrl: to.fullPath`.
- Validate `redirectUrl` through the router as a known internal non-login domain destination before restoring it.
- Fall back to the default domain route for missing/invalid/external/login targets.
- Redirect authenticated login-route navigation to the default domain route.
- Make logout replace the current location with `/login` after clearing demo auth state.

## 5. Verify end to end

Run static checks:

```sh
pnpm --filter @noob-naive-ui/admin test
pnpm --filter @noob-naive-ui/admin typecheck
pnpm --filter @noob-naive-ui/admin build
pnpm --filter demo typecheck
pnpm --filter demo build
```

Run the demo and verify in Chromium:

1. open a domain deep link while anonymous;
2. observe `/login` plus encoded `redirectUrl` and confirm no shell is mounted;
3. log in and observe restoration of the requested domain URL inside `AdminShell`;
4. navigate directly to `/login` while authenticated and observe default-domain redirection;
5. log out and observe `/login` without shell content;
6. verify theme/font presentation remains coherent across login and shell routes.

## Review gates

- No Vue Router import or route record appears in the admin package.
- No obsolete shell auth prop, branch, shim, or caller remains.
- Redirect validation cannot navigate to an external URL or loop back to login.
- Demo auth state is host-owned; package preferences remain package-owned.
- Existing page-instance navigation and history-state behavior remains intact.

## Rollback points

The change has no data migration. If route composition fails, revert the shell contract and demo route split together; reverting only one side leaves incompatible callers.

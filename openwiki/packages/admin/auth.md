---
type: concept
title: Admin Authentication — Auth Store and Login Page
description: The admin package's frontend-only authentication state machine, host-effect configuration, restoration readiness, and the AdminLoginPage presentation that renders it.
tags: [admin, auth, pinia, login]
---

# Admin Authentication — Auth Store and Login Page

Authentication is a **frontend determination only**: `AdminAuthStatus` is
presentation and routing state, never proof of a host session or possession of a
credential. The host owns credentials, sessions, persistence, and backend effects;
the package store owns state transitions and readiness.

## Status model (`runtime-contract.ts`)

```ts
type AdminAuthStatus =
  | { kind: "loading" }
  | { kind: "anonymous"; reason?: "signed-out" | "expired" | "forbidden" | "unknown" }
  | { kind: "authenticated"; userLabel?: string; avatarUrl?: string; subtitle?: string };
```

- `AdminAuthIdentity` is the presentation identity returned by host effects
  (`userLabel`, `avatarUrl`, `subtitle`), each optional.
- `AdminAuthRestoreResult` is `{ kind: "authenticated"; identity }` or
  `{ kind: "anonymous" }`.
- The anonymous `reason` is the classified explanation ("signed-out" from user
  action, "expired"/"forbidden"/"unknown" for host-side outcomes). The
  `AdminLoginPage` maps each reason to a locale message key.

## `useAdminAuthStore` (`stores/auth.ts`)

Setup-style Pinia store with reactive refs: `status`, `isConfigured`,
`loginPending`, `logoutPending`, `loginError`, and closure-held state for the
restore promise.

### `configure(config: AdminAuthStoreConfig)` — one-time host effect wiring

```ts
type AdminAuthStoreConfig = {
  login: (values: AdminLoginValues) => Promise<AdminAuthIdentity>;
  logout: () => Promise<void> | void;
  restore: () => Promise<AdminAuthRestoreResult>;
};
```

- Ignores subsequent calls (configure-once per Pinia instance).
- Enters `loading` **synchronously** and starts restoration **unconditionally**:
  the host's `restore()` runs at startup regardless of cached UI state; only a
  current successful host `login()` or `restore()` result may establish
  authenticated state.
- A thrown `restore()` fails closed: status becomes
  `anonymous` with reason `"unknown"`.

### Readiness — `waitForRestoration()`

- Returns a promise that settles when the current restore settles (a fresh
  promise replaces the previous one on each restore start). Multiple concurrent
  waiters resolve on the same restore.
- Throws when the store has not been configured.
- `admin-vue-router`'s auth guard awaits this before evaluating any protected
  navigation, so protected content is never rendered optimistically
  ([plugin page](../admin-vue-router/plugin.md)).

### `login(values)` / `logout()`

- `login` forwards the complete `AdminLoginValues` (`username`, `password`,
  `remember`) unchanged to the host callback — the host owns credential and
  session persistence policy. On success, status becomes `authenticated` with the
  returned presentation identity; on failure, `loginError` is set to a generic
  sanitized message ("Unable to sign in. Please try again.") and the error is
  rethrown; the UI never leaks transport details. `loginPending` guards
  duplicate concurrent submissions.
- `logout` awaits the host callback then transitions to
  `anonymous` with reason `"signed-out"`; `logoutPending` guards duplicates.

### Downstream effects

- `useAdminShellTabsStore` watches `auth.status.kind` and clears the open-tab
  registry when status becomes `anonymous` (session end), while HMR remounts —
  which never change auth status — keep the registry
  ([shell page](shell.md)).
- `admin-vue-router` subscribes to status transitions for login-scope entry and
  logout routing ([plugin page](../admin-vue-router/plugin.md)).

## `AdminLoginPage` (`components/admin-login-page.tsx`)

- Reads `useAdminAuthStore`, renders three status branches:
  - `loading`: centered card with `aria-busy` and screen-reader status text
    ("Checking your session").
  - `authenticated`: "Already signed in" success result (usually transient —
    the auth guard redirects authenticated users off the login route).
  - `anonymous`: the sign-in form (username/password/remember) plus a
    reason-specific status message when one applies.
- Local form state (`username`, `password`, `remember`) with `useId`-derived
  label associations; submitting calls `store.login(values)`; the submit button
  shows the pending state.
- Localized through `createComponentI18n` with `componentId: "AdminLoginPage"`
  (messages in `src/locales/AdminLoginPage.json`), so packaged defaults render
  even without the plugin installed.

## Tests

- `packages/admin/tests/auth-store.test.ts` — configure timing (loading
  synchronous, restore unconditional, subsequent config ignored), restore
  settlement for all waiters, authenticated/anonymous transitions, fail-closed on
  rejection, login/logout transitions, login error handling, Remember-Me
  forwarding, and "protected content not exposed before restore completes".
- `packages/admin/tests/admin-login-page.test.tsx` — submit passes entered
  values through the store action, per-instance label association, non-login
  status rendering, and sanitized error display.

## Design history

`docs/admin-auth-restoration-data-flows.md` and
`docs/admin-auth-restoration-grilling.md` record the settled auth data-flow
analysis. Be aware: those documents also describe **sequenced future work** not
present in the current code (tagged eviction reasons as a structured cause,
"unavailable" status, operation generations, local-first logout, host-invoked
cross-tab invalidation). The source in `stores/auth.ts` is authoritative for what
exists today.

## Related

- [Admin overview](overview.md)
- [admin-vue-router plugin](../admin-vue-router/plugin.md) — auth guard and
  transition routing
- [Shell page-instance state machine](shell.md) — tab registry clears on
  anonymous status

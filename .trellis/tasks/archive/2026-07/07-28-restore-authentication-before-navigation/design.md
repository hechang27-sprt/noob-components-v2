# Design: Restore authentication before protected navigation

## Boundaries

- `@noob-naive-ui/admin` owns the public restore-result contract, configure-time state transition, and one readiness handle for the active startup restoration.
- The host owns the restore effect and all credential/session authority. It returns only frontend-ready Authentication presentation data or ordinary anonymity.
- `@noob-naive-ui/admin-vue-router` consumes public status/readiness, waits in its global auth guard, and reuses existing login redirect validation.
- The demo acts as the backend-free host and selects a deterministic fake startup outcome.

## Public contracts

Add a tagged restore result rather than using `AdminAuthIdentity | null`:

- authenticated: `{ kind: "authenticated"; identity: AdminAuthIdentity }`
- anonymous: `{ kind: "anonymous" }`

Extend `AdminAuthStoreConfig` with `restore: () => Promise<AdminAuthRestoreResult>`.

Expose readiness through a store action such as `waitForRestoration(): Promise<void>`. The action is narrower and safer than exposing the host callback or a mutable promise ref. It resolves immediately when no restoration is pending and resolves after the configured startup attempt settles. The exact internal deferred representation is private.

This ticket does not add persistence namespace/storage configuration, unavailable state, retry, cause-aware logout, or cross-tab transport. Later child tickets may deepen the restore result and readiness lifecycle without changing the foundational rule that host restoration is authoritative.

## Store data flow

1. The first `configure(config)` stores host callbacks and marks configuration complete.
2. Before yielding, it sets public status to `{ kind: "loading" }`, creates the current readiness attempt, and invokes `config.restore()` unconditionally.
3. An authenticated result copies the fresh identity into public authenticated status.
4. An anonymous result transitions to the ordinary anonymous representation used by the login page without eviction messaging.
5. A `finally` path settles readiness regardless of restore outcome so router waiters cannot hang.
6. Restore rejection must not fabricate authentication. Until ticket 03 introduces `unavailable`, it settles into the existing fail-closed anonymous/unknown behavior while preserving the rejection from becoming an unhandled promise.

Configuration remains synchronous to preserve current host setup ergonomics. Startup restoration runs asynchronously and is observed through status/readiness.

## Router flow

The existing global auth guard becomes a reevaluation loop:

1. Read current public auth status.
2. If `loading`, await `waitForRestoration()` and read status again.
3. If authenticated, admit the requested protected destination unchanged.
4. If anonymous, reuse the existing login redirect location and validated redirect query.
5. Login/public route handling retains existing loop prevention.

The guard must await before returning navigation success; this prevents route resolution and protected component creation during loading. It must not watch Vue refs indefinitely or create a waiter disconnected from the store attempt.

## Demo behavior

The demo restore effect remains frontend-only. A deterministic host-owned startup selector (for example, a documented query parameter or local demo toggle already compatible with current startup assembly) returns either a demo identity or ordinary anonymous. It does not model cookies, tokens, backend payloads, or persistence introduced by later tickets.

## Compatibility and sequencing

This is a clean contract cutover: every `auth.configure(...)` caller, test helper, and demo setup supplies `restore`. The new required callback intentionally makes omitted host restoration a type error.

Later child tickets build on this foundation:

- ticket 02 adds validated presentation-cache inputs but must keep restoration unconditional;
- ticket 03 replaces temporary rejection fallback with explicit unavailable/retry behavior;
- ticket 04 generalizes operation ownership and anonymous causes;
- ticket 05 adds passive cross-tab invalidation.

## Risks and controls

- **Guard deadlock:** settle readiness in `finally`; router tests use controlled deferred restoration and assert navigation completion.
- **Optimistic admission:** guard returns no success while status is loading; integration tests assert the protected route remains unresolved before the deferred restore settles.
- **Unhandled restore rejection:** configuration owns the asynchronous chain and handles rejection while settling readiness.
- **Accidental backend coupling:** restore types contain only tagged outcome plus `AdminAuthIdentity`; public export review and type-check enforce the boundary.
- **Future-ticket conflict:** keep this ticket's state machine minimal and avoid persistence, retry, and generalized race machinery.

## Rollback

Rollback is coherent across runtime contract, auth store, router guard, demo configuration, and tests. No persisted data or migration is introduced by this ticket.

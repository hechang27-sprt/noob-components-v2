# Design: Admin Authentication Restoration

## Boundaries

- The Admin package owns Authentication state, transition ordering, restoration readiness, and exposes a local-only invalidation action.
- The router runtime owns guard waiting, login-route recovery navigation, validated redirect restoration, and auth-transition routing.
- The host owns credential/session authority, all persistence, cross-tab detection and delivery, and implements login, restore, and logout effects.
- Components render exhaustive public Authentication state without transport or backend knowledge.

## Public contracts

- Replace the flat anonymous reason with a tagged Anonymous cause: unauthenticated, user-requested, or evicted with expired/forbidden/unknown reason.
- Add unavailable Authentication state.
- Add a tagged restore result: authenticated with fresh presentation identity or anonymous with an Anonymous cause.
- Extend host configuration with `restore` and cause-aware `logout`.
- Expose a local-only idempotent invalidation action that accepts an Anonymous cause, advances the operation generation, and transitions to anonymous state without invoking host cleanup or broadcasting.
- Require the public logout action to receive a cause.
- Expose retry restoration and current readiness to router integration without exposing callbacks or mutable transition internals.

## Runtime model
Configuration installs host effects once, enters loading, and starts restoration unconditionally. The host owns all credential/session persistence; the Admin package stores no presentation identity cache and owns no browser storage keys, schemas, adapters, or event transport.

Each login, restore, retry, logout, direct eviction, or host-invoked local invalidation starts a new operation generation. Async results commit only if their captured generation is current. Logout and local invalidation advance first, guaranteeing that stale async completions cannot re-authenticate.

One internal anonymous transition advances ownership, clears local state, records the cause, and sets anonymous state. Initiating logout additionally invokes host cleanup. Host-invoked local invalidation invokes neither host cleanup nor broadcast. Authoritative anonymous restoration may use the same transition without host cleanup.

A thrown restore error becomes unavailable without inventing an authentication result. Retry starts a new restore generation. An explicit anonymous restore result resets local state.

The host owns all credential/session persistence and cross-tab detection and delivery. The Admin package stores no presentation identity cache and owns no browser storage keys, schemas, adapters, or event transport. Successful host login or restoration is the sole path that may establish authenticated state; logout, authoritative anonymous restoration, and host-invoked local invalidation may only reduce access.

When the host detects cross-tab logout or eviction, it invokes the Admin local invalidation action with a tagged anonymous cause. This action advances the operation generation, sets the anonymous cause locally, and transitions to anonymous state without invoking host cleanup or broadcasting.

The host may implement persistence and cross-tab delivery through any mechanism appropriate to its credential model (HttpOnly cookies, bearer tokens, SDK sessions, BroadcastChannel, server-sent events, etc.). Admin requires no knowledge of the host's persistence or transport mechanism.

## Router flow

Guards observing loading await readiness for the current restoration generation, then reevaluate the destination. Protected anonymous or unavailable state routes to login through existing validated redirect handling. The login route renders recovery controls for unavailable. Successful retry triggers existing authenticated transition routing to a validated redirect or home fallback.

Readiness replacement must settle or redirect every waiter when a newer generation invalidates the operation; no promise may remain abandoned.

## UI behavior

Ordinary unauthenticated state renders credential entry. Unavailable renders generic restoration failure with Retry and Sign out. Eviction messaging remains generic and safe. Raw restore/logout errors are not rendered.

## Compatibility

This is a clean public-contract cutover. Package components, router runtime, demo host, tests, and exports migrate together. No parameterless logout overload, alias, or deprecated flat-reason status remains.

## Verification shape

The public auth store is the primary seam. Router integration is the secondary seam only for navigation behavior. Component tests cover rendered state and accessibility. Full package type-check/test/build and demo build verify assembly.

## Rollback

The change is contained to frontend runtime contracts, auth state, router integration, components, demo wiring, tests, and docs. Rollback restores the prior non-persistent contract as one coherent change; no host-owned or host-managed records are affected by the Admin package rollback.

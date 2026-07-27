# Design: Admin Authentication Restoration

## Boundaries

- The Admin package owns Authentication state, presentation identity persistence, transition ordering, restoration readiness, and cross-tab invalidation handling.
- The router runtime owns guard waiting, login-route recovery navigation, validated redirect restoration, and auth-transition routing.
- The host owns credential/session authority and implements login, restore, and logout effects.
- Components render exhaustive public Authentication state without transport or backend knowledge.

## Public contracts

- Replace the flat anonymous reason with a tagged Anonymous cause: unauthenticated, user-requested, or evicted with expired/forbidden/unknown reason.
- Add unavailable Authentication state.
- Add a tagged restore result: authenticated with fresh presentation identity or anonymous with an Anonymous cause.
- Extend host configuration with `restore`, cause-aware `logout`, and a required persistence namespace.
- Require the public logout action to receive a cause.
- Expose retry restoration and current readiness to router integration without exposing callbacks or mutable transition internals.

## Runtime model

Configuration installs host effects and storage transport once, loads only validated presentation cache metadata, enters loading, and starts restoration unconditionally. Cached identity remains non-authoritative.

Each login, restore, retry, logout, direct eviction, or passive invalidation starts a new operation generation. Async results commit only if their captured generation is current. Logout and passive invalidation advance first, guaranteeing that stale async completions cannot re-authenticate.

One internal anonymous transition advances ownership, clears both persistence tiers, records the cause, and sets anonymous state. Initiating logout additionally broadcasts and invokes host cleanup. Passive events invoke neither broadcast nor host cleanup. Authoritative anonymous restoration may use the same transition without host cleanup.

A thrown restore error preserves valid cached identity but sets unavailable. Retry starts a new restore generation. An explicit anonymous restore result clears identity.

## Persistence model

The host namespace derives two versioned LocalStorage keys: durable identity and auth event. The same identity key is used independently in SessionStorage for tab-scoped identity.

Remembered login writes LocalStorage and removes SessionStorage identity. Non-remembered login writes SessionStorage and removes LocalStorage identity. Successful restore updates the detected existing tier or defaults to SessionStorage.

A dedicated runtime helper owns Zod schemas, JSON parsing, version checks, safe storage access, record removal, and injectable adapters. Malformed records are removed or ignored and never enter store state. Throwing/blocked storage degrades to in-memory state and host restoration.

An auth event contains a unique ID, event kind, and Anonymous cause. Storage listeners accept only the configured LocalStorage area/key and valid schema. Passive tabs deduplicate event IDs, clear both identity tiers, invalidate operations, and become anonymous. Identity writes never authenticate another tab.

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

The change is contained to frontend runtime contracts, storage helpers, auth state, router integration, components, demo wiring, tests, and docs. Rollback restores the prior non-persistent contract as one coherent change; persisted versioned records are harmless unknown keys to older builds.

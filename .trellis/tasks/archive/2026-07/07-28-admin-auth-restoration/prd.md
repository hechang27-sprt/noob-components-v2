# Persist and restore Admin authentication state

## Problem Statement

An authenticated Admin user loses Authentication state when refreshing the browser because the Admin auth runtime is entirely in memory. The current runtime cannot restore Authentication state from a host-owned session, distinguish ordinary anonymity from user-requested logout or eviction, recover honestly when restoration cannot determine session validity, or coordinate logout across open tabs.

Hosts need refresh-safe behavior without moving backend sessions, credentials, transport DTOs, or authorization policy into the shared Admin package. Host-owned session persistence must achieve this without the Admin package owning browser storage or credential material. User-requested logout and host-driven eviction must take effect locally even when host cleanup is slow or fails, and no stale asynchronous completion may re-authenticate an evicted user.

## Solution

Extend the package-owned Authentication state machine with host-owned restoration, host-owned credential/session persistence, explicit anonymous causes, recoverable restoration failure, latest-operation ownership, and a local-only idempotent invalidation transition for host-originated eviction signals.

On configuration, the Admin auth runtime enters loading and invokes the host restore effect unconditionally. The host determines authentication from its own credential source—such as an HttpOnly cookie session, bearer token, authentication SDK, in-memory state, or preloaded identity—and returns either fresh Authentication presentation identity or an explicit anonymous cause. Protected routing waits for restoration and never trusts cached identity or renders authenticated content optimistically.

The host owns all credential/session persistence and cross-tab detection/delivery. The Admin package stores no presentation identity cache and owns no browser storage keys, schemas, adapters, or event transport. Only successful host login or restoration may establish authenticated state. User logout and eviction transition locally before host cleanup. When the host detects cross-tab logout or eviction, it invokes the Admin local invalidation action with a tagged anonymous cause. Local invalidation advances the operation generation and sets the anonymous cause without invoking host cleanup or broadcasting.

## User Stories

1. As an authenticated Admin user, I want refreshing the page to restore my Authentication state, so that I can continue working without signing in again unnecessarily.
2. As an authenticated Admin user, I want protected content to remain hidden until restoration succeeds, so that an expired session does not flash authenticated UI.
3. As a user with a valid HttpOnly-cookie session, I want restoration to work even when no presentation identity is cached, so that browser storage is not mistaken for session authority.
4. As a user with a host-owned bearer token, I want the host to validate or refresh that token during restoration, so that the Admin package never owns credential policy.
5. As a user authenticated through an external SDK, I want routing to wait for SDK initialization, so that startup does not race the SDK's authoritative state.
6. As a host application developer, I want to provide one restore effect that returns frontend-ready state, so that cookies, tokens, SDKs, and preloaded sessions share one package contract.
7. As a host application developer, I want the Admin package to remain unaware of backend routes and response shapes, so that shared UI is not coupled to my backend.
8. As a security-conscious host, I want the Admin package to store no presentation identity cache, so that modifying browser storage cannot grant or influence access.
9. As a user who selects Remember Me, I want the host login effect to interpret the remember flag according to its own session lifetime policy, so that remembered sessions persist beyond browser restart without Admin owning browser storage.
10. As a first-time visitor without a session, I want to reach ordinary login without an alarming eviction message, so that normal anonymity is represented accurately.
11. As a user who explicitly signs out, I want the anonymous state to record a user-requested cause, so that routing and UI can distinguish my action from eviction.
12. As a user whose session expires, I want the anonymous state to record expiration, so that the login experience can explain why reauthentication is required.
13. As a user removed from the Admin context, I want the anonymous state to record forbidden eviction, so that access is closed even if my broader host session remains valid.
14. As a host encountering an unclassified authentication failure, I want to evict with an unknown reason, so that access fails closed without leaking raw errors.
15. As a host application developer, I want logout to require an explicit tagged cause, so that forced eviction is not accidentally classified as voluntary sign-out.
16. As a user signing out, I want local Authentication state cleared before host cleanup completes, so that a slow logout request cannot leave protected UI active.
17. As a user signing out during a host outage, I want to remain locally signed out even if host cleanup rejects, so that cleanup failure cannot restore access.
18. As a host application developer, I want logout rejection observable after local eviction, so that cleanup failures can be reported or instrumented.
19. As a user with a pending restore, I want a newer logout to win, so that a stale restore completion cannot re-authenticate me.
20. As a user with a pending login, I want a newer eviction to win, so that a stale login completion cannot undo forced logout.
21. As a user retrying restoration, I want only the latest attempt to commit state, so that overlapping async operations cannot reorder Authentication state.
22. As a user whose restoration request times out, I want an explicit unavailable state instead of being misclassified as anonymous, so that uncertainty is represented honestly.
23. As a user in the unavailable state, I want Retry and Sign out actions, so that I can recover or deliberately exit.
24. As a user retrying restoration successfully, I want to return to my validated original destination, so that a transient outage does not discard navigation intent.
25. As a user whose restore result is authoritatively anonymous, I want local state reset, so that confirmed invalid authentication is not retained.
26. As a host application developer, I want cross-tab logout or eviction detection to invoke the Admin local invalidation action with a tagged anonymous cause, so that stale tabs close authenticated access without the Admin package owning event transport.
27. As a host application developer, I want the Admin package to expose a local-only idempotent invalidation action that advances the operation generation and sets the tagged anonymous cause, so that the host can propagate eviction signals without the package owning host cleanup or broadcast.
28. As a host application developer, I want the Admin local invalidation action not to invoke the host logout callback or broadcast, so that one logout does not multiply revocation requests or SDK side effects and the host controls delivery.
29. As a router-runtime consumer, I want guards to await current auth readiness while loading, so that initial navigation neither redirects prematurely nor exposes protected routes.
30. As a router-runtime consumer, I want unavailable restoration routed through the existing validated login redirect flow, so that recovery does not introduce another history model.
31. As a user already authenticated, I want navigation to the login route redirected according to existing home behavior, so that restoration remains compatible with current routing.
32. As an Admin shell user, I want account presentation refreshed from the host restore result, so that renamed users, avatars, and subtitles do not remain stale.
33. As a component consumer, I want loading, unavailable, anonymous, and authenticated branches exposed through one public Authentication state contract, so that UI behavior is exhaustive and type-safe.
34. As a maintainer, I want one internal anonymous transition reused by logout, direct eviction, authoritative anonymous restoration, and host-invoked local invalidation, so that state-clearing invariants are implemented once.
35. As a demo user, I want the backend-free demo to demonstrate restoration and host-owned persistence semantics, so that consumers can understand the host boundary without a real backend.
36. As a library consumer, I want all new public contracts exported intentionally from the package boundary, so that no integration relies on internal module paths.
37. As a library consumer, I want the change to preserve the Admin shell's router-neutral and backend-free architecture, so that authentication does not couple the shell to Vue Router or a backend.
38. As a host application developer, I want the Admin package to own no browser storage keys, schemas, adapters, or event transport, so that storage security policy remains entirely with the host.
39. As a host application developer, I want to detect cross-tab authentication changes through my own mechanism and invoke the Admin local invalidation action with the appropriate cause, so that the package is not coupled to any specific cross-tab protocol.

## Implementation Decisions

- The Admin package owns frontend Authentication state and transition ordering; the host owns credentials, sessions, backend calls, SDK state, authorization policy, persistence, cross-tab detection and delivery, and concrete effects.
- Authentication state gains four explicit variants: loading, unavailable, anonymous with a required tagged cause, and authenticated with presentation identity.
- Anonymous causes distinguish ordinary unauthenticated state, user-requested logout, and eviction. Eviction reasons initially contain only expired, forbidden, and unknown; there is no open parameter bag.
- Host auth configuration gains an unconditional restore effect. It returns a tagged result containing either fresh presentation identity or any valid anonymous cause.
- Configuration immediately begins restoration. The runtime exposes readiness behavior that router guards can await without owning credential validation.
- The host owns all credential/session persistence. The Admin package stores no presentation identity cache and uses no browser storage. Host login and restore effects return fresh identity each time; the host determines whether and how to persist credentials and session state.
- The Admin package exposes an idempotent local-only invalidation action that advances the operation generation, sets the tagged anonymous cause, and transitions to anonymous state without invoking host cleanup or broadcasting. Host cross-tab detection invokes this action.
- Every auth operation captures a monotonically increasing generation. A completion commits only when its generation remains current; newer logout, direct eviction, or host-invoked local invalidation invalidates pending login, restore, and retry completions.
- `retryRestore()` is package-owned and deduplicates concurrent retries. A thrown restore error becomes unavailable without inventing an authentication result; an explicit anonymous result resets local state.
- The login route renders recovery controls instead of credential entry while unavailable. Retry invokes restoration; Sign out performs user-requested logout.
- Router guards await auth readiness while loading. Anonymous and unavailable protected navigation use the existing validated login redirect mechanism; successful restoration or retry uses existing redirect restoration and home fallback.
- Logout requires an explicit anonymous cause, advances the generation, clears local state, and transitions locally before invoking the host callback. Callback rejection remains observable but cannot reverse local eviction.
- The demo remains backend-free and supplies fake host effects that demonstrate the frontend contract rather than simulating backend DTOs.
- Public API changes are clean cutovers: all package consumers, demo integration, components, and router integration migrate together without compatibility aliases.
 
## Testing Decisions

- Tests assert externally observable behavior rather than private refs, generation counters, or source text.
- The primary seam is the public Admin auth store with controlled host callbacks. It covers unconditional restoration, fresh identity replacement, ordinary anonymity, unavailable recovery, retry deduplication, logout ordering and rejection, operation races, and local-only invalidation.
- Local invalidation tests invoke the public action directly. They assert tagged anonymous state, stale-completion suppression, idempotent repeated calls, and zero host logout invocations; they do not simulate a package-owned cross-tab transport.
- Host integration examples may use controlled host adapters to demonstrate cross-tab delivery, but event schemas, deduplication, and transport correctness remain host responsibilities outside Admin's test contract.
- Router integration uses a real Pinia instance and memory history to cover loading waits, authenticated continuation, anonymous redirect, unavailable recovery, validated redirect preservation, and absence of redirect loops.
- Login-page component tests cover loading, unavailable recovery controls, ordinary credential entry, anonymous messaging, authenticated behavior, pending controls, generic safe failures, and accessibility.
- Race tests use deferred host promises and assert only final public status and host callback effects after a newer operation wins.

- Package type-check, complete package tests, build, router-runtime tests, and demo build form the final verification set.
 
## Out of Scope
 
- Storing cookies, bearer tokens, refresh tokens, session IDs, permissions, backend user records, or any other credential/backend state in the Admin package or its browser records.
- Defining backend session endpoints, request/response DTOs, transport clients, retry policy, token refresh policy, CSRF handling, or server logout semantics.
- Adding eviction parameters before a concrete frontend requirement establishes a typed reason-specific contract.
- Synchronizing login or authenticated identity writes across tabs. Other tabs authenticate only through host restoration.
- Replacing host-owned cross-tab detection with package-owned event transport, BroadcastChannel, polling, or service-worker coordination.
- Adding a dedicated recovery route or a host-installed global blocking overlay; unavailable recovery remains on the login route.
- Persisting Admin shell page instances, menus, navigation history, permissions, or business data as part of auth restoration.
- Treating a navigation scope as an authentication session or security boundary.
- Providing packaged backend-aware authentication pages or a complete production starter authentication backend.
- Preserving the old parameterless logout API through aliases or deprecated overloads.
 
## Further Notes
 
- The domain distinguishes Authentication state from host session state. Authentication presentation identity is frontend rendering data, not a credential.
- The host owns all credential/session persistence and cross-tab detection and delivery. The Admin package stores no presentation cache and owns no browser storage keys, schemas, adapters, or event transport.
- Admin exposes a local-only idempotent invalidation action that the host invokes for cross-tab eviction signals. The action never invokes host cleanup or broadcast and never establishes authentication.
- User-visible copy for each anonymous cause and unavailable recovery should remain generic and frontend-safe; raw host errors must not cross into shared UI.
- The exact internal readiness replacement mechanism must ensure a guard never waits forever on an operation invalidated by a newer generation.
- Detailed architecture rationale and sequence diagrams are maintained in the repository's authentication-restoration design notes and data-flow documentation.

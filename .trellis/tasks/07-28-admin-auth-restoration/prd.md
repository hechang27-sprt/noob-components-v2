# Persist and restore Admin authentication state

## Problem Statement

An authenticated Admin user loses Authentication state when refreshing the browser because the Admin auth runtime is entirely in memory. The current runtime cannot restore Authentication state from a host-owned session, distinguish ordinary anonymity from user-requested logout or eviction, recover honestly when restoration cannot determine session validity, or coordinate logout across open tabs.

Hosts need refresh-safe behavior without moving backend sessions, credentials, transport DTOs, or authorization policy into the shared Admin package. A cached Authentication presentation identity must improve continuity without becoming proof of authentication. User-requested logout and host-driven eviction must take effect locally even when host cleanup is slow or fails, and no stale asynchronous completion may re-authenticate an evicted user.

## Solution

Extend the package-owned Authentication state machine with host-owned restoration, versioned browser persistence for Authentication presentation identity, explicit anonymous causes, recoverable restoration failure, latest-operation ownership, and durable cross-tab invalidation.

On configuration, the Admin auth runtime enters loading and invokes the host restore effect unconditionally. The host determines authentication from its own credential source—such as an HttpOnly cookie session, bearer token, authentication SDK, in-memory state, or preloaded identity—and returns either fresh Authentication presentation identity or an explicit anonymous cause. Protected routing waits for restoration and never trusts cached identity or renders authenticated content optimistically.

Successful remembered login stores presentation identity in LocalStorage; non-remembered login and successful cold restoration use SessionStorage. User logout and eviction clear package persistence and transition locally before host cleanup. A versioned LocalStorage invalidation event propagates anonymous causes to other tabs, which reuse the common anonymous transition without invoking host logout or rerunning restoration.

## User Stories

1. As an authenticated Admin user, I want refreshing the page to restore my Authentication state, so that I can continue working without signing in again unnecessarily.
2. As an authenticated Admin user, I want protected content to remain hidden until restoration succeeds, so that an expired session does not flash authenticated UI.
3. As a user with a valid HttpOnly-cookie session, I want restoration to work even when no presentation identity is cached, so that browser storage is not mistaken for session authority.
4. As a user with a host-owned bearer token, I want the host to validate or refresh that token during restoration, so that the Admin package never owns credential policy.
5. As a user authenticated through an external SDK, I want routing to wait for SDK initialization, so that startup does not race the SDK's authoritative state.
6. As a host application developer, I want to provide one restore effect that returns frontend-ready state, so that cookies, tokens, SDKs, and preloaded sessions share one package contract.
7. As a host application developer, I want the Admin package to remain unaware of backend routes and response shapes, so that shared UI is not coupled to my backend.
8. As a security-conscious host, I want cached presentation identity never to establish authentication, so that modifying LocalStorage cannot grant access.
9. As a user who selects Remember Me, I want presentation identity cached durably, so that browser restarts retain restoration continuity.
10. As a user who does not select Remember Me, I want presentation identity scoped to my tab session, so that the package does not silently opt me into durable storage.
11. As a user restored from a valid host session in a fresh tab, I want identity cached in SessionStorage by default, so that refresh works without silently upgrading to Remember Me.
12. As a host application developer, I want to supply a stable persistence namespace, so that multiple Admin applications on one origin do not share identity or events accidentally.
13. As a host application developer, I want persisted records versioned and validated, so that malformed or obsolete browser data cannot enter runtime state.
14. As a user with corrupt browser storage, I want the application to fail closed and continue through host restoration, so that malformed cache data does not authenticate me or crash startup.
15. As a user whose browser blocks storage, I want host restoration and in-memory Authentication state to continue working, so that storage availability is not a prerequisite for authentication.
16. As a first-time visitor without a session, I want to reach ordinary login without an alarming eviction message, so that normal anonymity is represented accurately.
17. As a user who explicitly signs out, I want the anonymous state to record a user-requested cause, so that routing and UI can distinguish my action from eviction.
18. As a user whose session expires, I want the anonymous state to record expiration, so that the login experience can explain why reauthentication is required.
19. As a user removed from the Admin context, I want the anonymous state to record forbidden eviction, so that access is closed even if my broader host session remains valid.
20. As a host encountering an unclassified authentication failure, I want to evict with an unknown reason, so that access fails closed without leaking raw errors.
21. As a host application developer, I want logout to require an explicit tagged cause, so that forced eviction is not accidentally classified as voluntary sign-out.
22. As a user signing out, I want local Authentication state and cached identity cleared before host cleanup completes, so that a slow logout request cannot leave protected UI active.
23. As a user signing out during a host outage, I want to remain locally signed out even if host cleanup rejects, so that cleanup failure cannot restore access.
24. As a host application developer, I want logout rejection observable after local eviction, so that cleanup failures can be reported or instrumented.
25. As a user with a pending restore, I want a newer logout to win, so that a stale restore completion cannot re-authenticate me.
26. As a user with a pending login, I want a newer eviction to win, so that a stale login completion cannot undo forced logout.
27. As a user retrying restoration, I want only the latest attempt to commit state, so that overlapping async operations cannot reorder Authentication state.
28. As a user whose restoration request times out, I want an explicit unavailable state instead of being misclassified as anonymous, so that uncertainty is represented honestly.
29. As a user in the unavailable state, I want Retry and Sign out actions, so that I can recover or deliberately clear cached identity.
30. As a user retrying restoration successfully, I want to return to my validated original destination, so that a transient outage does not discard navigation intent.
31. As a user whose restore result is authoritatively anonymous, I want stale presentation identity cleared, so that confirmed invalid authentication is not retained.
32. As a user with several open tabs, I want logout in one tab to close authenticated access in the others, so that stale tabs do not remain open.
33. As a user with several open tabs, I want the same eviction cause propagated to each tab, so that every tab presents consistent state.
34. As a user with a SessionStorage identity in one tab, I want a durable cross-tab invalidation signal to evict it, so that tab-local identity does not bypass global logout.
35. As a host application developer, I want passive tabs not to repeat the host logout callback, so that one logout does not multiply revocation requests or SDK side effects.
36. As a host application developer, I want passive tabs not to rerun restoration as their eviction mechanism, so that cookie races and still-valid forbidden sessions cannot re-authenticate them.
37. As a host application developer, I want cross-tab event input validated as untrusted data, so that arbitrary storage writes cannot create uncontrolled runtime state.
38. As a host application developer, I want repeated invalidations to have unique event identities, so that every event is observable and duplicate processing can be suppressed.
39. As a host application developer, I want identity persistence and invalidation events separated, so that identity removal is not overloaded as an unreliable event protocol.
40. As a user opening a new tab after an old invalidation event, I want the tab to obtain current state from host restoration, so that an old event record is not treated as present authentication authority.
41. As a router-runtime consumer, I want guards to await current auth readiness while loading, so that initial navigation neither redirects prematurely nor exposes protected routes.
42. As a router-runtime consumer, I want unavailable restoration routed through the existing validated login redirect flow, so that recovery does not introduce another history model.
43. As a user already authenticated, I want navigation to the login route redirected according to existing home behavior, so that restoration remains compatible with current routing.
44. As an Admin shell user, I want account presentation refreshed from the host restore result, so that renamed users, avatars, and subtitles do not remain stale.
45. As a component consumer, I want loading, unavailable, anonymous, and authenticated branches exposed through one public Authentication state contract, so that UI behavior is exhaustive and type-safe.
46. As a maintainer, I want one internal anonymous transition reused by logout, direct eviction, authoritative anonymous restoration, and passive cross-tab invalidation, so that state-clearing invariants are implemented once.
47. As a maintainer, I want cross-tab behavior isolated to transport validation and callback ownership, so that passive eviction is not a second authentication algorithm.
48. As a demo user, I want the backend-free demo to demonstrate restoration and persistence semantics, so that consumers can understand the host boundary without a real backend.
49. As a library consumer, I want all new public contracts exported intentionally from the package boundary, so that no integration relies on internal module paths.
50. As a library consumer, I want the change to preserve the Admin shell's router-neutral and backend-free architecture, so that authentication persistence does not couple the shell to Vue Router or a backend.

## Implementation Decisions

- The Admin package continues to own frontend Authentication state and presentation identity; the host continues to own credentials, sessions, backend calls, SDK state, authorization policy, and concrete effects.
- Authentication state gains four explicit variants: loading, unavailable, anonymous with a required tagged cause, and authenticated with presentation identity.
- Anonymous causes distinguish ordinary unauthenticated state, user-requested logout, and eviction. Eviction reasons initially contain only expired, forbidden, and unknown; there is no open parameter bag.
- Host auth configuration gains an unconditional restore effect. It returns a tagged result containing either fresh presentation identity or any valid anonymous cause.
- Configuration immediately begins restoration. The runtime exposes readiness behavior that router guards can await without owning credential validation.
- A successful login persists identity according to the submitted Remember Me value: LocalStorage when true and SessionStorage otherwise.
- A successful restoration preserves an existing persistence tier. With no existing tier, it uses SessionStorage.
- The host must supply a stable persistence namespace. The package owns distinct, versioned identity and invalidation-event records beneath it.
- Persisted and event values are untrusted. A single runtime boundary validates and normalizes them before the Pinia store sees them; invalid or stale records never establish authentication.
- Browser-storage failures degrade to in-memory operation and host restoration. They fail closed and do not turn cached identity into authority.
- Every auth operation captures a monotonically increasing generation. A completion commits only when its generation remains current; newer logout or eviction invalidates pending login, restore, and retry completions.
- `retryRestore()` is package-owned and deduplicates concurrent retries. A thrown restore error becomes unavailable while preserving cached identity for retry; an explicit anonymous result clears identity.
- The login route renders recovery controls instead of credential entry while unavailable. Retry invokes restoration; Sign out performs user-requested logout.
- Router guards await auth readiness while loading. Anonymous and unavailable protected navigation use the existing validated login redirect mechanism; successful restoration or retry uses existing redirect restoration and home fallback.
- Logout requires an explicit anonymous cause, clears package identity, advances the generation, and transitions locally before invoking the host callback. Callback rejection remains observable but cannot reverse local eviction.
- The initiating tab writes a unique versioned LocalStorage invalidation event containing the anonymous cause. Passive tabs validate and deduplicate the event, advance their generation, clear both durable and tab-local identity, and enter the same internal anonymous transition.
- Passive tabs do not invoke the host logout callback and do not rerun host restoration. The dedicated event is transport; anonymous-state mutation is shared with every other anonymous transition.
- LocalStorage identity writes never authenticate another tab. Every tab performs its own host restoration at startup.
- The demo remains backend-free and supplies fake host effects that demonstrate the frontend contract rather than simulating backend DTOs.
- Public API changes are clean cutovers: all package consumers, demo integration, components, and router integration migrate together without compatibility aliases.

## Testing Decisions

- Tests assert externally observable behavior rather than private refs, helper calls, generation counters, source text, or storage implementation details not present in the contract.
- The primary seam is the public Admin auth store with controlled host callbacks and injectable browser-storage adapters. This seam covers configuration and unconditional restoration, login persistence tiers, fresh identity replacement, ordinary anonymity, explicit eviction, unavailable recovery, retry deduplication, logout ordering and rejection, malformed storage, throwing storage, operation races, event validation, event deduplication, passive-tab behavior, and the rule that storage never authenticates.
- Cross-tab tests use two independent store instances and a controlled storage-event transport. They observe status, persisted records, callback counts, and stale-completion suppression. They do not require real browser windows or backend sessions.
- The secondary seam is router integration with a real Pinia instance and memory history. It covers guards waiting during loading, authenticated continuation, ordinary anonymous redirect, unavailable login recovery, validated redirect preservation, retry success, home fallback, and absence of redirect loops.
- Login-page component tests cover observable loading, unavailable recovery controls, ordinary credential entry, anonymous messaging, authenticated behavior, pending controls, generic safe failures, and accessibility semantics.
- Existing shell-preference persistence tests are prior art for versioned untrusted storage parsing, malformed-record cleanup, injectable storage, and throwing adapters.
- Existing router-factory tests are prior art for real Pinia and memory-history guard behavior, auth-transition routing, validated redirects, and deterministic cleanup.
- Existing login-page tests are prior art for real Vue mounting, accessible status/alert behavior, callback values, pending state, and sanitized errors.
- Race tests use deferred host promises and assert only the final public status, persistence, and callback effects after a newer operation wins.
- Tests include both SessionStorage and LocalStorage identity tiers, mixed tiers across passive tabs, identity-absent invalidation, repeated unique invalidation events, and initiating host-callback failure.
- Package type-check, complete package tests, build, router-runtime tests, and demo build form the final verification set.

## Out of Scope

- Storing cookies, bearer tokens, refresh tokens, session IDs, permissions, backend user records, or any other credential/backend state in the Admin package or its browser records.
- Defining backend session endpoints, request/response DTOs, transport clients, retry policy, token refresh policy, CSRF handling, or server logout semantics.
- Adding eviction parameters before a concrete frontend requirement establishes a typed reason-specific contract.
- Synchronizing login or authenticated identity writes across tabs. Other tabs authenticate only through host restoration.
- Replacing the explicit LocalStorage invalidation event with identity-removal-triggered restoration, BroadcastChannel, polling, or service-worker coordination.
- Adding a dedicated recovery route or a host-installed global blocking overlay; unavailable recovery remains on the login route.
- Persisting Admin shell page instances, menus, navigation history, permissions, or business data as part of auth restoration.
- Treating a navigation scope as an authentication session or security boundary.
- Providing packaged backend-aware authentication pages or a complete production starter authentication backend.
- Preserving the old parameterless logout API through aliases or deprecated overloads.

## Further Notes

- The domain distinguishes Authentication state from host session state. Authentication presentation identity is frontend rendering data, not a credential.
- The design deliberately allows LocalStorage input to reduce access through a validated invalidation event but never to grant access.
- Dedicated cross-tab transport is retained because identity removal carries no cause, may emit no event, misses SessionStorage-only identities, races cookie logout, and can re-authenticate forbidden users whose broader host session remains valid.
- User-visible copy for each anonymous cause and unavailable recovery should remain generic and frontend-safe; raw host errors must not cross into shared UI.
- The exact internal readiness replacement mechanism must ensure a guard never waits forever on an operation invalidated by a newer generation.
- Detailed architecture rationale and sequence diagrams are maintained in the repository's authentication-restoration design notes and data-flow documentation.

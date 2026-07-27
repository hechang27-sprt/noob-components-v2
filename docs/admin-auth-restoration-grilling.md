# Admin Authentication Restoration Grilling Notes

## Purpose

Reconcile refresh-safe Admin authentication presentation with the boundary that the host application owns credentials, backend sessions, and authentication effects.

## Current settled direction

### Authority and startup

- Package-owned browser storage is never authentication authority. It stores only an authentication presentation identity and its persistence tier.
- `auth.configure(...)` starts restoration unconditionally and synchronously moves Authentication state to `loading`.
- The host-owned `restore()` effect determines authentication from its own credential source. This supports HttpOnly cookie sessions, host-owned bearer tokens, external authentication SDKs, in-memory authentication, and server-preloaded identity through one package contract.
- A host restore result is a tagged union: authenticated with fresh presentation identity, or anonymous with an Anonymous cause.
- Protected navigation remains closed until restoration resolves.
- A successful cold restoration with no prior persistence tier caches the fresh presentation identity in SessionStorage.
- Every auth operation captures a monotonically increasing generation; only the latest generation may commit state. Logout advances the generation before local eviction, so stale restore/login completions cannot re-authenticate.
- `AdminRestoreResult` may reuse the full Anonymous cause union, including `user-requested`, rather than restricting host-returned causes.

### Persistence tiers

- A successful login with `remember: true` stores presentation identity in LocalStorage.
- A successful login with `remember: false` or omitted stores presentation identity in SessionStorage.
- `configure` requires a host-supplied stable persistence key to avoid same-origin collisions between applications.
- The package owns the versioned storage schema beneath that host namespace.
- Identity and cross-tab events use separate versioned keys beneath the namespace. Logout removes the identity record and writes a uniquely identified logout event carrying the Anonymous cause.

### Authentication state

Authentication state distinguishes:

- `loading`: host restoration is in progress.
- `unavailable`: restoration failed without an authoritative authentication result.
- `anonymous`: no authenticated user is established, with a required Anonymous cause.
- `authenticated`: host restoration or login established a fresh presentation identity.

A thrown restore error becomes `unavailable`; it does not authenticate the cached identity and does not erase the cache. `retryRestore()` reruns the package-owned restoration state machine and deduplicates concurrent attempts.

The login route owns recovery UI for `unavailable`: it replaces credential entry with Retry and Sign out. Retry success uses the existing auth-transition redirect restoration. Protected content is never rendered optimistically.
- Router guards await the current auth readiness promise while status is `loading`. An `unavailable` result routes to login recovery through the existing validated redirect flow; successful retry restores the original destination or its existing safe fallback.

### Anonymous cause and logout

The Anonymous cause is a tagged union:

- `{ kind: "unauthenticated" }`: no authentication was established, including an ordinary first visit with no valid host credential.
- `{ kind: "user-requested" }`: the user explicitly signed out.
- `{ kind: "evicted", evictionReason: "expired" | "forbidden" | "unknown" }`: the host invalidated authentication.

No eviction parameters are included initially. Parameters require a concrete frontend requirement and reason-specific typing; an open JSON bag is rejected because it could become an accidental backend DTO channel.

`logout(cause)` requires an explicit cause and passes it to the host logout callback. It clears package persistence and transitions locally to anonymous before awaiting host cleanup. Host callback rejection rejects the action promise but never restores authenticated UI or cached identity.

### Multiple tabs

- Durable logout is synchronized to other tabs that consume the same LocalStorage namespace.
- Passive tabs transition and clear package state locally without invoking their host logout callbacks.
- Login and identity writes do not authenticate other tabs. Every tab must obtain an authoritative host restore result.
- SessionStorage remains tab-local.
- Cross-tab delivery remains an explicit versioned LocalStorage invalidation event; passive tabs do not infer eviction by rerunning host restoration after identity removal.
- Cross-tab handling reuses the same internal anonymous transition as user logout, direct eviction, and authoritative anonymous restoration. Only event transport/validation and host-callback ownership differ.
- Identity removal alone is not a reliable signal: it carries no cause, may emit no event when already absent, misses SessionStorage-only identities, races cookie logout, and can re-authenticate forbidden users whose host session remains valid.

## Research notes

- The current `AdminAuthStatus` has `loading`, flat-reason `anonymous`, and `authenticated` variants.
- The current auth store starts as anonymous/unknown, is explicitly documented as non-persistent, and transitions to anonymous only after the host logout callback succeeds.
- The current `AdminAuthStoreConfig` has only host-owned `login` and parameterless `logout` effects.
- `createAdminRouter` resolves the auth store during construction and owns auth guards and auth-transition routing, so restoration readiness must be integrated with guards without making the router own credential validation.
- The demo configures auth before creating the router, which supports `configure` as the restoration trigger.
- Existing package boundary rules prohibit session models, backend DTOs, transport clients, and backend state in `@noob-naive-ui/admin`.

## Open risks

- Storage parsing must reject malformed, stale-version, or backend-shaped records without authenticating them.
- Browser storage can throw or be unavailable; the implementation needs a fail-closed in-memory fallback without weakening host restoration.
- The login route must distinguish ordinary unauthenticated credential entry from unavailable recovery and evicted messaging without exposing unsafe host error text.
- The exact readiness-promise behavior under a generation change must ensure guards never await an abandoned operation indefinitely.

## Questions settled in this session

- Refresh restoration validates before rendering protected UI; no optimistic authenticated shell.
- Restore runs on every configured startup, regardless of cached identity.
- Remembered identity uses LocalStorage; non-remembered identity uses SessionStorage.
- Host restoration returns a tagged result rather than a boolean or exception-derived reason.
- Thrown restoration errors produce an explicit recoverable `unavailable` state.
- Recovery appears on the login route rather than a root overlay or dedicated route.
- Logout cause is explicit, tagged, passed to the host, and locally authoritative even if host cleanup fails.
- Restore results may carry any Anonymous cause.
- Latest-operation generation ownership prevents stale async completions.
- Identity persistence and durable logout events use separate versioned storage keys.
- Guards await auth readiness and reuse validated login redirects for unavailable recovery.

## Suggested next questions

1. What user-visible copy should correspond to each Anonymous cause and restoration failure?
2. Should cached presentation identity be used anywhere while status is `loading`, or remain entirely internal until validation succeeds?
3. What exact fallback behavior should apply when LocalStorage or SessionStorage access throws?

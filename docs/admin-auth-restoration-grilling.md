# Admin Authentication Restoration Grilling Notes

## Purpose

Reconcile refresh-safe Admin Authentication with the boundary that the host application owns credentials, sessions, persistence, authentication effects, and cross-tab auth coordination.

This document records the settled architecture, the design gap discovered during implementation, rejected alternatives, and the remaining implementation risks.

## Terminology

### Authentication presentation identity

`AdminAuthIdentity` is frontend rendering data only:

```ts
type AdminAuthIdentity = {
  userLabel?: string;
  avatarUrl?: string;
  subtitle?: string;
};
```

It is not a session identifier, credential, refresh handle, authorization result, or backend user model.

### Credential/session material

Cookies, bearer tokens, refresh tokens, session IDs, SDK state, server-preloaded sessions, and any opaque value accepted as proof of authentication are credential/session material. Calling such a value an “identity” or making it opaque does not change its security role.

### Host effect

A host effect is an application-supplied `login`, `restore`, or `logout` callback. Its implementation may use an HttpOnly cookie, bearer token, authentication SDK, server-preloaded state, or another host-owned mechanism.

## The design gap

The original direction correctly established that:

- Admin browser data could never establish authentication.
- `restore()` must run unconditionally at startup.
- The host must determine authentication from its own credential/session authority.
- A successful host effect returns fresh presentation identity for Admin UI.

It then introduced versioned LocalStorage and SessionStorage records containing presentation identity and a Remember Me tier. That persistence was justified as “refresh continuity,” but the design had not answered whether cached name/avatar data should be rendered while restoration was pending. The implementation consequently parsed the record, retained only its storage tier, and discarded the cached identity.

The mistake was not parameterless `restore()`. A parameterless callback is correct because the host adapter already knows how to inspect its own cookie, token, SDK, or preloaded state. The mistake was assuming that presentation identity had value merely because it survived refresh.

Pre-authentication visual continuity is not a product goal. Persisting display fields therefore adds schema, storage, migration, failure, and host-configuration complexity without delivering a valued behavior. A tier marker alone would also be dead state: actual Remember Me behavior is the lifetime of the host credential/session, not the lifetime of frontend display data.

## Settled ownership

### Admin owns

- Frontend Authentication state.
- Synchronous transition to `loading` during initial configuration.
- Unconditional invocation of the host restore effect.
- Restoration readiness consumed by router integration.
- Fresh presentation identity returned by successful host effects.
- Tagged anonymous causes.
- Recoverable `unavailable` state and retry orchestration.
- Monotonic operation generations and stale-completion suppression.
- Local-first logout and eviction transitions.
- A typed, local-only invalidation action for host-originated signals.
- Safe frontend error and pending-state presentation.

### Host owns

- Credentials and session authority.
- Cookie, token, SDK, SSR, or other persistence mechanisms.
- Remember Me/session-lifetime policy.
- Backend calls, authorization decisions, token rotation, revocation, and cleanup.
- Cross-tab change detection, signal validation, transport, ordering, retry, and delivery.
- Calling Admin's local invalidation action in each tab affected by a host-observed logout or eviction.

### Admin Vue Router owns

- Waiting for current Authentication readiness.
- Protected-route admission and login redirects.
- Validated redirect restoration and home fallback.
- Navigation reactions to public Authentication state.

It does not own credential validation, session persistence, or cross-tab auth transport.

## Public seam

Conceptually, the host configuration remains small:

```ts
interface AdminAuthStoreConfig {
  login(values: AdminLoginValues): Promise<AdminAuthIdentity>;
  restore(): Promise<AdminAuthRestoreResult>;
  logout(cause: AdminAnonymousCause): Promise<void> | void;
}
```

The public store additionally exposes frontend orchestration actions:

```ts
interface AdminAuthActions {
  retryRestore(): Promise<void>;
  logout(cause: AdminAnonymousCause): Promise<void>;
  invalidate(cause: AdminAnonymousCause): void;
  waitForRestoration(): Promise<void>;
}
```

Exact exported declarations remain an implementation decision, but the behavioral separation is settled.

`invalidate(cause)` is local-only. It advances operation ownership, applies the tagged anonymous cause, and closes protected access. It never invokes the host logout callback, sends an event, registers a listener, or retries restoration.

## Authority and startup

- `auth.configure(...)` synchronously enters `loading` and starts host restoration once.
- Restoration runs even when the package has no browser state. This is required for HttpOnly cookies, SDK initialization, in-memory host state, and server-preloaded sessions.
- Only a current successful host `login()` or `restore()` result may establish `authenticated`.
- A successful result supplies fresh presentation identity; Admin never merges it with stale browser data.
- An explicit anonymous restore result is authoritative and applies its tagged cause.
- A thrown restore error means the host could not determine authority. It becomes `unavailable`, not authenticated or ordinary anonymous.
- Protected navigation remains closed while loading or unavailable.

## Remember Me

`AdminLoginValues.remember` is forwarded unchanged to the host login effect. The host decides what it means for its mechanism:

- an HttpOnly-cookie backend may choose cookie/session expiry;
- a token host may choose memory, session, or durable storage under its own security policy;
- an SDK host may select the SDK's persistence mode;
- a host may reject or ignore Remember Me when its policy does not support it.

Admin does not imitate Remember Me by caching presentation fields.

## Authentication states and causes

The settled state model distinguishes:

- `loading`: a current host restoration operation is pending;
- `unavailable`: restoration failed without an authoritative auth result;
- `anonymous`: no authenticated Admin user is established, with a required tagged cause;
- `authenticated`: a current host login or restoration returned fresh presentation identity.

The Anonymous cause is:

```ts
type AdminAnonymousCause =
  | { kind: "unauthenticated" }
  | { kind: "user-requested" }
  | {
      kind: "evicted";
      evictionReason: "expired" | "forbidden" | "unknown";
    };
```

No open parameter bag crosses the package seam. New cause-specific data requires a concrete frontend use case and a typed contract.

## Logout and local invalidation

### Initiating logout

`logout(cause)`:

1. advances the operation generation;
2. transitions local state to anonymous immediately;
3. closes protected UI and navigation;
4. invokes the host logout callback;
5. exposes callback rejection to the initiating caller without restoring local authenticated state.

The host callback owns actual session cleanup and any cross-tab notification appropriate to its mechanism.

### Host-originated local invalidation

A host may discover expiration, forbidden access, SDK sign-out, or a cross-tab signal. It calls:

```ts
auth.invalidate(cause);
```

The action:

- advances the generation so pending login/restore/retry results become stale;
- applies the supplied anonymous cause;
- invokes no host callback;
- broadcasts nothing;
- is safe when called repeatedly;
- allows a later different cause to replace an earlier cause deterministically.

This avoids callback multiplication and rebroadcast loops while keeping the reusable local state transition inside Admin.

## Cross-tab coordination

Cross-tab transport follows the host's authentication mechanism rather than a package-owned protocol.

Examples:

- an auth SDK may already emit session changes in every tab;
- a token host may use BroadcastChannel or a host-owned LocalStorage event;
- a server-backed host may use server-sent events, WebSocket notifications, or polling;
- an application may intentionally choose no cross-tab synchronization.

The host validates its own signal and calls `auth.invalidate(cause)` in the receiving tab. Admin owns no event key, namespace, schema, listener, unique ID, deduplication set, or transport lifecycle.

Passive tabs do not automatically invoke host logout or rerun restoration. Rerunning restoration can race host cleanup or re-admit a user whose broader host session remains valid while Admin access is forbidden.

## Latest-operation ownership

Every login, restore, retry, logout, authoritative anonymous result, and local invalidation participates in one monotonic generation model.

An async completion may commit only if its captured generation is still current. A newer logout or invalidation therefore prevents an older login, restore, or retry from re-authenticating the tab.

Readiness replacement must also settle every waiter associated with an invalidated operation; no router guard may wait forever on abandoned work.

## Unavailable recovery

A thrown restoration error becomes `unavailable` because network, SDK, or initialization failure does not prove that the host session is invalid.

- The login route replaces credential entry with Retry and Sign out.
- Retry starts one current restoration operation and deduplicates concurrent requests.
- Retry success uses the existing validated redirect restoration or home fallback.
- Repeated failure returns to unavailable without exposing raw host errors.
- Sign out performs local-first user-requested logout and delegates host cleanup.
- No cached presentation identity is retained or required for recovery.

## Rejected alternatives

### Core Admin persists session material

Rejected as the universal core contract. If Admin stores a value that the host later trusts for restoration, that value is credential/session material even when opaque. Admin would then own serialization, validation, storage location, rotation, cleanup, redaction, and migration policy. A LocalStorage default would also downgrade HttpOnly-cookie and many SDK-backed hosts.

A generic type parameter does not remove those runtime security obligations.

### Put session persistence in Admin Vue Router

Rejected. Authentication persistence is independent of navigation. Router ownership would couple security-sensitive storage to Vue Router, exclude non-router hosts, and violate the existing seam where the router consumes readiness without validating credentials.

### Optional mechanism-specific adapter package

Deferred rather than prohibited. If at least two real hosts share a concrete credential lifecycle, an optional package such as a bearer-token host adapter may implement the core `login`/`restore`/`logout` seam. It must own an explicit threat model and must not make core Admin generic over arbitrary session material.

### Package-owned cross-tab event transport

Rejected after choosing host-owned persistence. Only the host knows whether its SDK, token, cookie, or server mechanism already propagates changes and which causes should cross tabs. Keeping a package event protocol would retain namespace, storage, validation, deduplication, and lifecycle complexity after its original identity-cache premise was removed.

## Current implementation status

The architecture is settled, but implementation is incremental:

- Initial configure-time host restoration and router readiness are implemented.
- The now-rejected presentation identity persistence was implemented and must be removed as a clean cutover.
- `unavailable` recovery, tagged causes, complete generation ownership, local-first logout, and host-invoked local invalidation remain planned work in the parent ticket sequence.
- The documents describe the settled target; individual tickets state the current implementation boundary.

## Open risks

- Readiness replacement under generation changes must settle all router waiters.
- Host callback rejection must remain observable without reversing local invalidation.
- A host integration can forget to deliver cross-tab events; starter documentation should show the seam without pretending one transport fits every auth mechanism.
- Repeated invalidation with different causes needs deterministic precedence; the latest supplied cause is the current frontend explanation.
- Login and recovery UI must not expose raw host errors.

## Questions settled

- Host login and restoration are the only positive authentication authority.
- Restore runs on every configured startup and remains parameterless.
- Admin persists neither presentation identity nor credential/session material.
- Remember Me is interpreted by the host login effect.
- Thrown restoration errors produce recoverable unavailable state.
- Recovery remains on the login route.
- Logout is local-first and cause-aware.
- Latest-operation generation ownership suppresses stale completions.
- The host owns cross-tab detection and delivery.
- Admin exposes one local-only invalidation action and owns no cross-tab transport.
- Admin Vue Router consumes Authentication state but owns no auth persistence.

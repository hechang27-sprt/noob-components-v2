# Design alternatives: host-owned authentication persistence

## Problem

The existing design combines two independent mechanisms:

1. The host owns the credential/session source and `restore()` validates it.
2. Admin stores presentation identity plus a tier, but does not use that identity to restore authentication.

Because pre-authentication visual continuity is not valuable, the package identity cache currently contributes no user or host-developer outcome. The design must decide where reusable authentication persistence belongs without confusing presentation identity with authentication identity.

## Terminology correction

The word `identity` currently means frontend presentation:

```ts
type AdminAuthIdentity = {
  userLabel?: string;
  avatarUrl?: string;
  subtitle?: string;
};
```

A session ID, bearer token, refresh token, SDK state, cookie, or opaque value accepted by a server is **credential/session material**, not another form of `AdminAuthIdentity`. One union or field must not mean “sometimes display data, sometimes a credential.” Its security, persistence, transport, rotation, revocation, and redaction obligations differ fundamentally.

## Evaluation criteria

- Host DX: minimum integration surface and minimum security policy duplicated by each host.
- Interface depth: library owns reusable orchestration behind a small host interface.
- Security: package must not accidentally downgrade HttpOnly or SDK-managed sessions.
- Breadth: support HttpOnly cookies, bearer tokens, external SDKs, SSR/preloaded auth, and in-memory test hosts.
- Remember Me: distinguish UI intent from the mechanism that actually extends authentication lifetime.
- Placement: auth lifecycle must not become coupled to Vue Router unless navigation requires it.
- Testability: package tests should verify state-machine behavior without pretending to validate host credentials.

## Option 1 — Host owns all credential/session persistence

### Interface

```ts
interface AdminAuthStoreConfig {
  login(values: AdminLoginValues): Promise<AdminAuthIdentity>;
  restore(): Promise<AdminAuthRestoreResult>;
  logout(cause: AdminAnonymousCause): Promise<void> | void;
}
```

The host adapter hides its mechanism:

- HttpOnly cookie host: login endpoint interprets `remember`, sets the appropriate cookie lifetime; restore calls `/session`; logout revokes/clears it.
- Bearer-token host: callback implementation owns token storage and refresh.
- SDK host: callbacks delegate to SDK login/session/logout operations.
- SSR host: restore reads preloaded or framework session state.

Admin owns the reusable state machine: loading/readiness, tagged outcomes, retry, operation generations, local-first anonymous transitions, router-independent state, and safe callback ordering. It stores no credential or presentation cache.

### Strengths

- Smallest and hardest-to-misuse interface.
- Credential policy remains beside the mechanism that understands it.
- Does not downgrade secure cookies or SDK storage.
- `remember` already reaches `login(values)`, so the host can implement real session lifetime without another package persistence contract.
- Removes namespace, storage adapters, Zod identity records, tier detection, and dead cache behavior from host setup.

### Costs

- The library cannot implement token/cookie persistence uniformly because those mechanisms are not uniform.
- A starter must provide one concrete adapter, but it already must provide login/restore/logout effects.
- Cross-tab authentication and eviction delivery remain host-defined. Admin exposes a local-only invalidation transition that host SDK, storage, BroadcastChannel, or server-event adapters may invoke.

### DX conclusion

This does not give up reusable logic. It draws the seam around the non-reusable mechanism and keeps the reusable orchestration inside Admin.

## Option 2 — Host returns credential/session material and Admin persists it

### Possible interface

```ts
type AdminAuthenticatedResult<TSession> = {
  identity: AdminAuthIdentity;
  session: TSession;
};

interface AdminAuthStoreConfig<TSession> {
  login(values: AdminLoginValues): Promise<AdminAuthenticatedResult<TSession>>;
  restore(session: TSession | null): Promise<AdminAuthRestoreResult<TSession>>;
  sessionPersistence: AdminSessionPersistence<TSession>;
}
```

A safe version cannot use the existing parameterless `restore()` as proposed: if Admin persists a value and expects the host to restore from it, the value must flow back to the host and its codec/storage/cleanup semantics must be explicit. Returning a value from `restore()` alone only rotates or rewrites a session after the host has already restored through some other authority.

### Strengths

- Admin could centralize tier selection, safe storage calls, and cleanup ordering.
- Hosts with equivalent bearer-token semantics could reuse one implementation.

### Costs and risks

- `TSession` is security-sensitive even when opaque. Admin becomes responsible for credential lifetime, storage location, serialization, malformed input, migration, redaction, rotation, and deletion.
- A LocalStorage default would be unsafe for HttpOnly-cookie hosts and many SDKs.
- SessionStorage versus LocalStorage is not equivalent to server-side Remember Me; cookie expiry and refresh-token policy still belong to the host/server.
- Generic typing does not erase runtime security obligations.
- Callbacks become more complex: serialize/parse/validate, choose allowed tiers, restore from material, rotate material, and clear it.
- Pinia/SSR boundaries become harder because callback-bearing codecs and sensitive values must stay outside serialized store state.

### Viable restricted form

This option is viable only as an explicitly credential-bearing module for a narrow mechanism, such as a bearer-token adapter. It must not reuse `AdminAuthIdentity`, must have no universal LocalStorage default, and should not live in the UI package core.

## Option 3 — Move option 2 into `admin-vue-router` or another package

### `admin-vue-router`

Rejected. Credential/session persistence is independent of navigation. Putting it in the router package:

- couples authentication to Vue Router;
- prevents non-router Admin hosts from using it;
- makes router construction responsible for security-sensitive storage;
- weakens the existing seam where router consumes auth readiness without owning credential validation.

The router should await/auth-route state, not persist sessions.

### Separate package

A separate optional package can be coherent if it is mechanism-specific:

```text
@noob-naive-ui/admin                 auth state machine and UI
@noob-naive-ui/admin-vue-router      navigation integration
@noob-naive-ui/admin-auth-bearer     optional bearer-token host adapter
```

Such a package would implement the same host `login`/`restore`/`logout` interface. It would own its credential schema and explicit security policy rather than making core Admin generic over arbitrary session material.

Strengths:

- Reuses persistence logic for hosts that actually share a mechanism.
- Keeps sensitive code and dependencies out of core UI and router packages.
- Preserves the small core host interface.

Costs:

- Worth creating only when at least two real hosts share the same credential lifecycle.
- Cannot be a universal auth package across cookies, bearer tokens, SDKs, and SSR; those mechanisms have incompatible persistence semantics.
- Requires a security-specific specification, threat model, and tests.

## Recommendation

Choose option 1 for core `@noob-naive-ui/admin` and remove package-owned presentation identity persistence and cross-tab transport. Preserve the callback seam and deepen the library behind it with restoration readiness, retry, operation generations, cause-aware local-first logout, and an idempotent local invalidation action for host-originated eviction signals.

If repeated host code later appears for a concrete credential mechanism, extract that implementation into a separate optional adapter package under option 3. Do not put it in `admin-vue-router`, and do not generalize before two real adapters prove the seam.

Reject option 2 as a universal core contract. If pursued, rename the value as credential/session material, pass it explicitly into restoration, and accept that Admin becomes a security-sensitive credential persistence module rather than a frontend auth-state package.

## Documentation salvage

- Replace “Admin persists authentication identity” with “Admin presents fresh host identity after authoritative effects.”
- Remove LocalStorage/SessionStorage identity diagrams and namespace requirements from the core design if option 1 is selected.
- State that `remember` is host input controlling actual session lifetime; Admin does not create persistence by caching display fields.
- Keep unconditional restoration, loading/readiness, tagged results, unavailable recovery, operation generations, and local-only anonymous transitions.
- Make cross-tab delivery host-owned. Admin receives a typed cause through a local invalidation action but owns no event transport, namespace, schema, listener, deduplication, or rebroadcast policy.
- Local invalidation may reduce access and invalidate older operations; it never invokes host logout or establishes authentication.
- Re-scope ticket #3 implementation for removal/migration and re-evaluate tickets #4–#6 against a cache-free model.

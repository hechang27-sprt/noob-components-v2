# Design: Persist Authentication presentation identity — SUPERSEDED

> **Status:** Superseded by [`.trellis/tasks/07-28-reconcile-host-owned-auth-restoration/design.md`](../07-28-reconcile-host-owned-auth-restoration/design.md).
>
> The original design below defined package-owned LocalStorage/SessionStorage identity records with versioned Zod schemas, tier detection, and storage adapters. The reconcile task selected **Option 1 — Host owns all credential/session persistence** (design.md:36-72). This document is retained for history only.

## Corrected seam (from reconcile task)

### Problem with the original design

The original design combined two independent mechanisms:

1. The host owns the credential/session source and `restore()` validates it.
2. Admin stores presentation identity plus a tier, but does not use that identity to restore authentication.

Because pre-authentication visual continuity is not valuable, the package identity cache contributed no user or host-developer outcome. The cache also introduced configuration surface (namespace, storage adapters, Zod schemas) that every host must satisfy without receiving a benefit.

### Corrected boundaries

- **Host**: owns cookies, tokens, SDK sessions, server-preloaded state, storage policy, expiry, rotation, revocation. Supplies `login(values)`, parameterless `restore()`, and `logout(cause)`.
- **Admin**: owns the reusable state machine (loading/readiness, tagged outcomes, retry, operation generations, local-first anonymous transitions, safe callback ordering). Stores no credential or presentation cache.
- **Cross-tab**: host-owned delivery (SDK events, BroadcastChannel, server push). Admin exposes one idempotent local invalidation action; no event transport, namespace, schema, or listener.

### Removals

- No Authentication persistence namespace configuration.
- No LocalStorage/SessionStorage adapters for auth.
- No versioned Zod identity records, tier detection, or safe storage wrappers.
- No persistence helpers, identity schemas, or cached-identity reads in the auth store.
- No persistence-specific tests or specification.

### Preserved

- `AdminLoginValues.remember` forwarded to host login; host interprets it for actual session lifetime.
- Parameterless unconditional `restore()` with fresh `AdminAuthIdentity` output.
- Loading/readiness, fresh presentation state, tagged anonymous causes.
- Shell-preference persistence (unrelated, observable UI state).
- All existing issue #2 auth-store/restoration/readiness behavior.

---

## Original design (superseded)

### Boundaries

- `@noob-naive-ui/admin` owns presentation identity records, tier selection, validation, and safe storage access.
- The Pinia auth store owns authenticated presentation state and invokes persistence only after authoritative host effects succeed.
- The host supplies login, restore, logout, a required stable namespace, and optionally injectable LocalStorage/SessionStorage-compatible adapters.
- Browser storage is a presentation cache only. It cannot resolve restoration, transition Authentication to authenticated, or bypass router readiness.

### Public contract changes

Extend `AdminAuthStoreConfig` with:

- a required non-empty persistence namespace;
- optional LocalStorage-compatible and SessionStorage-compatible adapters for SSR, blocked-storage environments, and tests.

Reuse `AdminLoginValues.remember`; do not introduce another persistence-choice field. Keep the persisted record type and key builder internal unless implementation proves a host-facing type is necessary.

### Persistence runtime

Add a dedicated runtime helper beside the existing shell-preferences helper. It owns:

- a storage adapter type limited to `getItem`, `setItem`, and `removeItem`;
- namespace normalization and versioned identity-key derivation;
- a strict Zod schema for `{ version, identity }` records;
- safe JSON parsing and serialization;
- safe get/set/remove wrappers that contain missing, blocked, or throwing storage;
- loading the current valid tier and removing malformed or obsolete records;
- writing one selected tier while removing the opposite tier.

The persisted payload contains only `AdminAuthIdentity` presentation fields. Unknown fields are discarded or rejected at this boundary; state consumes only normalized identity returned by the helper.

### Tier resolution

At configuration, inspect LocalStorage and SessionStorage without changing auth status or skipping restoration:

1. Valid LocalStorage record → current tier is durable.
2. Otherwise, valid SessionStorage record → current tier is tab-scoped.
3. Neither valid → no tier.
4. If both are valid, LocalStorage wins and SessionStorage is treated as the conflicting opposite tier to remove on the next successful authoritative write.

On successful login:

- `remember === true` selects LocalStorage;
- absent/false selects SessionStorage;
- write fresh host identity to the selected tier and remove the opposite tier.

On successful authenticated restoration:

- preserve the detected valid tier;
- default to SessionStorage when no valid tier exists;
- replace the entire cached identity with the fresh host identity, then remove the opposite tier.

Anonymous or rejected restoration never uses cached identity to authenticate. Failed login does not change persisted records.

### Failure behavior

Every storage operation is best-effort and independently guarded. Storage failure does not reject login/restore, alter authoritative host outcomes, or prevent in-memory state transitions. If a read throws, that tier behaves as unavailable rather than valid. Cleanup/write failures remain contained.

A required namespace is validated synchronously during the first configuration before storage-key use. An invalid namespace is a host integration error, not a storage degradation case.

### Compatibility and sequencing

This is a clean configuration-contract cutover. Migrate the demo and all tests with a namespace in the same change. The issue-#2 restore state machine and router gate remain intact; persistence wraps successful identity commits rather than creating a second Authentication path.

Issue #5 later owns authoritative anonymous cleanup and operation-generation races. This ticket may keep current logout behavior and must not pre-implement broadcast or cause-aware eviction.

### Verification and rollback

Primary verification is through the public auth store with injected memory/throwing adapters. Run Admin package type-check, tests, and build, then demo type-check/build. Rollback removes the helper and configuration fields; versioned records remain inert browser keys and cannot authenticate older code.

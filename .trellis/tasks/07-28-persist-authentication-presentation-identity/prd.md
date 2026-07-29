# Persist Authentication presentation identity — SUPERSEDED

> **Status:** Superseded by [`.trellis/tasks/07-28-reconcile-host-owned-auth-restoration/prd.md`](../07-28-reconcile-host-owned-auth-restoration/prd.md).
>
> The original design below defined package-owned LocalStorage/SessionStorage identity records. The reconcile task corrected the architecture: hosts own all credential/session persistence; `@noob-naive-ui/admin` owns reusable auth orchestration without persisting presentation identity or credential material. This document is retained for history only.

## Corrective model (from reconcile task)

### Host owns persistence and authority

- Cookies, tokens, session identifiers, SDK state, server-preloaded state, expiry, rotation, revocation, serialization, and storage policy are host-owned.
- `restore()` remains parameterless. The host adapter inspects its own authority and returns fresh presentation identity or a tagged anonymous result.
- `AdminLoginValues.remember` remains host input. The host interprets it to choose actual credential/session lifetime; caching `AdminAuthIdentity` presentation fields does not implement Remember Me.
- No credential/session material enters Admin types, Pinia state, browser storage, or persistence helpers.

### Admin owns reusable orchestration

- Core Admin retains the small `login` / `restore` / `logout` host seam.
- Admin owns loading/readiness, fresh presentation state, tagged anonymous causes, unavailable/retry behavior, operation-generation ownership, local-only anonymous transitions, and safe callback ordering.
- Cross-tab session-change delivery is host-owned. Admin exposes one idempotent local invalidation action for host adapters to invoke per affected tab; Admin owns no event transport, namespace, schema, deduplication, or listener.
- Protected routes and content remain closed until a current host effect establishes authentication.

### Remove package identity persistence

- Remove package-owned Authentication identity records, tier detection, LocalStorage/SessionStorage adapters, persistence namespace configuration, and persistence-only tests.
- Do not replace identity records with a tier marker.
- Preserve shell-preference persistence; it is unrelated observable UI state.
- Legacy identity keys become inert. No migration reader or compatibility shim.

### Host DX

- A host supplies no Authentication persistence namespace, storage adapter, event scope, presentation codec, credential value, or tier callback to core Admin.
- Starter/demo adapters demonstrate the minimum mechanism-neutral contract: login receives `remember`, restore reads host-owned authority, logout clears/revokes host-owned authority.
- Core Admin remains compatible with HttpOnly-cookie, bearer-token, SDK, SSR/preloaded, and in-memory test hosts without selecting a persistence mechanism for them.

---

## Original PRD (superseded)

### Goal

Persist only frontend Authentication presentation identity according to the user's Remember Me choice while preserving the host restore effect as the sole authentication authority. Durable and tab-scoped caches improve presentation continuity, but no browser record may admit protected access or establish authenticated state by itself.

### Background

- GitHub issue #3 is child ticket 02 of the parent `07-28-admin-auth-restoration` task and is blocked by issue #2, which is already implemented.
- The current auth store starts host restoration unconditionally during `configure(...)`, enters `loading` synchronously, and authenticates only from fresh host login/restore results (`packages/admin/src/stores/auth.ts:64-117`).
- `AdminLoginValues.remember` already carries the user's persistence choice (`packages/admin/src/runtime-contract.ts:25-29`).
- The package already uses Zod plus safe injectable storage adapters for shell-preference normalization; Authentication identity needs a separate versioned boundary because it has two storage tiers and must remain non-authoritative (`packages/admin/src/runtime/shell-preferences.ts:10-20,131-177,185-249`).
- The parent design requires the Admin package to own presentation identity persistence, while the host remains responsible for session authority (`.trellis/tasks/07-28-admin-auth-restoration/design.md:3-8,29-37`).

### Requirements

#### R1 — Required namespace and isolated records

- Auth configuration must require a stable, non-empty host namespace used to derive package-owned, versioned identity keys.
- Different Admin applications on the same origin must not share presentation identity accidentally.
- The record and key contract remains frontend-only and contains no credentials, tokens, session identifiers, permissions, backend user model, or transport data.

#### R2 — Versioned normalization boundary

- Treat LocalStorage and SessionStorage values as untrusted `unknown` input.
- One dedicated Authentication runtime helper must own record schemas, JSON parsing, version validation, identity normalization, safe access, and invalid-record cleanup.
- Only the supported version and valid presentation fields may reach store state or be rewritten.
- Missing, malformed, and obsolete records must be ignored; malformed or obsolete records should be removed when storage permits.

#### R3 — Remember Me tier selection

- Successful login with `remember: true` writes the fresh presentation identity to LocalStorage and removes the namespace's SessionStorage identity.
- Successful login with `remember` absent or false writes the fresh identity to SessionStorage and removes the namespace's LocalStorage identity.
- Persistence occurs only after the host login effect succeeds; failed login must not replace tiers or create identity records.

#### R4 — Restoration tier preservation

- Configuration may inspect valid cached identity only to detect the current tier and retain presentation metadata; it must still invoke host restoration unconditionally.
- Successful authenticated restoration always replaces stale cached fields with the fresh host identity.
- If exactly one valid existing tier is detected, restoration rewrites that tier and removes the opposite tier.
- If no valid tier exists, successful restoration writes SessionStorage and removes LocalStorage.
- If both tiers contain valid records, LocalStorage is the deterministic existing tier because it represents the explicit remembered choice; successful restoration refreshes LocalStorage and removes SessionStorage.
- Anonymous or rejected restoration must not authenticate from cached identity. Existing issue-#2 fail-closed behavior remains authoritative; broader unavailable/retry semantics stay owned by issue #4.

#### R5 — Storage failure degradation

- Missing browser storage, blocked access, and throwing `getItem`, `setItem`, or `removeItem` calls must not crash configuration, login, restoration, or startup.
- Host effects and in-memory Authentication state continue to work when either or both storage tiers are unavailable.
- Storage write/removal failures are contained and do not change a successful host result into an authentication failure.
- Storage adapters must be injectable for deterministic public-store tests and non-browser execution.

#### R6 — Non-authoritative cache

- A manually written valid LocalStorage or SessionStorage record must never transition the store to `authenticated` without a successful host login or authenticated restore result.
- Protected-router behavior remains governed by `loading`, restoration readiness, and the fresh host result implemented by issue #2.
- Cached identity is not exposed as credentials or session authority and does not bypass host restoration.

#### R7 — Observable verification

- Public auth-store tests cover remembered and non-remembered login, opposite-tier cleanup, default SessionStorage restoration, existing-tier refresh, dual-tier precedence, fresh field replacement, malformed and obsolete cleanup, throwing adapters, and non-authoritative records.
- Tests assert public state and observable storage contents rather than private helper calls or source text.
- Package type-check, tests, build, and the backend-free demo build remain green.

### Acceptance Criteria (superseded)

- [ ] Remembered login stores only presentation identity in LocalStorage and removes SessionStorage identity for the namespace. (R1, R3)
- [ ] Non-remembered login stores only presentation identity in SessionStorage and removes LocalStorage identity for the namespace. (R1, R3)
- [ ] Successful cold restoration without an existing valid tier caches fresh identity in SessionStorage. (R4)
- [ ] Successful restoration refreshes fresh presentation fields in the existing valid tier and deterministically resolves dual valid tiers. (R4)
- [ ] A required stable host namespace prevents unrelated Admin applications on one origin from sharing records accidentally. (R1)
- [ ] Versioned identity records are validated at one boundary before state consumes them. (R2)
- [ ] Missing, malformed, and obsolete records never establish authentication and are safely ignored or removed. (R2, R6)
- [ ] Blocked or throwing storage degrades to in-memory Authentication state and unconditional host restoration without crashing. (R5)
- [ ] A manually written browser identity cannot authenticate a tab without a successful host effect. (R6)
- [ ] Public-store tests cover both tiers, fresh identity replacement, invalid data, throwing adapters, and non-authoritative storage. (R7)

### Out of Scope

- Persisting credentials, tokens, cookies, session authority, permissions, backend records, or transport DTOs.
- Recoverable unavailable state, retry restoration, or restoration-failure UI; issue #4 / ticket 03 owns those behaviors.
- Cause-aware local-first logout/eviction and complete async generation ownership; issue #5 / ticket 04 owns those behaviors.
- Cross-tab invalidation events; issue #6 / ticket 05 owns those behaviors.
- Router changes: issue #2 already makes host restoration authoritative before protected navigation.
- Compatibility aliases, optional namespace fallback, or migration from an unversioned Authentication record; no prior auth-identity persistence contract exists.

### Constraints

- Keep `@noob-naive-ui/admin` router-neutral and frontend-only.
- Reuse the established Zod normalization and safe injectable-storage conventions without coupling Authentication records to shell-preference storage.
- Preserve one-time `configure(...)` semantics and unconditional configure-time restoration.
- Keep callbacks and storage objects out of serializable Pinia state.
- New exported contracts must be intentional, adjacent-documentation compliant, and exposed through the package barrel only when hosts need them.

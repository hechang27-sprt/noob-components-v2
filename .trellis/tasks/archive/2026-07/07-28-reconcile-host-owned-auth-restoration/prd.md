# Reconcile host-owned auth restoration design

## Goal

Salvage Admin authentication restoration around one clean seam: hosts own all credential/session persistence behind `login`, `restore`, and `logout`; `@noob-naive-ui/admin` owns reusable frontend authentication orchestration without persisting presentation identity or credential material.

## Background

The existing design correctly made host restoration authoritative, but then introduced package-owned LocalStorage/SessionStorage records containing only `userLabel`, `avatarUrl`, and `subtitle`. Those fields cannot restore a host session and the implementation discards them during configuration, retaining only the storage tier (`packages/admin/src/stores/auth.ts:124-175`). The cache therefore does not contribute to authentication or a valued presentation behavior.

The gap began when the documents asserted that persisted presentation identity improves refresh continuity before answering their own open question about whether cached identity should be displayed during loading (`docs/admin-auth-restoration-grilling.md:94-98`). Ticket #3 then implemented identity persistence before any consumer existed. The refresh diagrams further blurred local schema validation with host-session validation (`docs/admin-auth-restoration-data-flows.md:128-176`).

The user clarified that pre-authentication name/avatar continuity does not matter. The priorities are clean code organization and low integration burden for host/starter developers.

## Settled design

### R1 — Host owns persistence and authority

- The host owns cookies, tokens, session identifiers, SDK state, server-preloaded state, expiry, rotation, revocation, serialization, and storage policy.
- `restore()` remains parameterless. Its adapter implementation already knows how to inspect its own authority and returns fresh presentation identity or a tagged anonymous result.
- `AdminLoginValues.remember` remains host input. The host interprets it to choose actual credential/session lifetime; caching presentation fields must not stand in for Remember Me.
- No credential/session material enters Admin types, Pinia state, browser storage, or persistence helpers.

### R2 — Admin owns reusable orchestration

- Core Admin retains the small `login` / `restore` / `logout` host seam.
- Admin owns loading/readiness, fresh presentation state, tagged anonymous causes, unavailable/retry behavior, latest-operation generation ownership, local-only anonymous transitions, and safe callback ordering. The host owns cross-tab delivery and calls Admin's local invalidation action in each affected tab.
- Protected routes and content remain closed until a current host effect establishes authentication.
- Admin Vue Router consumes auth state/readiness; it does not own authentication or credential persistence.

### R3 — Remove package identity persistence

- Remove package-owned Authentication identity records, tier detection, LocalStorage/SessionStorage adapters, persistence namespace configuration, and persistence-only tests/specification.
- Remove package startup/login/restore writes of presentation identity.
- Do not replace identity records with a tier marker: without a package consumer, it is dead persistence intent.
- Preserve shell-preference persistence; it is unrelated, observable UI state.
- Existing browser identity keys become inert. No migration reader or compatibility shim is needed because they are non-authoritative and no retained runtime consumes them.

### R4 — Reconcile design documentation

- State explicitly that local parsing validates only package-owned untrusted records/events, never host authentication.
- Remove LocalStorage/SessionStorage identity-cache diagrams and claims from the settled core design.
- Rewrite login and restoration flows so host effects own actual Remember Me/session continuation.
- Preserve unconditional restore, fresh identity replacement, cold restore, unavailable recovery, generation ownership, and local-only logout/eviction transitions.
- Rewrite cross-tab flows as host-owned coordination: SDK, BroadcastChannel, LocalStorage, server push, or another host mechanism invokes one package local-invalidation action; Admin owns no event transport, key, schema, deduplication, or listener.
- Mark the documents as reconciled architecture rather than “not yet implemented” where implementation status is mixed; distinguish settled contracts from future ticket work.

### R5 — Reconcile planning and executable specifications

- Update the parent task and remaining child-ticket assumptions so tickets #4–#6 do not depend on presentation identity caches or persistence tiers.
- Correct Admin runtime specifications to remove the Authentication presentation-persistence scenario while retaining host-authority and restoration-readiness rules.
- Record the package seam concretely enough that future implementation does not reintroduce generic credential persistence.

### R6 — Host and starter developer experience

- A host supplies no Authentication persistence namespace, storage adapter, event scope, presentation codec, credential value, or tier callback to core Admin. Host-owned auth infrastructure may call Admin's local invalidation action when it observes logout or eviction in another tab.
- Starter/demo adapters demonstrate the minimum mechanism-neutral contract: login receives `remember`, restore reads host-owned authority, logout clears/revokes host-owned authority.
- Core Admin must remain compatible with HttpOnly-cookie, bearer-token, SDK, SSR/preloaded, and in-memory hosts without selecting a persistence mechanism for them.
- A future optional credential adapter package is allowed only for a concrete repeated mechanism; it must implement the core host seam and must not live in `admin-vue-router`.

## Acceptance criteria

- [ ] The two design documents identify the original gap and consistently place credential/session persistence in the host.
- [ ] No settled diagram or prose implies that presentation identity validates or restores a session.
- [ ] Remember Me is described as host-controlled credential/session lifetime, not package presentation caching.
- [ ] `AdminAuthStoreConfig` no longer requires Authentication identity or cross-tab transport configuration; the package exposes only a local invalidation transition for host adapters to invoke.
- [ ] Core Admin no longer reads, validates, writes, or removes Authentication presentation identity records.
- [ ] No replacement tier marker or compatibility shim remains.
- [ ] Login, unconditional restoration, fresh host identity, loading/readiness, and router fail-closed behavior remain intact.
- [ ] Parent task, remaining child tickets, and runtime specs are reconciled with the cache-free model.
- [ ] Demo/starter host setup is smaller and demonstrates host-owned persistence semantics without backend concepts crossing into shared contracts.
- [ ] Public tests prove host effects remain authoritative and manually seeded legacy records cannot affect Authentication state.
- [ ] Admin, Admin Vue Router, and demo type-check/tests/build remain green.

## Out of scope

- Implementing a generic credential/session persistence interface in core Admin.
- Moving authentication persistence into `admin-vue-router`.
- Creating a mechanism-specific optional auth adapter before repeated host implementations justify it.
- Defining backend endpoints, cookie flags, bearer-token policy, SDK behavior, or SSR framework integration.
- Implementing all remaining ticket #4–#6 behaviors in this reconciliation; only their assumptions and contracts are corrected.
- Persisting cached presentation identity for loading/unavailable visuals.

## Risks and migration

- Removing a recently exported configuration requirement is a public clean cutover; every repository caller must migrate together.
- Legacy identity records remain in browser storage but are inert and non-authoritative. Avoid startup migration complexity for data no code reads.
- Cross-tab invalidation is host-owned because only the host knows whether its cookie, token, SDK, or server channel propagates session changes. Admin must provide an idempotent local transition that advances operation ownership without invoking host cleanup or causing rebroadcast loops.
- The existing issue #3 implementation commit remains useful history but is superseded by the corrected architecture.

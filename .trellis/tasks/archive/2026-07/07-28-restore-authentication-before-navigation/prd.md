# Restore authentication before protected navigation

## Goal

Allow a host application to restore package-owned Authentication presentation state before protected Vue Router navigation proceeds. Startup must fail closed: cached or absent presentation identity never proves authentication, protected content is not admitted while restoration is pending, and the host remains the sole authority for credentials and sessions.

## Background

- GitHub issue #2 is the first independently deliverable child of the parent `07-28-admin-auth-restoration` task.
- The current auth store starts as anonymous, `configure(...)` installs only `login` and `logout`, and configuration does not perform asynchronous restoration (`packages/admin/src/stores/auth.ts:10-56`).
- `AdminAuthStatus` already includes `loading`, but no current store transition owns startup readiness (`packages/admin/src/runtime-contract.ts:3-14`).
- The demo configures fake login/logout effects before creating the router, but has no restore effect (`apps/demo/src/main.ts:26-76`).
- The parent design establishes these boundaries: the Admin package owns Authentication presentation state and restoration readiness; the host owns session authority and restore effects; the router owns guard waiting and login recovery.

## Requirements

### R1 — Frontend-only restore contract

- Add a host-supplied `restore` effect to auth configuration.
- The effect returns a tagged frontend result: authenticated with fresh `AdminAuthIdentity`, or ordinary anonymous.
- Shared contracts must not include credentials, cookies, tokens, backend routes, session models, transport DTOs, permissions, or backend user records.

### R2 — Unconditional configure-time restoration

- The first successful `configure(...)` call must synchronously establish `loading` before invoking the host restore effect.
- Restoration must run regardless of whether browser presentation identity exists; this ticket must not make browser storage a prerequisite or authentication authority.
- Existing one-time configuration behavior remains: later `configure(...)` calls do not replace callbacks or start another restoration.

### R3 — Observable restoration outcomes

- A successful authenticated result replaces package presentation identity with the fresh host result and transitions to `authenticated`.
- An ordinary anonymous result transitions to ordinary unauthenticated state and does not use eviction/expired/forbidden messaging.
- Router consumers can await the restoration attempt associated with current startup and are guaranteed settlement when that attempt settles.
- Restore rejection behavior beyond guaranteed waiter settlement is deferred to issue #4 / ticket 03 (`recover-unavailable-restoration`); this ticket must not invent unavailable/retry UX early.

### R4 — Protected-router startup gate

- Protected route guards encountering `loading` wait for current restoration readiness and then reevaluate the requested destination against the resulting auth status.
- Authenticated restoration continues to the originally requested protected destination.
- Ordinary anonymous restoration redirects to the existing login route and preserves the existing validated redirect behavior.
- Protected route components are not admitted before restoration resolves, and guard waiters cannot remain pending after restoration settles.

### R5 — Backend-free demo boundary

- The demo supplies a fake host restore effect without introducing backend DTOs or session infrastructure.
- The demo can deterministically demonstrate both authenticated and ordinary anonymous startup outcomes.

### R6 — Observable verification

- Public auth-store tests cover immediate loading, unconditional restore invocation, authenticated identity replacement, ordinary anonymous outcome, no-cache startup, and restoration readiness settlement.
- Router integration tests use real Pinia plus memory history to prove protected navigation waits, authenticated continuation, anonymous login redirect, redirect preservation, and no optimistic protected admission.
- Tests assert public state and navigation outcomes rather than private promises, counters, or source text.

## Acceptance Criteria

- [ ] Configuring auth starts restoration unconditionally and exposes `loading` while the host effect is pending. (R1, R2)
- [ ] A successful restore result establishes fresh Authentication presentation identity and allows the originally requested protected navigation. (R3, R4)
- [ ] An ordinary unauthenticated restore result reaches login without an eviction message. (R3, R4)
- [ ] Restoration works when no browser identity cache exists. (R2)
- [ ] Protected content is not rendered and protected navigation is not admitted before restoration resolves. (R4)
- [ ] Router waiters always settle when the current restoration settles. (R3, R4)
- [ ] Authentication presentation identity remains frontend-only; credentials, session models, backend routes, and transport DTOs do not enter shared contracts. (R1)
- [ ] The demo supplies a fake restore effect and demonstrates authenticated and unauthenticated startup. (R5)
- [ ] Public-store and router integration tests prove the observable startup flow. (R6)

## Out of Scope

- Presentation identity persistence, storage schemas, tier selection, or trusting storage; these belong to issue #3 / ticket 02.
- Recoverable unavailable state, retry, and restoration-failure UI; these belong to issue #4 / ticket 03.
- Cause-aware authoritative logout/eviction and async race ownership beyond the startup readiness needed here; these belong to issue #5 / ticket 04.
- Cross-tab invalidation; this belongs to issue #6 / ticket 05.
- Backend session endpoints, credential storage, token refresh, transport clients, or authorization policy.
- Compatibility aliases or deprecated overloads; this repository uses a clean public-contract cutover.

## Constraints

- Keep `@noob-naive-ui/admin` router-neutral; Vue Router behavior remains in `@noob-naive-ui/admin-vue-router`.
- Reuse the existing login route, validated redirect handling, and auth-transition routing.
- Preserve the package-owned Pinia store as the primary public seam.
- All new exported contracts must be intentionally exposed through the package barrel and documented adjacent to their declarations.

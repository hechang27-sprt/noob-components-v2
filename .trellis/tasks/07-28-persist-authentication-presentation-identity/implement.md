# Implementation Plan: Persist Authentication presentation identity — SUPERSEDED

> **Status:** Superseded by [`.trellis/tasks/07-28-reconcile-host-owned-auth-restoration/implement.md`](../07-28-reconcile-host-owned-auth-restoration/implement.md).
>
> The original plan below defined package-owned persistence runtime, tier detection, and storage adapter integration. The reconcile task's **Phase 2 — Remove the superseded package persistence interface** (implement.md:14-17) replaces it with removal. This document is retained for history only.

## Corrective implementation (from reconcile task)

### Phase 2 — Remove the superseded package persistence interface

1. Remove Authentication identity persistence and cross-tab transport configuration, presentation storage adapters, event scopes, listeners, schemas, and auth-store tier/cache integration.
2. Delete the Authentication identity persistence runtime and remove its exports.
3. Migrate demo, starter, test helpers, and every `auth.configure(...)` caller to the smaller host seam.
4. Replace persistence-specific tests with observable authority tests where needed; preserve unconditional restore, fresh identity replacement, and fail-closed router behavior.
5. Remove the Authentication presentation-persistence scenario from runtime specs and document host-owned Remember Me/session persistence plus mechanism-neutral adapter examples.

### Validation commands

- `pnpm --filter @noob-naive-ui/admin test -- auth-store`
- `pnpm --filter @noob-naive-ui/admin typecheck`
- `pnpm --filter @noob-naive-ui/admin test`
- `pnpm --filter @noob-naive-ui/admin build`
- `pnpm --filter @noob-naive-ui/admin-vue-router typecheck`
- `pnpm --filter @noob-naive-ui/admin-vue-router test`
- `pnpm --filter demo typecheck`
- `pnpm --filter demo build`

### Review gates

- Host callbacks remain the only positive authentication authority.
- `remember` is forwarded to host login; no package cache pretends to implement session lifetime.
- No Authentication persistence namespace, tier, identity record, storage adapter, event scope, or event transport remains in core Admin.
- Shell-preference persistence remains untouched.
- Cross-tab delivery is host-owned; Admin's idempotent local invalidation action advances generation, sets the typed anonymous cause, and never invokes host cleanup or rebroadcasts.
- Documentation, parent task, child tickets, runtime specs, code, callers, and tests describe one model.
- No router package code owns or imports credential persistence.

### Rollback points

- Documentation reconciliation and code removal should land in one clean cutover.
- If removing the helper reveals an external package caller, prefer the corrected breaking change over a deprecated shim.
- Legacy browser keys are intentionally not migrated or removed; they are harmless inert data and cleanup would require preserving the storage interface being deleted.

---

## Original implementation plan (superseded)

1. Define the required auth persistence namespace and injectable two-tier storage configuration while keeping adapters outside Pinia state.
2. Add an internal Authentication persistence runtime with versioned Zod records, namespace-derived keys, strict presentation identity normalization, safe tier reads/writes/removals, invalid-record cleanup, and deterministic LocalStorage precedence.
3. Integrate tier detection into one-time auth configuration without changing unconditional restoration or allowing cached identity to authenticate.
4. Persist fresh successful login identity according to `AdminLoginValues.remember`, removing the opposite tier only after host success.
5. Persist fresh authenticated restoration identity to the detected valid tier or SessionStorage by default; replace stale fields and remove the opposite tier.
6. Migrate the demo configuration and existing tests to provide a stable namespace and preserve backend-free behavior.
7. Extend public auth-store tests for both login tiers, opposite-tier cleanup, restoration defaults and refresh, dual-tier precedence, invalid/obsolete records, throwing adapters, failed host effects, and manually seeded non-authoritative records.
8. Review public exports and adjacent documentation, then run the focused and package-level validations.

### Validation commands

- `pnpm --filter @noob-naive-ui/admin test -- auth-store`
- `pnpm --filter @noob-naive-ui/admin typecheck`
- `pnpm --filter @noob-naive-ui/admin test`
- `pnpm --filter @noob-naive-ui/admin build`
- `pnpm --filter demo typecheck`
- `pnpm --filter demo build`

### Review gates

- Browser records contain only version plus presentation identity.
- No storage read or record can establish authenticated state.
- Host restoration remains unconditional and authoritative.
- Login persistence begins only after host success.
- Fresh host identity replaces, rather than merges with, stale cached fields.
- LocalStorage wins deterministic dual-tier resolution; otherwise restoration preserves one valid tier or defaults to SessionStorage.
- Every storage operation can throw without crashing or changing a successful host outcome.
- The required namespace and all changed public configuration fields are documented and migrated at every caller.

### Risk and rollback points

- `packages/admin/src/stores/auth.ts` is the key behavioral seam: verify issue-#2 loading/readiness behavior remains unchanged while adding persistence.
- The runtime helper is the trust boundary: malformed JSON, obsolete versions, unknown fields, and throwing storage need direct boundary coverage through public-store behavior.
- Do not fold issue #4/#5/#6 state, logout, race, or broadcast work into this ticket. Keeping persistence calls adjacent to current successful commits allows a narrow rollback.

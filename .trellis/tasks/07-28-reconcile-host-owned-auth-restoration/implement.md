# Implementation plan: reconcile host-owned auth restoration

## Phase 1 — Correct architecture documents

1. Rewrite `docs/admin-auth-restoration-grilling.md` around the settled option-1 seam and document where the identity-cache assumption entered.
2. Rewrite `docs/admin-auth-restoration-data-flows.md`:
   - remove package identity LocalStorage/SessionStorage participants and records;
   - show `remember` reaching host login and actual host authority;
   - keep parameterless unconditional restoration and fresh presentation output;
   - retain unavailable, generation, and local-only anonymous transition flows while replacing package event transport with host-originated invalidation calls;
   - distinguish implemented behavior from planned tickets.
3. Reconcile `.trellis/tasks/07-28-admin-auth-restoration/{prd,design,implement}.md` and remaining ticket briefs 03–05 so they do not inherit package identity/tier assumptions.

## Phase 2 — Remove the superseded package persistence interface

4. Remove Authentication identity persistence and cross-tab transport configuration, presentation storage adapters, event scopes, listeners, schemas, and auth-store tier/cache integration.
5. Delete the Authentication identity persistence runtime and remove its exports.
6. Migrate demo, starter, test helpers, and every `auth.configure(...)` caller to the smaller host seam.
7. Replace persistence-specific tests with observable authority tests where needed; preserve unconditional restore, fresh identity replacement, and fail-closed router behavior.
8. Remove the Authentication presentation-persistence scenario from runtime specs and document host-owned Remember Me/session persistence plus mechanism-neutral adapter examples.

## Phase 3 — Verify the corrected seam

9. Verify manually seeded legacy package records have no effect because no runtime reads them.
10. Verify login still forwards `remember` unchanged to the host callback.
11. Verify restore remains parameterless, unconditional, and authoritative with fresh presentation identity.
12. Verify no auth credential/session/storage type crosses core Admin or Admin Vue Router interfaces.
13. Run focused tests followed by all affected package checks.

## Validation commands

- `pnpm --filter @noob-naive-ui/admin test -- auth-store`
- `pnpm --filter @noob-naive-ui/admin typecheck`
- `pnpm --filter @noob-naive-ui/admin test`
- `pnpm --filter @noob-naive-ui/admin build`
- `pnpm --filter @noob-naive-ui/admin-vue-router typecheck`
- `pnpm --filter @noob-naive-ui/admin-vue-router test`
- `pnpm --filter demo typecheck`
- `pnpm --filter demo build`

## Review gates

- Host callbacks remain the only positive authentication authority.
- `remember` is forwarded to host login and no package cache pretends to implement session lifetime.
- No Authentication persistence namespace, tier, identity record, storage adapter, event scope, or event transport remains in core Admin.
- Shell-preference persistence remains untouched.
- Cross-tab delivery is host-owned; Admin's idempotent local invalidation action advances generation, sets the typed anonymous cause, and never invokes host cleanup or rebroadcasts.
- Documentation, parent task, child tickets, runtime specs, code, callers, and tests describe one model.
- No router package code owns or imports credential persistence.

## Rollback points

- Documentation reconciliation and code removal should land in one clean cutover so no published interface is documented in two incompatible ways.
- If removing the helper reveals an external package caller not present in the workspace, prefer the corrected breaking change over a deprecated shim; this repository has not established a stable release compatibility obligation for the new interface.
- Legacy browser keys are intentionally not migrated or removed because they are harmless inert presentation data and cleanup would require preserving the very storage interface being deleted.

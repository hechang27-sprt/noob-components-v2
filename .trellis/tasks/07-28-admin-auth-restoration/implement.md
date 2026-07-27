# Implementation Plan: Admin Authentication Restoration

1. Define the public Authentication state, Anonymous cause, eviction reason, restore-result, and host-action contracts; migrate exports and compile-time consumers as one cutover.
2. Add the versioned Zod persistence boundary with injectable safe LocalStorage/SessionStorage adapters, identity-tier selection, and validated auth-event parsing.
3. Refactor the Admin auth store around latest-generation ownership, unconditional configure-time restoration, retry/readiness behavior, the common anonymous transition, cause-aware logout, and cross-tab event lifecycle.
4. Update login and shell UI for exhaustive loading, unavailable, anonymous-cause, and authenticated behavior, including accessible Retry and Sign out controls and safe errors.
5. Update router guards to await restoration readiness and route unavailable recovery through existing validated redirect behavior without loops or abandoned waits.
6. Update the demo host with fake restore and cause-aware logout effects plus a stable persistence namespace.
7. Add auth-store behavioral tests at the public seam for persistence tiers, validation failures, storage failures, restoration outcomes, retries, logout ordering, callback rejection, operation races, cross-tab invalidation, mixed tiers, event deduplication, and non-authoritative storage.
8. Extend router integration tests for loading waits, unavailable recovery, redirect restoration, home fallback, and auth-transition cleanup.
9. Extend component tests for exhaustive state branches, recovery actions, pending behavior, sanitized feedback, and accessibility.
10. Update runtime/package specifications and architecture documentation to reflect the implemented contracts rather than planned behavior.
11. Verify Admin package type-check, full tests, build, router-runtime tests, and demo build. Review public exports and confirm no backend/session/credential types entered shared packages.

## Validation commands

- `pnpm --filter @noob-naive-ui/admin typecheck`
- `pnpm --filter @noob-naive-ui/admin test`
- `pnpm --filter @noob-naive-ui/admin build`
- `pnpm --filter @noob-naive-ui/admin-vue-router typecheck`
- `pnpm --filter @noob-naive-ui/admin-vue-router test`
- `pnpm --filter @noob-naive-ui/admin-vue-router build`
- Build the demo application through its existing package script.

## Review gates

- Public contracts remain frontend-only and router-neutral.
- Persisted values are parsed once at the runtime boundary.
- Storage cannot create authenticated state.
- Newer logout/eviction wins every race.
- Passive events do not rebroadcast or invoke host cleanup.
- Guards cannot expose protected content or wait forever.
- Tests assert observable state, storage, callback, DOM, and navigation behavior rather than private implementation.

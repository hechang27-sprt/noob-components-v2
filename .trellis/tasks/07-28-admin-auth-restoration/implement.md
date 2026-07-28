# Implementation Plan: Admin Authentication Restoration

1. Define the public Authentication state, Anonymous cause, eviction reason, restore-result, and host-action contracts; migrate exports and compile-time consumers as one cutover.
2. Refactor the Admin auth store around latest-generation ownership, unconditional configure-time restoration, retry/readiness behavior, the common anonymous transition, cause-aware logout, and a local-only idempotent invalidation action for host-originated eviction signals.
3. Update login and shell UI for exhaustive loading, unavailable, anonymous-cause, and authenticated behavior, including accessible Retry and Sign out controls and safe errors.
4. Update router guards to await restoration readiness and route unavailable recovery through existing validated redirect behavior without loops or abandoned waits.
5. Update the demo host with fake restore and cause-aware logout effects, host-owned persistence, and host-invoked local invalidation demonstrating the cross-tab boundary.
6. Add auth-store behavioral tests at the public seam for restoration outcomes, local invalidation, retries, logout ordering, callback rejection, operation races, and non-authoritative host state.
7. Extend router integration tests for loading waits, unavailable recovery, redirect restoration, home fallback, and auth-transition cleanup.
8. Extend component tests for exhaustive state branches, recovery actions, pending behavior, sanitized feedback, and accessibility.
9. Update runtime/package specifications and architecture documentation to reflect the implemented contracts rather than planned behavior.
10. Verify Admin package type-check, full tests, build, router-runtime tests, and demo build. Review public exports and confirm no backend/session/credential types entered shared packages.

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
- Host-owned persistence never establishes package authentication.
- Newer logout/eviction/invalidation wins every race.
- Local invalidation never invokes host cleanup or broadcast.
- Guards cannot expose protected content or wait forever.
- Tests assert observable state, callback, DOM, and navigation behavior rather than private implementation.

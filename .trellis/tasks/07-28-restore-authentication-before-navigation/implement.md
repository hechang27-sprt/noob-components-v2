# Implementation Plan: Restore authentication before protected navigation

1. Update the frontend Authentication runtime contract with the tagged restore result and required host restore effect; intentionally export the new public type.
2. Refactor the public auth store so first configuration enters loading synchronously, invokes restoration unconditionally, commits authenticated or ordinary anonymous presentation state, safely handles rejection, and settles public readiness on every path.
3. Extend the Vue Router auth guard to await current store restoration during loading and then reevaluate the original requested destination through existing authenticated/login redirect behavior.
4. Migrate all `auth.configure(...)` consumers and test mounting helpers to the required restore callback as one clean cutover.
5. Add public auth-store behavioral tests using deferred host effects for immediate loading, unconditional invocation without cached identity, authenticated identity replacement, ordinary anonymous result, rejection settlement, duplicate configuration, and readiness completion.
6. Extend real-router integration tests with deferred restoration to prove navigation remains pending during loading, authenticated restoration continues to the requested protected route, anonymous restoration reaches login with validated redirect state, and waiters settle.
7. Update the backend-free demo with deterministic fake authenticated and anonymous restore outcomes while keeping session/transport concepts outside shared contracts.
8. Run package type-check/tests/build and demo build; inspect public exports and confirm no backend/session/credential types crossed the package boundary.

## Validation commands

- `pnpm --filter @noob-naive-ui/admin typecheck`
- `pnpm --filter @noob-naive-ui/admin test`
- `pnpm --filter @noob-naive-ui/admin build`
- `pnpm --filter @noob-naive-ui/admin-vue-router typecheck`
- `pnpm --filter @noob-naive-ui/admin-vue-router test`
- `pnpm --filter @noob-naive-ui/admin-vue-router build`
- Run the demo package's existing build script as identified from its package manifest.

## Review gates

- Configuration exposes loading before the host restore promise can settle.
- Restoration runs with no presentation cache and no storage dependency.
- Only the host restore result can establish authenticated state.
- Every restoration settlement releases router waiters, including rejection.
- The router does not resolve protected navigation while loading.
- Anonymous startup uses ordinary login behavior, not eviction messaging.
- Existing validated redirect and loop-prevention behavior remains intact.
- New public types remain presentation-only and router-neutral.
- Tests observe public store state, promise/navigation settlement, and resolved routes rather than private implementation details.

## Risky files and rollback points

- `packages/admin/src/runtime-contract.ts` and `packages/admin/src/stores/auth.ts`: one public-contract/store cutover; migrate all configure callers before validation.
- `packages/admin-vue-router/src/create-admin-router.ts`: preserve existing guard ordering and redirect validation; router integration tests are the rollback gate.
- `apps/demo/src/main.ts`: keep fake restore startup deterministic and backend-free.
- If later-ticket requirements appear necessary (persistence, unavailable/retry, generalized eviction/races), stop and return them to their owning child ticket rather than broadening issue #2.

# Implementation plan

1. Define the public `AdminShellContext` type, private typed injection key, and fail-fast `useAdminShell()` composable beside the existing navigation contracts.
2. In `AdminShell` setup, create one computed host-authoritative active descriptor, pair it with the existing `requestDestination`, and provide the stable context.
3. Export the new type and composable through `packages/admin/src/index.ts` while preserving the scoped-slot API.
4. Extend `packages/admin/tests/admin-shell.test.ts` with observable descendant tests covering:
   - navigation through the injected control and the existing host callback;
   - reactive active-descriptor updates;
   - isolation between distinct shell providers;
   - a clear throw outside `AdminShell`.
5. Refactor the demo routed pages to consume `useAdminShell()` directly, narrow descriptor params at the page boundary, and remove their navigation prop/type duplication.
6. Simplify `apps/demo/src/App.tsx` to render `RouterView` directly without manual routed-component props.
7. Update admin/demo runtime contracts and page-instance navigation documentation with the descendant context boundary.
8. Verify:
   - `pnpm --filter @noob-naive-ui/admin test`
   - `pnpm --filter @noob-naive-ui/admin typecheck`
   - `pnpm --filter @noob-naive-ui/admin build`
   - `pnpm --filter demo typecheck`
   - `pnpm --filter demo build`
   - Browser smoke test: sign in, open Reports, open detail, confirm descriptor parameter rendering, duplicate detail opens, tab activation, and a clean console.

## Rollback points

- The API is additive; reverting the context exports/provider leaves the existing scoped slot intact.
- Keep the demo refactor in the same change so package API and demonstrated consumption cannot drift.

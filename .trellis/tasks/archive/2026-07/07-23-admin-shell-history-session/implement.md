# Implementation plan

1. Extend the Vue Router adapter with required transient scope access and validated scope metadata.
2. Expose a router-neutral adapter helper for classifying current history metadata without embedding auth policy.
3. Add memory-router tests for matching, missing, and mismatched scopes and current-scope identity.
4. Add demo-owned auth/scope state and a route guard that replaces unsafe history entries with login or freshly scoped Dashboard.
5. Add demo tests or browser scenarios covering logout, login, Back, repeated traversal, and direct routes.
6. Update public contracts and persistent docs, then run focused and workspace verification.

## Validation

- `pnpm --filter @noob-naive-ui/admin-vue-router test`
- `pnpm --filter @noob-naive-ui/admin-vue-router typecheck`
- `pnpm --filter demo typecheck`
- `pnpm --filter demo build`
- Browser Back/Forward smoke with two authenticated scopes
- `pnpm lint && pnpm format:check`

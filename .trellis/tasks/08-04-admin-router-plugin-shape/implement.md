# Implement — plugin-shaped `createAdminRouterPlugin`

## Ordered checklist

1. **Source refactor** — `packages/admin-vue-router/src/create-admin-router.ts`
   - Remove `pinia` from `CreateAdminRouterOptions`; drop the `Pinia` import.
   - Add `import type { App } from "vue"` and `getActivePinia` from `pinia`.
   - Move `reportRouterError` to module level; extract
     `installRouterErrorHandler`, `installAuthGuard`, `installScopeGuard`,
     `installAuthTransitionGuard` as module-private functions returning
     removal functions.
   - Factory: eager router + navigation runtime creation (no Pinia calls),
     return `AdminRouterPlugin` = `{ install(app), router }`.
   - `install(app)`: `getActivePinia()` gate → duplicate-install guard →
     store binding → four installers collecting removers → `app.use(router)`
     → `app.provide(ADMIN_DISPOSE_KEY, dispose)`.
   - Delete the `Object.defineProperty(router, ADMIN_DISPOSE_KEY, ...)` block.
   - Export `ADMIN_DISPOSE_KEY` (symbol stays `Symbol("adminRouterDispose")`).
2. **Package barrel** — `packages/admin-vue-router/src/index.ts`: export
   `AdminRouterPlugin` type and `ADMIN_DISPOSE_KEY`.
3. **Tests** — `packages/admin-vue-router/tests/create-admin-router.test.ts`
   - `createOptions()`: drop `pinia`; add a `createTestApp()` helper that
     `setActivePinia`s a fresh `createPinia()`, `createApp`s, `app.use(pinia)`,
     installs the plugin, and returns `{ app, router, pinia, plugin }`.
   - `getDispose(router)` symbol-walk → `app.runWithContext(() =>
     inject(ADMIN_DISPOSE_KEY))`.
   - Add tests: install without active Pinia throws; duplicate install
     throws; `plugin.router` exposes routes; dispose via inject removes
     subscriptions/guards.
   - Keep all behavioral assertions (guards, redirects, restoration,
     transition settlement) using `plugin.router`.
4. **Demo host** — `apps/demo/src/main.ts`: stop passing `pinia`; install the
   plugin after `app.use(pinia)`; bind the plugin to a local if the router is
   still referenced (it is only used for `.use(router)` today, so the chain
   becomes `.use(pinia).use(i18n).use(createAdminRouterPlugin({...}))`).
5. **Docs (current truth)** —
   - `.trellis/spec/demo/frontend/runtime-integration-contract.md`:
     signature block, "factory returns the fully configured Router" prose,
     wrong/correct example.
   - `.trellis/spec/admin/frontend/runtime-contract.md`: ownership sentence
     (createAdminRouterPlugin → plugin install).
   - `docs/adr/0002-admin-shell-router-host-contract.md`: host steps 1-2.
6. **Task context** — curate `implement.jsonl` / `check.jsonl` with the
   relevant spec + ADR entries (optional for this size; skip unless sub-agent
   dispatch is used).

## Validation commands

```bash
pnpm --filter @noob-naive-ui/admin-vue-router test
pnpm --filter @noob-naive-ui/admin-vue-router typecheck   # per package scripts
pnpm --filter @noob-naive-ui/admin-vue-router build       # if build is the dts gate
pnpm --filter demo typecheck
pnpm --filter demo build
```

Browser smoke (dev server): anonymous deep link → login → redirect restore →
authenticated shell → logout → login; console clean.

## Review gates

- `installAuthTransitionGuard` moved `scopeEntryPending` and the transition
  closure intact; settle-regression test still passes.
- No remaining `useAdminAuthStore(pinia)` / `useAdminShellNavigationStore(pinia)`
  call at factory time; `Object.defineProperty` gone from the package.
- Lower-level exports untouched.

# Implement — workspace locale JSON HMR + AdminShell tab-state reset

## Done (verified end-to-end in browser on port 5180)

- [x] `tooling/vite/vue-i18n.ts` — `createWorkspaceLocaleHmrPlugin.transform` injects the accept boundary for plain modules importing workspace locale JSON + declaring a top-level Vue I18n composer; `COMPOSER_DECL_PATTERN`; `handleHotUpdate` unchanged (returns Intlify virtual modules).
- [x] `apps/demo/src/i18n.ts` — removed the hand-written `import.meta.hot.accept` block (preset owns it now).
- [x] `packages/admin/src/components/admin-shell-tabbar.tsx` — converted to `defineComponent` (hot leaf).
- [x] `packages/admin/src/components/admin-shell-navbar-controls.tsx` — `AdminShellNavLeft`/`AdminShellNavRight` converted to `defineComponent` (hot leaves).
- [x] Browser verification: demo.json in-place update (no reload, tabs intact, patch removed); tabbar class edit (tabs intact, no reload, class applied, update bounded at the tabbar per `DEBUG=vite:hmr`).

## Pending

1. **Part C (Option P — Pinia-backed tab registry, pending approval):**
   - New `packages/admin/src/stores/tabs.ts`: `useAdminShellTabsStore` — serializable state only (`tabs` reactive Map, `visibleTabs`, `knownPageIds`, `pendingOpen`, `healingRevives`) + `clear()`; an auth-status watch (`useAdminAuthStore().status.kind` → `unauthenticated`) resets the registry (logout / cross-tab invalidation), replacing `onBeforeUnmount(clearTabs)`.
   - `packages/admin/src/components/use-admin-shell-tabs.ts`: build the controller over the store (state reads/writes move to the store); the immediate watch clears only on a real adapter identity change (`previousNavigation && navigation !== previousNavigation`) — NOT on first run, so remounts seed via `recordOrHealActive` instead of wiping; remove the unmount clear.
   - Update `packages/admin/tests/admin-shell.test.tsx` if the auth-status watch interacts with test fixtures (tests use fresh Pinia per mount; verify logout tests still behave).
   - Browser-verify: edit `AdminShell.json` → text updates in place, all open tabs preserved, no reload; logout → login → tab registry is fresh.
2. **Quality gates:** `pnpm --filter admin typecheck` · `pnpm --filter admin-vue-router typecheck` · `pnpm --filter demo typecheck` · root `pnpm exec tsc -p tsconfig.json --noEmit` · `pnpm exec oxfmt --check` · `pnpm exec oxlint --type-aware` on changed files · `pnpm --filter demo build` · admin / admin-vue-router / demo tests.
3. **Spec update** (`.trellis/spec/ui/frontend/library-i18n-contract.md`):
   - HMR paragraph: "a non-component importer that explicitly accepts the locale dependency" → the preset injects the accept boundary for composer-creating plain modules; app-side HMR code is not required.
   - New paragraph (if Part C lands): shell tab registry survives shell HMR remounts via the adapter-tracked committed registry; otherwise record the collapse limitation.
4. **Commit (jj):** one commit covering tooling/vite, demo i18n, admin components (+ admin-vue-router if Part C), spec, and task artifacts. `task.py start` before further product-code edits; `task.py archive` at the end.

## Risky files / rollback points

- `tooling/vite/vue-i18n.ts` — the transform now returns code (before: always `undefined`); wrong codegen would break served modules. Rollback: revert transform.
- `packages/admin-vue-router/src/navigation.ts` (Part C) — adapter contract; rollback: drop the field + rehydration.
- `use-admin-shell-tabs.ts` (Part C) — watch/teardown semantics change; the heal/`knownPageIds` policy must keep working (rehydration seeds `knownPageIds`).
- Served-module checks after each tooling edit (curl the served `/src/i18n.ts`).

## Review gates before `task.py start`

- prd.md converged, design.md present, Q1 answered by the user.

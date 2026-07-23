# Review result: `main...HEAD`

## Verdict

**Request changes.** Two P1 workspace-source defects can leave AdminShell tab state inconsistent with router-authoritative state. Two P2 adapter boundary defects and dropped behavioral coverage should also be addressed before merge.

## Workspace source findings

### P1 — Remove a tab only after host-confirmed close navigation

- **Location:** `packages/admin/src/components/admin-shell.tsx:377-386`
- **Observed behavior:** `closeTab` deletes the tab after any resolved `handleNavigation` call without checking the returned `AdminShellNavigationResult.active`.
- **Impact:** Vue Router can resolve an aborted navigation guard while leaving the closing tab active. The shell then removes the host-authoritatively active tab from its visible membership.
- **Remedy:** retain the tab when the returned active descriptor is still the closing tab; delete only after the host confirms a different fallback or `null`.

### P1 — Auth redirects retain stale AdminShell history metadata

- **Location:** `apps/demo/src/App.tsx:119` and `apps/demo/src/App.tsx:129`
- **Observed behavior:** login and logout call `router.replace({ name: "dashboard" })` outside the adapter.
- **Impact:** Vue Router replacement preserves `_noobAdminShell` history state. Opening Reports, logging out, and logging in can reconstruct Dashboard with the Reports page ID, label, and closability.
- **Remedy:** replace the home route through `navigation.handleNavigation` with a fresh Dashboard candidate and `closeCurrent: true`.

### P2 — Reject inherited route-definition keys

- **Location:** `packages/admin-vue-router/src/index.ts:169-174` and `:192-194`
- **Observed behavior:** registry membership indexes the caller object directly.
- **Impact:** inherited names such as `constructor`, `toString`, and `__proto__` can be treated as registered admin routes.
- **Remedy:** use a `Map` built from captured entries or require `Object.hasOwn(definitions, navKey)`.

### P2 — Refresh cached fallback descriptors from authoritative route state

- **Location:** `packages/admin-vue-router/src/index.ts:285-297`
- **Observed behavior:** the fallback cache returns an entire old descriptor when history position and `fullPath` are unchanged.
- **Impact:** codec-owned state can change while the adapter continues exposing stale `nav` data.
- **Remedy:** cache generated page identity only and rebuild the descriptor from each newly decoded destination.

## Workspace test finding

### P2 — Restore removed async-failure and boundary-reset coverage

- **Locations:** `packages/admin/tests/admin-shell.test.tsx:331-334`, `:497-506`, `:585-594`, and `:630-639`
- **Missing observable contracts:** rejected logout feedback and control recovery; menu selection following host-owned active state; rejected/duplicate activate and close requests; authenticated navigation-adapter replacement with stale in-flight completion.
- **Remedy:** add rejecting and deferred handlers, assert single dispatch and unchanged state, and replace the adapter while authentication remains stable.

## Auxiliary documentation and record findings

These do not change shipped package behavior and are tracked separately from workspace blockers.

1. **P2:** `docs/agent/admin-runtime-contract.md:159-160` retains the superseded rendered-label menu-navigation model. Update it to the scalar-key → destination → `AdminShellNavigation` boundary.
2. **P3:** `.trellis/tasks/archive/2026-07/07-16-simplify-admin-shell-navigation/check.jsonl:5` and corresponding `implement.jsonl` entries point to the removed pre-archive task path.
3. **P3:** `research/naive-ui-pro-navigation-architecture.md:28` treats every `afterEach` target as confirmed despite ignored failures; `research/upstream-navigation-architecture.md:71` assigns active-key ownership to the shell despite the host-authoritative descriptor contract.
4. **P3:** archived task metadata contains unchecked completion criteria and incorrect package ownership for the dashboard-history adapter fix; `.trellis/workspace/hechang27-sprt/index.md:12` reports five sessions while the journal contains six.

## Review coverage

- Exactly 16 parallel reviewer agents covered all 83 non-lockfile changed files.
- Workspace source and auxiliary artifacts were assigned and evaluated separately.
- `pnpm-lock.yaml` was excluded as requested.
- Existing working-copy changes to `TODO.md` and `apps/demo/src/routes.tsx` were not treated as committed PR changes.

## Verification evidence

- `pnpm typecheck` — passed.
- `pnpm -r --if-present test` — passed: 37 tests across 5 files.
- `pnpm lint` — passed.
- `pnpm format:check` — passed.
- `pnpm build` — passed; Vite emitted a non-failing 626.13 kB demo chunk warning.
- Browser smoke was not completed because the process harness generated an invalid fish `$$` launcher. No browser-runtime success claim is made.

## Planning state

The review pass is complete, but this task remains in **planning** pending a decision about which findings to remediate and how to split that work.

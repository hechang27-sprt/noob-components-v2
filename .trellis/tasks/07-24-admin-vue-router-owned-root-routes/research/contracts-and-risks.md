# Contracts, Risks, and Constraints

## Existing Contracts That Must Be Preserved

### Contract 1: Admin Core Is Router-Free
- Source: `.trellis/spec/admin/frontend/runtime-contract.md:30`
- Text: "`@noob-naive-ui/admin` imports no router API."
- Impact: Adapter can import Vue Router, but admin core cannot. Moving route records/guards to the adapter preserves this.

### Contract 2: Host Owns Redirect Validation
- Source: `.trellis/spec/demo/frontend/runtime-integration-contract.md:37-38`
- Text: "Redirect restoration accepts only a root-relative URL resolving to a matched protected registry route. Login, external, malformed, and public targets fall back to Dashboard."
- Impact: If adapter owns redirect resolution, it must still permit hosts to override or extend validation. The current validation (root-relative, non-login, requiresAuth) is generic enough to be adapter-default.

### Contract 3: Adapter Owns Scope Repair
- Source: `.trellis/spec/demo/frontend/runtime-integration-contract.md:38`
- Text: "`@noob-naive-ui/admin-vue-router` parses `_noobAdminShell`, bypasses non-registry routes, repairs stale/missing protected scope to one stable home descriptor per scope, and stamps explicit post-login entries through `enterScope`."
- Impact: Already implemented. Moving router creation/guards does not affect this.

### Contract 4: Adapter Owns No Auth State
- Source: `.trellis/spec/demo/frontend/runtime-integration-contract.md:39`
- Text: "The adapter owns no auth state."
- Impact: Auth guard can call `useAdminAuthStore()` but must not own, create, or persist auth state. The auth store remains in the admin package.

### Contract 5: Host Owns Route Tree and Login Path
- Source: `.trellis/spec/demo/frontend/runtime-integration-contract.md:39`
- Text: "The host owns route tree, login path, auth callbacks, scope ID rotation, redirect validation, menus, codecs, and tab presentation."
- Impact: If adapter creates the router and top-level routes, the host still controls through options (loginComponent, shellComponent, etc.). The host does not "own" the route tree in the sense of assembling it by hand, but retains configuration control.

### Contract 6: Package Auth Is Non-Persistent
- Source: `.trellis/spec/admin/frontend/runtime-contract.md:6`
- Text: Hosts configure effects but do not pass or set status props.
- Impact: Unchanged by routing changes.

## Risk Assessment

### Risk 1: Over-Ownership (HIGH)
If the adapter owns too much (login route component, shell route component), hosts lose flexibility to:
- Add pre-login UI (announcements, SSO buttons)
- Customize shell wrapper (additional providers, error boundaries)
- Vary redirect validation policy

**Mitigation:** Adapter owns route *records* (paths, names, meta, parent/child structure) but accepts host *components* and *options*. The host provides:
- `loginComponent` — wraps `AdminLoginPage` + custom redirect logic
- `shellComponent` — wraps `AdminShell` + custom menu/logout handling

### Risk 2: Auth Guard Coupling to `requiresAuth` Meta (MEDIUM)
If adapter stamps `meta: { requiresAuth: true }` on shell children, and the auth guard checks this meta, a host that wants different gating logic cannot easily override it.

**Mitigation:** Make guard configurable or skippable. Provide a `guard?: "default" | "none" | (to) => boolean | undefined` option.

### Risk 3: `loginRouteName` / `homeRouteName` Magic Strings (LOW)
Hard-coding names like `"login"` and `"dashboard"` as defaults is fine, but they must be overridable.

**Mitigation:** Default to `"login"` and `"dashboard"` but accept override options in both router factory and guard installer.

### Risk 4: `homeDestination` Duplication (LOW)
The adapter already accepts `homeDestination` in `createAdminShellVueRouterNavigation()`. If the router factory also needs it, there's a DRY concern.

**Mitigation:** Router factory and navigation creation could be unified into a single factory, or the router factory could accept a pre-configured navigation adapter.

### Risk 5: Test Surface Expansion (MEDIUM)
Every moved feature needs adapter-level tests. Currently the demo has no tests — behavior is verified via browser smoke. Moving logic to the adapter means the adapter tests must cover:
- Router factory produces correct route tree
- Auth guard blocks anonymous → protected, redirects authenticated → login, permits public
- Combined guard ordering (auth before scope)
- Custom overrides work

**Mitigation:** Add tests incrementally alongside the move.

## Constraint: Admin-Starter Does Not Exist
- `apps/admin-starter/src` path is missing (confirmed by glob)
- There is only one consumer (demo). This simplifies the cutover but means no regression surface in other apps.

## Constraint: No Demo Tests Exist
- `apps/demo` has zero test files
- Browser smoke is the only verification method for demo behavior
- Moving logic to the adapter means tests live in `packages/admin-vue-router/tests/`

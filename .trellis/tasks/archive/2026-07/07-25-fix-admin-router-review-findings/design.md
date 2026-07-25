# Design: Fix admin router review findings

## Ownership boundaries

`createAdminRouter()` owns two non-overridable route invariants: the login route is public and the shell parent is protected. Host overrides remain limited to path, inner presentation component, and non-reserved metadata. The implementation will merge host metadata first and stamp package metadata last; login metadata will explicitly remove or override `requiresAuth` so runtime behavior is safe even though Vue Router's open-ended `RouteMeta` shape cannot statically exclude one string key reliably.

`@noob-naive-ui/admin-vue-router` also owns interpretation of the untrusted `redirectUrl` query and all auth-status-driven router effects. Host codecs remain authoritative for application payload conversion, but codec failures at redirect restoration are not router-factory failures: they select `homeDestination`.

## Auth-transition settlement

Keep the existing single transition function rather than adding a state machine or retry abstraction. `scopeEntryPending` remains the overlap guard, but its lifetime is bounded by `try/finally`. The detached Pinia subscription invokes a small rejection-handling wrapper instead of discarding a raw promise. The wrapper prevents unhandled rejections while leaving auth status package-owned.

The regression test will force `enterScope()` to reject through a controlled host dependency, observe that the rejection does not escape as an unhandled failure, then trigger another eligible authenticated transition and verify that scope entry is attempted again. The test must assert router-visible behavior or controlled boundary outcomes, not the private boolean.

## Redirect reconstruction boundary

`router.resolve()` produces synthetic URL-derived route data; it does not provide the target entry's persisted browser history state. Redirect restoration therefore supports only codecs reconstructible from URL route/query/hash data.

Introduce the narrowest shared route-read input accepted by `AdminRouteRegistry.fromRoute` rather than casting a synthetic resolved route to `RouteLocationNormalizedLoaded`. The registry still accepts loaded routes because they satisfy that narrow shape. During post-login restoration, codec decode/schema failures are caught and mapped to `homeDestination`. This keeps `fromRoute()` strict for normal navigation while making only the explicitly untrusted redirect boundary tolerant.

Regression coverage will include:

1. a malformed URL payload whose codec or schema throws and must fall back home;
2. a codec requiring missing history state and therefore falling back home;
3. an existing valid URL-encoded protected redirect that must still restore correctly.

## Menu typing

Use the existing public `AdminMenuTree` alias in the menu store. This deletes the `unknown[]` boundary and the `as MenuOption[]` repair in `AdminShell`; no new abstraction or validator is introduced.

## Persistence documentation

Rewrite `.trellis/spec/demo/frontend/runtime-integration-contract.md` around the factory API actually used by `apps/demo/src/main.ts`. Update `.trellis/spec/admin/frontend/runtime-contract.md` only if implementation details change a persisted package contract; avoid duplicating the demo integration narrative there.

## Compatibility and rollback

- Existing valid host metadata remains supported.
- Attempts to override `requiresAuth` become ineffective by design because that key was documented as additive metadata while authentication is package-owned.
- Existing URL codecs continue to work during normal navigation.
- Redirects dependent on history-only state deterministically fall back home; they cannot be reconstructed from a URL string.
- Each source fix is independently revertible, but R3 and R4 tests must stay coupled to their corresponding behavior.

# Implementation plan

## 1. Contract and validation

- Define typed `CreateAdminRouterOptions` and `createAdminRouter()`.
- Add tests for caller-supplied history, constrained shell/login component/path/meta overrides, additional routes, collision rejection, and preserved lower-level exports.
- Accept supported router policy explicitly; do not expose overridable `history`/`routes` through a raw options spread.

## 2. Generated records and internal components

- Add package-private login/shell components and context.
- Generate login sibling and protected shell parent with registry children plus validated additional sibling routes.
- Render `AdminLoginPage` and `AdminShell` with inner `RouterView`.
- Use Pinia `$subscribe()` for auth transitions.

## 3. Move shell dependencies into admin runtime

- Add and test non-persistent `useAdminShellMenuStore()` and `useAdminShellNavigationStore()` configuration and reactive consumption.
- Remove `AdminShell.menuOptions` and `AdminShell.navigation`; default and custom shell composition consume both stores.
- Keep the navigation store router-neutral by accepting `AdminShellNavigation`, and document one-time/unconfigured behavior.

## 4. Atomic router lifecycle

- Construct Vue Router, navigation adapter, auth guard, and scope guard in guaranteed order; configure the adapter into the supplied Pinia before shell rendering.
- Centralize redirect validation and home fallback.
- Ensure callback rejection does not navigate and cleanup removes package subscriptions/guards.
- Test deep links, login restoration, logout, public-route bypass, and history traversal/repair.

## 5. Demo cutover

- Replace demo router/runtime assembly with one `createAdminRouter()` call using caller-created history.
- Pass any host public routes through `additionalRoutes`.
- Delete demo login/shell route components, router module, navigation context, guard, redirect resolver, and adapter provisioning.
- Retain auth/menu-store configuration, scope-ID rotation, registry/pages/codecs, descriptors, providers, and mount.

## 6. Verification

```sh
pnpm --filter @noob-naive-ui/admin test
pnpm --filter @noob-naive-ui/admin typecheck
pnpm --filter @noob-naive-ui/admin build
pnpm --filter @noob-naive-ui/admin-vue-router test
pnpm --filter @noob-naive-ui/admin-vue-router typecheck
pnpm --filter @noob-naive-ui/admin-vue-router build
pnpm --filter demo typecheck
pnpm --filter demo build
```

Browser scenarios: anonymous deep link, standalone login, valid restoration, unsafe redirect fallback, authenticated login redirect, logout, additional public route, current-scope Back/Forward, stale-scope repair, and clean console.

## Risk gates

- No router import in `admin`.
- Host explicitly supplies history/base.
- Additional routes cannot overwrite generated records.
- No duplicate scope implementation.
- Lower-level APIs remain source-compatible.
- Internal route names do not collide with registry/additional names.
- Every package-owned subscription and guard has deterministic cleanup.
- Default and custom shell components receive menu and navigation state only through package-owned Pinia stores, never component props or router options.

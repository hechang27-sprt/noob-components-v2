# Frontend Runtime Contract

## Package boundary

`packages/admin/src/runtime-contract.ts` is the contract boundary. It models only rendering-relevant frontend information.

- `AdminAuthStatus` is package-owned, non-persistent Pinia presentation state: loading, anonymous, or authenticated. Hosts configure effects but do not pass or set status props.
- `AdminAuthStoreConfig.login(values)` resolves `AdminAuthIdentity` (`userLabel?`, `avatarUrl?`, `subtitle?`); package actions transition status only after login/logout callbacks succeed.
- `AdminShellNavigation` is package-owned, non-persistent Pinia runtime input: hosts configure one router-neutral controller per Pinia, and `AdminShell` reads it without a component prop.
- `AdminMenuTree` is Naive UI `MenuOption[]`; it remains an existing public alias, while `AdminShell` accepts direct starter-built `MenuOption[]` without a visibility contract.
- `AdminShellPreferences` contains frontend-local shell settings.

Keep additions frontend-ready and minimal. The public barrel exports the auth/preferences stores, presentation types, `AdminLoginPage`, and `AdminShell`; add exports intentionally rather than reaching into internals.

## AdminShell page-instance navigation contract

`AdminShell` owns ephemeral page-instance membership, visible order, indexes, pending booleans, and close fallback. The host owns routing, destination interpretation, browser history identity, and confirmed active state, supplied once through `useAdminShellNavigationStore()`.

- `AdminShellDestination` contains only durable router-neutral data: `navKey` and optional `payload: Readonly<Record<string, unknown>>`. Callers must keep `payload` a plain JSON object; this is a documented contract rather than a recursive TypeScript constraint. `payload` is application navigation data, not Vue Router path parameters or a requirement to serialize directly into browser history.
- `AdminShellTabDescriptor.id` is immutable page-instance identity. Destinations are not identity: duplicate `navKey` and payload records are valid.
- `AdminShellTab` extends the public descriptor only inside the shell with `index`, `activationPending`, and `closePending`; these mutable fields never cross the host boundary.
- `AdminShellNavigation.handleNavigation` is the sole host callback. Its discriminated request variants are `open`, `activate`, and `close`, and each carries destination-bearing snapshots.
- The host-authoritative `navigation.active` controls tab selection. The shell records confirmed descriptors by ID and never optimistically changes active state.
- Before opening, the optional second `navigate(destination, resolveTabNavigation?)` argument receives every public descriptor in visible order. Without that call-scoped resolver, the shell activates the newest matching `navKey`, ignoring payload, or opens when no match exists.
- `useAdminShell()` resolves the nearest mounted shell and returns one stable, command-only `AdminShellContext`; `navigate` uses that shell's existing destination-request path. Host-authoritative `navigation.active` remains internal shell input and is not re-exposed to descendants. The composable throws outside an `AdminShell`; the provider key stays private, and concurrent or nested shells remain isolated by Vue's hierarchical injection.
- An open candidate remains outside committed membership until the host returns the same confirmed ID. Rejection or stale completion cannot add it.
- Existing activation and close operations use exact tab-record identity and boolean pending fields. No session or pending-version counter owns committed operations.
- A plain menu key becomes `{ navKey: String(key) }`. Rich application triggers use either `useAdminShell().navigate(destination, resolveTabNavigation?)` or the compatible default scoped-slot control to supply payload and, separately, an optional resolution policy.
- Sidebar selection uses the active destination's `navKey`; unmatched keys naturally leave the opaque `MenuOption[]` unselected. There is no `menuKey` override.
- `AdminShell` is authenticated-layout-only when mounted; it reads package auth state for account presentation/logout and never renders login. `AdminLoginPage` independently reads the same store on the public login route.
- `@noob-naive-ui/admin` imports no router API. `@noob-naive-ui/admin-vue-router.createAdminRouter()` owns generated admin route records, the auth guard, the scope guard, redirect validation, and auth-transition routing. The host owns Pinia, history mode, the route registry (definitions and codecs), tab presentation, scope ID generation, home destination, and menu configuration. Scope repair bypasses routes outside the bound registry; redirect restoration falls back to `homeDestination` for non-restorable targets.

### Required tests

`packages/admin/tests/admin-shell.test.tsx` covers authenticated layout, account/logout behavior, page-instance transitions, accessibility, menus, and preferences. `admin-login-page.test.ts` and auth-store tests cover package-owned status transitions and safe callback failures.

## Required separation

The shared runtime must not import or define backend routes, request/response DTOs, transport clients, session/user models, permission payloads, TanStack Query ownership, or packaged business CRUD pages. `docs/agent/admin-runtime-contract.md` assigns those responsibilities to the starter/app.

The starter derives the final `MenuOption[]`, including visibility and hierarchy, and maps confirmed route state into `AdminShellNavigation.active`. It configures router-neutral menu/navigation stores once per Pinia; the runtime renders menu structure unchanged, requests string-keyed navigation, and must not filter visibility, normalize keys, receive route objects, or receive a router.

## Dependencies and build

`packages/admin/package.json` declares Vue, Pinia, Naive UI, and Pro Naive UI as peers; `@noob-naive-ui/ui`, `@vicons/ionicons5`, and Zod are implementation dependencies. `packages/admin/vite.config.ts` builds `src/index.ts` as an ES library with Vue JSX and Tailwind plugins, and externalizes every runtime import: those three implementation dependencies plus the four peers. Preserve this boundary when adding imports or build features.

Avoid broad Naive/Pro Naive re-exports. Import and compose primitives directly inside admin runtime components, as `packages/admin/src/components/admin-login-page.tsx` and `packages/admin/src/components/admin-shell.tsx` do.

## Verification

Type-check and build after public-contract changes. Tests must cover callback success/rejection, internal status transitions, standalone login, authenticated shell rendering, one-time/reactive navigation-store behavior, and unchanged page-instance behavior.

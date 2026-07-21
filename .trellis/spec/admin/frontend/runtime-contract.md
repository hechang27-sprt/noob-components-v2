# Frontend Runtime Contract

## Package boundary

`packages/admin/src/runtime-contract.ts` is the contract boundary. It models only rendering-relevant frontend information.

- `AdminAuthStatus` is a discriminated loading/anonymous/authenticated union, not a backend user or session.
- `AdminAuthActions` receives frontend form values through callbacks.
- `AdminMenuTree` is Naive UI `MenuOption[]`; it remains an existing public alias, while `AdminShell` accepts direct starter-built `MenuOption[]` without a visibility contract.
- `AdminShellPreferences` contains frontend-local shell settings.

Keep additions frontend-ready and minimal. The public barrel, `packages/admin/src/index.ts`, exports types, the preferences store, `AdminLoginPage`, and `AdminShell`; add exports there intentionally rather than reaching into internals.

## AdminShell page-instance navigation contract

`AdminShell` owns ephemeral page-instance membership, visible order, indexes, pending booleans, and close fallback. The host owns routing, destination interpretation, browser history identity, and confirmed active state.

- `AdminShellDestination` contains only durable router-neutral data: `navKey` and optional `Readonly<Record<string, unknown>>` parameters. Callers must keep `params` a plain JSON object suitable for browser-history serialization; this is a documented contract rather than a recursive TypeScript constraint.
- `AdminShellTabDescriptor.id` is immutable page-instance identity. Destinations are not identity: duplicate `navKey` and parameter records are valid.
- `AdminShellTab` extends the public descriptor only inside the shell with `index`, `activationPending`, and `closePending`; these mutable fields never cross the host boundary.
- `AdminShellNavigation.handleNavigation` is the sole host callback. Its discriminated request variants are `open`, `activate`, and `close`, and each carries destination-bearing snapshots.
- The host-authoritative `navigation.active` controls tab selection. The shell records confirmed descriptors by ID and never optimistically changes active state.
- Before opening, the optional second `navigate(destination, resolveTabNavigation?)` argument receives every public descriptor in visible order. Without that call-scoped resolver, the shell activates the newest matching `navKey`, ignoring parameters, or opens when no match exists.
- `useAdminShell()` resolves the nearest mounted shell and returns one stable, command-only `AdminShellContext`; `navigate` uses that shell's existing destination-request path. Host-authoritative `navigation.active` remains internal shell input and is not re-exposed to descendants. The composable throws outside an `AdminShell`; the provider key stays private, and concurrent or nested shells remain isolated by Vue's hierarchical injection.
- An open candidate remains outside committed membership until the host returns the same confirmed ID. Rejection or stale completion cannot add it.
- Existing activation and close operations use exact tab-record identity and boolean pending fields. No session or pending-version counter owns committed operations.
- A plain menu key becomes `{ navKey: String(key) }`. Rich application triggers use either `useAdminShell().navigate(destination, resolveTabNavigation?)` or the compatible default scoped-slot control to supply parameters and, separately, an optional resolution policy.
- Sidebar selection uses the active destination's `navKey`; unmatched keys naturally leave the opaque `MenuOption[]` unselected. There is no `menuKey` override.
- Loading and anonymous states render no authenticated layout. Leaving authenticated state or replacing the navigation adapter clears ephemeral membership and invalidates candidates.
- `@noob-naive-ui/admin` imports no router API. The host may persist the complete public `AdminShellTabDescriptor` in browser history, but never shell-private `AdminShellTab` fields. Destination-defining parameters must be mapped by the host into explicit URL path/query parameters and consumed as route props; descriptor `params` remain router-neutral navigation input rather than a descendant rendering-data channel.

### Required tests

`packages/admin/tests/admin-shell.test.ts` covers auth branches, candidate commit/rejection, newest-match resolution, duplicate destinations, exact-instance close, boundary cleanup, controlled tab accessibility, menu composition, and preference controls. Public-contract changes also require admin typecheck/build and demo typecheck/build/browser verification.

## Required separation

The shared runtime must not import or define backend routes, request/response DTOs, transport clients, session/user models, permission payloads, TanStack Query ownership, or packaged business CRUD pages. `docs/agent/admin-runtime-contract.md` assigns those responsibilities to the starter/app.

The starter derives the final `MenuOption[]`, including visibility and hierarchy, and maps confirmed route state into `AdminShellNavigation.active`. The runtime renders menu structure unchanged, requests string-keyed navigation, and must not filter visibility, normalize keys, receive route objects, or receive a router.

## Dependencies and build

`packages/admin/package.json` declares Vue, Pinia, Naive UI, and Pro Naive UI as peers; `@noob-naive-ui/ui`, `@vicons/ionicons5`, and Zod are implementation dependencies. `packages/admin/vite.config.ts` builds `src/index.ts` as an ES library with Vue JSX and Tailwind plugins, and externalizes every runtime import: those three implementation dependencies plus the four peers. Preserve this boundary when adding imports or build features.

Avoid broad Naive/Pro Naive re-exports. Import and compose primitives directly inside admin runtime components, as `packages/admin/src/components/admin-login-page.tsx` and `packages/admin/src/components/admin-shell.tsx` do.

## Verification

Type-check and build the package after public-contract changes. Add or update an observable test whenever a contract branch changes; `packages/admin/tests/admin-login-page.test.ts` and `packages/admin/tests/admin-shell.test.ts` demonstrate testing all auth-status variants rather than only the anonymous happy path.

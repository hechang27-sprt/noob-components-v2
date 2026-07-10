# Frontend Runtime Contract

## Package boundary

`packages/admin/src/runtime-contract.ts` is the contract boundary. It models only rendering-relevant frontend information:

- `AdminAuthStatus` is a discriminated loading/anonymous/authenticated union, not a backend user or session.
- `AdminAuthActions` receives frontend form values through callbacks.
- `AdminRouteVisibility` exposes `ReadonlySet<AdminRouteKey>` and `AdminMenuTree` is Naive UI `MenuOption[]`.
- `AdminShellPreferences` contains frontend-local shell settings.

Keep additions frontend-ready and minimal. The public barrel, `packages/admin/src/index.ts`, exports types, the preferences store, and `AdminLoginPage`; add exports there intentionally rather than reaching into internals.

## Required separation

The shared runtime must not import or define backend routes, request/response DTOs, transport clients, session/user models, permission payloads, TanStack Query ownership, or packaged business CRUD pages. `docs/agent/admin-runtime-contract.md` assigns those responsibilities to the starter/app.

The route-visibility and menu types establish the ratified seam for later Tasks 6–9; no shell or navigation renderer exists yet. When those tasks are implemented, the starter will derive `AdminAuthStatus`, `AdminMenuTree`, and `visibleRouteKeys`, while the runtime will consume those frontend-ready values. `MenuOption.key` is the canonical frontend route/menu visibility key; do not replace it with backend menu identifiers.

## Dependencies and build

`packages/admin/package.json` declares Vue, Pinia, and Naive UI as peers, while Zod is an implementation dependency. `packages/admin/vite.config.ts` builds `src/index.ts` as an ES library with Vue JSX and Tailwind plugins, and externalizes all four runtime dependencies. Preserve this boundary when adding imports or build features.

Avoid broad Naive re-exports. Import and compose Naive primitives directly inside admin runtime components, as `packages/admin/src/components/admin-login-page.tsx` does.

## Verification

Type-check and build the package after public-contract changes. Add or update an observable test whenever a contract branch changes; `packages/admin/tests/admin-login-page.test.ts` demonstrates testing all auth-status variants rather than only the anonymous happy path.

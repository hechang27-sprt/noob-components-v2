# Frontend Runtime Contract — Boundary Rules

> The **current** contract — `AdminAuthStatus`, the shell/navigation/adapter contracts, and the host/package ownership split as it exists today — is documented in the code wiki at `openwiki/packages/admin/auth.md`, `openwiki/packages/admin/overview.md`, `openwiki/packages/admin/runtime-stores.md`, `openwiki/packages/admin/shell.md`, `openwiki/packages/admin-vue-router/overview.md`, `openwiki/packages/admin-vue-router/plugin.md`, and `openwiki/packages/admin-vue-router/navigation-runtime.md`. This spec sets only the rules to follow when changing it.

## Package boundary rules

`packages/admin/src/runtime-contract.ts` is the contract boundary. It models only rendering-relevant frontend information. When changing it:

- Keep additions frontend-ready and minimal.
- The public barrel exports the auth/preferences stores, presentation types, `AdminLoginPage`, and `AdminShell`; add exports intentionally rather than reaching into internals.
- Never import or define backend routes, request/response DTOs, transport clients, session/user models, permission payloads, TanStack Query ownership, or packaged business CRUD pages in the admin package. Those responsibilities belong to the host application (see `docs/adr/0001-separate-shell-router-and-host-ownership.md`).
- `AdminShell` is authenticated-layout-only when mounted; it reads package auth state for account presentation/logout and never renders login. `AdminLoginPage` independently reads the same store on the public login route.
- `@noob-naive-ui/admin` imports no router API.

## Dependencies and build rules

- `packages/admin/package.json` declares Vue, Vue I18n, Pinia, Naive UI, and Pro Naive UI as peers; `@noob-naive-ui/ui`, `@vicons/ionicons5`, and Zod are implementation dependencies.
- Follow the shared workspace dependency policy: ecosystem-wide runtime versions use `catalog:`, and the workspace root owns the Vue I18n build plugin.
- `packages/admin/vite.config.ts` builds `src/index.ts` as an ES library with Vue JSX and Tailwind plugins, and externalizes every runtime import: those three implementation dependencies plus the five peers. Preserve this boundary when adding imports or build features.
- Avoid broad Naive/Pro Naive re-exports. Import and compose primitives directly inside admin package components.

## Required separation

The admin package must not import or define backend routes, request/response DTOs, transport clients, session/user models, permission payloads, TanStack Query ownership, or packaged business CRUD pages. The shell/router/host ownership decision (`docs/adr/0001-separate-shell-router-and-host-ownership.md`) assigns those responsibilities to the host application.

The host application derives the final `MenuOption[]`, including visibility and hierarchy, and maps confirmed route state into `AdminShellNavigation.active`. It configures router-neutral menu/navigation stores once per Pinia; the Admin shell renders menu structure unchanged, requests string-keyed navigation, and must not filter visibility, normalize keys, receive route objects, or receive a router.

## Verification

Type-check and build after public-contract changes. Tests must cover callback success/rejection, internal status transitions, standalone login, authenticated shell rendering, one-time/reactive navigation-store behavior, and unchanged page-instance behavior.

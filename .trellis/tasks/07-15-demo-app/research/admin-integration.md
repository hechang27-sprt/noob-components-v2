# Demo integration research

## Repository state

- `apps/admin-starter/package.json` is intentionally a manifest-only stub. It is not an application pattern and must remain untouched.
- `pnpm-workspace.yaml` enumerates workspaces; `apps/demo` needs an explicit entry.
- The root declares `pnpm@11.12.0`; the repository has no Bun lockfile.
- Vue Router is not presently a workspace dependency and must be a direct demo dependency.

## Public runtime contract

- `@noob-naive-ui/admin` is the only package providing the login UI: its public barrel exports `AdminLoginPage`, `AdminShell`, runtime types, and `useAdminShellPreferencesStore`.
- The demo consumes `AdminShell` with frontend-ready `AdminAuthStatus`, `AdminAuthActions`, direct Naive `MenuOption[]`, and an optional `AdminShellTabController`.
- The demo owns router setup, route definitions, final router-aware menu labels, the router view passed through the default slot, and tab-controller callbacks.
- `AdminShell` must not receive a router, backend/session model, transport client, route-selection callback, menu visibility data, or storage adapter.
- The shell passes the exact menu array to `NMenu`; it does not navigate or determine active menu state.
- `tabController.current` must be reactive. The shell watches it to record visited route tabs. The controller callbacks await application-owned navigation; shell membership remains shell-local.
- The public shell header does not provide logout. The demo must expose an application-owned sign-out control in default-slot content.

## Demo policy

The demo begins anonymous. Its in-memory login callback rejects blank/whitespace-only credentials and otherwise authenticates with the trimmed username as the frontend user label. It performs no network request and has no backend-like persistence, DTO, token, or fake client.

## Sources

- `.trellis/spec/admin/frontend/runtime-contract.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`
- `docs/adr/0001-separate-shell-router-and-host-ownership.md`
- `packages/admin/src/index.ts`
- `packages/admin/src/runtime-contract.ts`
- `packages/admin/src/components/admin-shell.tsx`
- `packages/admin/src/components/admin-login-page.tsx`
- `packages/admin/tests/admin-shell.test.ts`
- `packages/admin/tests/admin-login-page.test.ts`

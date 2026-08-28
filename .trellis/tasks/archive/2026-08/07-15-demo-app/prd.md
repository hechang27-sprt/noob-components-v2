# Add backend-free demo application

## Goal

Provide a runnable `apps/demo` application that demonstrates the intended starter boundary: a frontend-only login flow, a starter-owned router and menu tree, and the public `@noob-naive-ui/admin` shell. It must not require or simulate a transport backend.

## Confirmed facts

- `apps/admin-starter` is intentionally an unscaffolded manifest-only placeholder; it provides no app implementation to copy.
- `@noob-naive-ui/admin` exposes `AdminLoginPage`, `AdminShell`, frontend-ready `AdminAuthStatus` / `AdminAuthActions`, and accepts starter-built Naive UI `MenuOption[]`.
- The application—not the shared admin package—owns authentication state, route registration, router-aware menu labels, and content passed through the shell default slot.
- `AdminShell` does not receive a router, backend DTO, session model, route object, transport client, or route-selection callback.
- `pnpm-workspace.yaml` enumerates packages explicitly, so `apps/demo` must be added for filtering and workspace linking to work.
- Root scripts use pnpm; the workspace has no Bun lockfile.

## Requirements

1. Add `apps/demo` as a private workspace application with local `dev`, `build`, and `typecheck` commands.
2. Compose the demo through public `@noob-naive-ui/admin` exports and direct application dependencies only; do not reach into `packages/*/src`.
3. Start at the packaged anonymous login UI. Its application-owned, in-memory callback accepts only a trimmed non-empty username and password, then displays the entered username in the authenticated shell. It makes no HTTP call.
4. Register a small set of local demonstration routes and construct the exact router-aware `MenuOption[]` tree in the demo.
5. Supply the router view through `AdminShell`'s default slot. Exercise the optional tab-controller seam with application-owned current-route descriptors and navigation callbacks.
6. Keep all auth state in memory. Do not add backend endpoints, DTOs, fake API clients, token handling, persistence, or session restoration.
7. Provide an application-owned sign-out control within the shell's default-slot content because the current public `AdminShell` header has no logout control.
8. Initialize the public preference store and provide runtime locale options so existing shell controls are demonstrable.

## Acceptance criteria

- [ ] `pnpm --filter demo dev` starts the Vite application from a clean workspace state.
- [ ] A browser can submit non-empty login values and reach the authenticated shell with no application API request.
- [ ] Blank or whitespace-only credentials remain rejected by the packaged login error presentation.
- [ ] The sidebar navigates among local demo routes; the current route renders inside the shell default slot.
- [ ] Visiting a route opens/activates its shell tab. Activating or closing a tab leaves the route and visible tab state aligned.
- [ ] Sign out returns to the login UI. Theme, font, locale, and sidebar controls remain runtime-owned through `@noob-naive-ui/admin`.
- [ ] `pnpm --filter demo typecheck` and `pnpm --filter demo build` pass.

## Out of scope

- Implementing or replacing the real `apps/admin-starter` template.
- Backend endpoints, request/response DTOs, authentication tokens, persistence, or session restoration.
- Changes to the public `@noob-naive-ui/admin` or `@noob-naive-ui/ui` contracts.
- Changing root `dev`, which intentionally remains the explicit `admin-starter` stub entry point.

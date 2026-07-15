# Implementation plan: backend-free demo application

## 1. Register and scaffold the workspace application

- Add explicit `apps/demo` registration to `pnpm-workspace.yaml`.
- Create the demo manifest, Vite config, TypeScript config, and HTML entrypoint.
- Declare direct runtime peer dependencies and the local Vite/TSX build dependencies; generate lockfile changes with pnpm.
- Add `predev`, `prebuild`, and `pretypecheck` package build hooks so every focused demo command consumes the admin package's public JavaScript, CSS, and declaration output.

**Acceptance:** `pnpm --filter demo typecheck` locates the app and resolves its workspace package imports from a clean checkout.

## 2. Implement the frontend-only application assembly

- Add `main.ts` to install Pinia and Vue Router, initialize the public shell-preferences store, seed runtime locale options, and mount the app.
- Add the local route registry and static route components with stable paths, tab labels, and closability.
- Add `App.tsx` with in-memory authentication, non-empty input validation, `AdminShell` public composition, a router-aware `MenuOption[]`, reactive tab controller, default-slot router content, and sign out.
- Bind the existing preference store to a Naive theme/font provider without adding a second preference or persistence path.

**Acceptance:** the type checker accepts the public-only package integration and no demo module contains a backend, DTO, fake client, or storage adapter.

## 3. Validate the executable user flow

- Run the focused admin package tests that define the integration contract.
- Run demo typecheck and production build.
- Start `pnpm --filter demo dev`; use a real browser to verify:
  - whitespace-only credentials produce the packaged generic login error;
  - non-empty credentials show the authenticated shell under the entered label;
  - menu links navigate to each local route in the shell default slot;
  - visiting, activating, and closing tabs keeps the active route aligned;
  - sign out returns to login;
  - the theme, font, locale, and sidebar controls update their app/runtime state;
  - console has no errors and the network contains no application API request.

**Acceptance:** all PRD acceptance criteria are observed or command-verified.

## Risk points

| Risk | Mitigation |
| --- | --- |
| A focused app command cannot resolve the library's `dist` public export. | Build `@noob-naive-ui/admin` in `predev` and `prebuild`; do not alias internal source files. |
| The tab controller captures an initial route only. | Use a stable controller object whose `current` getter derives from Vue Router's reactive active route. |
| A second preference implementation drifts from runtime behavior. | Use only `useAdminShellPreferencesStore`; initialize and mutate through its public actions. |
| Theme controls change state but not visual configuration. | Read the public store reactively in a surrounding Naive configuration provider. |
| Login grows fake backend semantics. | Keep validation to trimmed non-empty input; no HTTP, token, session, DTO, or persistence code. |

## Rollback

The implementation is additive. Revert the workspace entry, `apps/demo`, and pnpm-generated lockfile changes as one change set.

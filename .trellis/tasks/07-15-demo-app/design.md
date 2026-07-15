# Design: backend-free demo application

## Architecture

`apps/demo` is an independent Vue 3/Vite TSX workspace application. It proves package integration; it is not the deferred `apps/admin-starter` implementation and it does not change either shared package.

```mermaid
flowchart LR
  Login[AdminLoginPage inside AdminShell] -->|AdminLoginValues| DemoAuth[Demo in-memory auth callback]
  DemoAuth -->|AdminAuthStatus| Shell[AdminShell]
  DemoRoutes[Demo route registry] -->|router-aware MenuOption[]| Shell
  DemoRoutes -->|current route descriptor / async navigation| Tabs[AdminShell tab controller]
  RouterView[RouterView plus demo sign-out control] -->|default slot| Shell
  Preferences[Public preference store] -->|theme/font/locale state| Provider[Naive config provider]
```

## Boundaries

- The demo imports `AdminShell`, `useAdminShellPreferencesStore`, and all admin contracts solely from `@noob-naive-ui/admin`.
- The demo owns Vue Router setup, route components, the exact menu tree, current tab descriptor, tab navigation callbacks, auth state, and sign out.
- `AdminShell` receives only its public frontend-ready props and a default slot. It receives no router, menu-selection callback, storage adapter, session object, backend-shaped data, or transport client.
- No app-level auth store or fake API module is created. A single in-memory `ref<AdminAuthStatus>` in `App.tsx` is the complete authentication model.
- The existing public preference store remains the one owner for preference state and persistence. The demo initializes it and consumes its reactive values through Naive UI configuration; it does not parse or write browser storage.

## Login and session behavior

The initial auth state is `{ kind: "anonymous" }`. The async `login` callback trims both submitted values and rejects when either is empty. On success it changes auth state to `{ kind: "authenticated", userLabel }` and routes to the home page. It performs no I/O. `logout` routes home and changes state to `{ kind: "anonymous", reason: "signed-out" }`.

The `AdminLoginPage` is not imported directly: the demo exercises the normal `AdminShell` anonymous branch, which delegates to the packaged login UI. This keeps the demonstration on the consumer contract rather than duplicating login composition.

## Routes, menu, and tabs

`routes.tsx` is the single route registry. Each route has a stable path/name, human label, and closability; home is non-closable. It also contains simple page components with realistic demo copy.

`App.tsx` constructs one stable `MenuOption[]` using router-aware `RouterLink` labels. The exact array is passed unchanged to `AdminShell`; menu interaction is ordinary router-link navigation, not a shell callback.

A stable `AdminShellTabController` has a reactive `current` getter derived from the active route. Its `activate` callback awaits `router.push(key)`. Its `close` callback awaits navigation to the shell-suggested next route, or home when no suggestion exists. The controller does not recreate or mirror the shell's visible tab list: tab membership and ordering remain shell-local by contract. This lets the shell watch the reactive current descriptor, record each visited route, and remove a tab only after close resolves.

The default slot provides an application-owned `RouterView` and an accessible sign-out `NButton`. Sign out is intentionally located in application content because the existing `AdminShell` public header has no logout seam.

## Shell preferences

`main.ts` installs a fresh Pinia instance, initializes the exported preference store, and supplies English and Chinese locale options. `App.tsx` reads that store reactively and provides Naive UI theme/font configuration around the shell. Light, dark, and system modes map to the browser color preference; small, medium, and large map to a bounded font-size override. This consumes application-visible preferences without adding a second store or persistence path.

## Tooling and dependency shape

The demo uses the same TSX compiler model as `@noob-naive-ui/admin`: Vite plus `@vitejs/plugin-vue-jsx`, with a local TypeScript config extending the root config. Its direct runtime dependencies are Vue, Vue Router, Pinia, Naive UI, Pro Naive UI, and workspace `@noob-naive-ui/admin`; build dependencies are Vite, TypeScript, and the JSX plugin.

`pnpm-workspace.yaml` gains the explicit `apps/demo` entry. The demo's `predev`, `prebuild`, and `pretypecheck` build the workspace admin package first, so the public JavaScript, CSS, and declaration targets exist for each focused demo command from a clean checkout. `pnpm` generates the lockfile update.

## Validation and rollback

- Type-check and production-build the demo through its local scripts.
- Run the admin package's existing focused tests to guard the package contract the demo consumes.
- Start the demo in a real browser; verify login success/failure, local navigation, reactive tabs, sign out, preferences, console cleanliness, and absence of app API requests.
- The change is additive: removing `apps/demo`, its workspace entry, and pnpm-generated lockfile entries returns the repository to its previous application state.

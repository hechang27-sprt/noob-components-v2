# Task 6 contract and ownership findings

## Task source of truth

- `docs/agent/plan.md` Task 6 (lines 290 onward) is the only detailed Task 6 brief currently present. The task PRD (`.trellis/tasks/07-10-admin-shell-runtime-controls/prd.md`) is still all `TBD`, and `task.py current --source` reports no active task; do not treat the PRD as additional requirements.
- Task 6 description: build the shell frame (header, sidebar container, content slot, theme controls, language controls, auth-state-aware top-level layout switching), while stopping short of route visibility filtering.
- Inputs named by the plan: Task 4 shell-preferences store, Task 5 login/auth primitives, and Task 3 shell-facing contract types.
- Acceptance criteria named by the plan:
  1. `AdminShell` renders loading, anonymous, and authenticated top-level layouts without backend awareness.
  2. Shell controls read/write the runtime preferences store.
  3. Route content remains starter-owned through slots/props; no packaged business pages.
- Planned verification: admin package build and typecheck, plus a package-level demo harness or targeted component test that switches loading/login/authenticated layouts and exercises theme/locale/sidebar controls.

## Ratified package boundary

`docs/agent/admin-runtime-contract.md` and `.trellis/spec/admin/frontend/runtime-contract.md` are the boundary authority:

- `@noob-naive-ui/admin` is a frontend-only shell/runtime. It may render shell/header/sidebar/login/theme/language UI and apply frontend-ready state.
- It must not define/import backend DTOs, sessions/users, permission payloads, transport clients, backend route/menu DTOs, query ownership, or packaged CRUD/business pages.
- The future starter/app owns app assembly, route registry, domain pages, transport/query/auth/session/logout behavior, and mapping backend state into frontend-ready values.
- `AdminAuthStatus` is intentionally a discriminated union of `{ kind: "loading" }`, `{ kind: "anonymous"; reason?: "signed-out" | "expired" | "forbidden" | "unknown" }`, and `{ kind: "authenticated"; userLabel?: string; avatarUrl?: string; subtitle?: string }`. No session/token/user object may cross into `AdminShell`.
- `AdminAuthActions` is `{ login(values: AdminLoginValues): Promise<void>; logout(): Promise<void> | void }`; `AdminShell` and `AdminLoginPage` consume callbacks, never transports.
- `AdminShellPreferences` is frontend-local state: `themeMode: "light" | "dark" | "system"`, `fontSize: "small" | "medium" | "large"`, `locale: string`, `availableLocales: AdminLocaleOption[]` (`{ key: string; label: string }`), and `sidebarCollapsed: boolean`.
- The route/menu seam exists but is explicitly out of Task 6: `AdminRouteVisibility.visibleRouteKeys: ReadonlySet<AdminRouteKey>` and `AdminMenuTree = MenuOption[]`, with `MenuOption.key` as the canonical frontend key. Do not add filtering/route registry behavior to the frame.

## Public API implications

Current public barrel `packages/admin/src/index.ts` exports runtime contract types, `useAdminShellPreferencesStore`, and `AdminLoginPage`/`AdminLoginPageProps`; no shell or control exports exist yet. `.trellis/spec/admin/frontend/runtime-contract.md` requires intentional explicit additions to this barrel and forbids reaching into internals or broad Naive UI re-exports. The architecture document lists `AdminShell`, `AdminNavigation`, `AdminThemeControls`, and `AdminLanguageControls` as possible exports, but does not ratify their prop signatures. Any new public component export needs an intentional, frontend-ready prop contract.

## Starter status

`apps/admin-starter/package.json` is the entire starter; it has only a `dev` script that prints `admin-starter is not scaffolded yet`. `.trellis/spec/admin-starter/frontend/current-state-and-ownership.md` says there is no app entrypoint/router/Tailwind/Pinia/auth/navigation implementation yet. Therefore Task 6 must expose a slot/prop seam usable later by the starter, but must not infer or document a starter component layout or use starter imports.

## Explicit non-goals / design risks

- Do not implement `visibleRouteKeys` filtering or route/menu derivation in this task; that is Task 7 and starter-owned route registry work is Tasks 8–9.
- Do not make `AdminShell` fetch auth, call APIs, inspect backend permissions, or own session restoration.
- Do not ship packaged business content. Authenticated content should arrive through the shell's starter-owned slot/props.
- The docs mention “header” and “sidebar container” but do not define exact DOM, Naive primitive, slots, or props. Those are implementation decisions and should be kept minimal and observable in tests.
- “Theme controls” is ratified as preference mutation; no contract currently says that Task 6 must apply global Naive theme overrides. The only existing theme bridge is `packages/ui/src/theme/naive.ts` (`NoobNaiveThemeBridge`, `defineNoobNaiveThemeBridge`, `toNoobNaiveThemeOverrides`) and it is not exported/consumed by `packages/admin` today.

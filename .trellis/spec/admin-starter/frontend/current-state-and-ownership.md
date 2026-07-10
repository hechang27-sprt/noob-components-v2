# Current State and Ownership

## Current implementation

`apps/admin-starter/package.json` is the entire starter. It is private `admin-starter@0.0.0` and its only script prints `admin-starter is not scaffolded yet`. There is no `src/`, Vite config, TypeScript config, router, Tailwind setup, Pinia setup, auth module, navigation module, or view.

Until the starter is scaffolded, do not document or rely on an app entrypoint, component convention, or build/typecheck command. `pnpm --filter admin-starter dev` is the only focused behavior check.

## Ratified ownership for Tasks 8–9

When implementation begins, the starter owns app assembly and all backend-specific concerns: transport/API clients, query/server state, login/session/logout behavior, mapping backend information into frontend-ready inputs, route registry, domain pages, and construction of the final `MenuOption[]` (visibility, hierarchy, and router-aware link/rendered-label content). Sources: `docs/agent/admin-runtime-contract.md` and `tasks/plan.md` Tasks 8–9.

The starter consumes `@noob-naive-ui/ui` and `@noob-naive-ui/admin` through their public exports. It uses Naive UI directly for commodity controls and app-level provider assembly; `@noob-naive-ui/ui` is reserved for value-add components and theme helpers.

## Boundary failures

Do not:

- put backend DTOs, session models, permission payloads, transport clients, or route registries into `@noob-naive-ui/admin`;
- resurrect a packaged route/page catalog or root-monolith imports;
- create Naive UI wrapper parity in either shared package;
- claim the current stub script proves a runnable application.

## Verification after scaffolding

Tasks 8–9 require package-local `build` and `typecheck` commands, a dev-server smoke test, and browser verification of login, shell rendering, the starter-built menu, open tabs, and preference persistence. Add concrete local patterns to this spec only after those tasks land.

# Current State and Ownership

## Current implementation

`apps/admin-starter/package.json` is the entire starter. It is private `admin-starter@0.0.0` and its only script prints `admin-starter is not scaffolded yet`. There is no `src/`, Vite config, TypeScript config, router, Tailwind setup, Pinia setup, auth module, navigation module, or view.

Until the starter is scaffolded, do not document or rely on an app entrypoint, component convention, or build/typecheck command. `pnpm --filter admin-starter dev` is the only focused behavior check.


## Boundary failures

Do not:

- put backend DTOs, session models, permission payloads, transport clients, or route registries into `@noob-naive-ui/admin`;
- resurrect a packaged route/page catalog or root-monolith imports;
- create Naive UI wrapper parity in either shared package;
- claim the current stub script proves a runnable application.

## Verification

`pnpm --filter admin-starter dev` is the only current focused behavior check. Add concrete build, typecheck, and runtime guidance only when the starter is implemented.

# Current State and Ownership — Boundary Rules

> The **current** scaffold state of `apps/admin-starter` — what exists today and what does not — is documented in the code wiki at `openwiki/apps/admin-starter.md`. This spec sets only the boundary rules to follow when implementing it.

## Boundary failures

Do not:

- put backend DTOs, session models, permission payloads, transport clients, or route registries into `@noob-naive-ui/admin`;
- resurrect a packaged route/page catalog or root-monolith imports;
- create Naive UI wrapper parity in either shared package;
- claim a stub script proves a runnable application.

## Verification

`pnpm --filter admin-starter dev` is the only current focused behavior check. Add concrete build, typecheck, and runtime guidance only when the starter is implemented.

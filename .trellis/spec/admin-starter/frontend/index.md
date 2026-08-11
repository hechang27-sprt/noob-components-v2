# `admin-starter` Frontend Guidelines

`apps/admin-starter` is the planned starter template. Its current scaffold state is documented in the code wiki at `openwiki/apps/admin-starter.md`; this spec sets only the rules to follow when implementing it.

## Pre-Development Checklist

Before implementing the starter, read:

1. [Boundary Failures](./current-state-and-ownership.md)
2. Do not infer implementation conventions beyond what the current state establishes.

## Boundary Rules

Do not:

- put backend DTOs, session models, permission payloads, transport clients, or route registries into `@noob-naive-ui/admin`;
- resurrect a packaged route/page catalog or root-monolith imports;
- create Naive UI wrapper parity in either shared package;
- claim a stub script proves a runnable application.

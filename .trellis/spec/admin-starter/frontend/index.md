# `admin-starter` Frontend Guidelines

The starter is deliberately not scaffolded yet. Its only implementation is `apps/admin-starter/package.json`, whose `dev` script prints a stub message. Do not treat it as a Vue application or invent source-layout conventions before Tasks 8–9 are implemented.

## Pre-Development Checklist

Before starting the starter implementation, read:

1. [Current State and Ownership](./current-state-and-ownership.md)
2. Do not infer implementation conventions beyond the current stub.

## Guides

| Guide                                                           | Use it for                                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Current State and Ownership](./current-state-and-ownership.md) | starter scaffolding, backend integration, routes, auth, and navigation derivation |

## Quality Check

Current verification proves only the stub:

```sh
pnpm --filter admin-starter dev
```

`build` and `typecheck` scripts do not exist yet. Root recursive commands use `--if-present`, so they cannot validate the unscaffolded starter.

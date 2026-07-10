# `@noob-naive-ui/admin` Frontend Guidelines

`@noob-naive-ui/admin` is a frontend-only shell/runtime library. Its current source contains runtime contracts, a persisted shell-preferences Pinia store, and a TSX login page.

## Pre-Development Checklist

Before changing this package, read:

1. [Frontend Runtime Contract](./runtime-contract.md) for every public API or package-boundary change.
2. [Shell Preferences State](./shell-preferences.md) for storage, Zod normalization, or Pinia changes.
3. [TSX Components and Tests](./tsx-components-and-tests.md) for component or test changes.
4. `docs/agent/admin-runtime-contract.md` for the ratified package-versus-starter ownership boundary.

## Guides

| Guide                                                     | Use it for                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| [Frontend Runtime Contract](./runtime-contract.md)        | exports, auth/navigation inputs, and backend-boundary review |
| [Shell Preferences State](./shell-preferences.md)         | preferences schemas, persistence, and Pinia store behavior   |
| [TSX Components and Tests](./tsx-components-and-tests.md) | Vue TSX components, accessibility, and Vitest DOM tests      |

## Quality Check

```sh
pnpm --filter @noob-naive-ui/admin typecheck
pnpm --filter @noob-naive-ui/admin test
pnpm --filter @noob-naive-ui/admin build
```

Confirm the public barrel at `packages/admin/src/index.ts` exports only frontend runtime API and that package output leaves `vue`, `pinia`, `naive-ui`, and `zod` external.

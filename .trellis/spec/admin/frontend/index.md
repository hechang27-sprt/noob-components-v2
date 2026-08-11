# `@noob-naive-ui/admin` Frontend Guidelines

`@noob-naive-ui/admin` is a frontend-only shell/runtime library. The current source layout and contract shape are documented in the code wiki at `openwiki/packages/admin/`; this index sets the pre-development checklist and quality gate.

## Pre-Development Checklist

Before changing this package, read:

1. [Frontend Runtime Contract](./runtime-contract.md) for every public API or package-boundary change.
2. [Shell Preferences State](./shell-preferences.md) for storage, Zod normalization, or Pinia changes.
3. [TSX Components and Tests](./tsx-components-and-tests.md) for component or test changes.
4. [Shell/router/host ownership decision](../../../../docs/adr/0001-separate-shell-router-and-host-ownership.md) for the boundary rationale and the [current integration contract](../../../../docs/adr/0002-admin-shell-router-host-contract.md) for exact responsibilities and runtime flow.
5. [Component-Library Vue I18n Contract](../../ui/frontend/library-i18n-contract.md) before adding package-owned localized component text.

## Guides

| Guide                                                     | Use it for                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| [Frontend Runtime Contract](./runtime-contract.md)        | exports, auth/navigation inputs, and backend-boundary review |
| [Shell Preferences State](./shell-preferences.md)         | preferences schemas, persistence, and Pinia store behavior   |
| [TSX Components and Tests](./tsx-components-and-tests.md) | Vue TSX components, accessibility, and Vitest DOM tests      |
| [Component-Library Vue I18n Contract](../../ui/frontend/library-i18n-contract.md) | Local Composers, package overrides, fallback isolation, JSON precompilation, declaration typing |

## Quality Check

```sh
pnpm --filter @noob-naive-ui/admin typecheck
pnpm --filter @noob-naive-ui/admin test
pnpm --filter @noob-naive-ui/admin build
```

Confirm the public barrel at `packages/admin/src/index.ts` exports only frontend runtime API and that package output leaves `vue`, `pinia`, `naive-ui`, and `zod` external.

# `@noob-naive-ui/ui` Frontend Guidelines

`@noob-naive-ui/ui` is currently a narrow ESM library containing only a Naive UI theme bridge. It is not a component collection or a backend layer.

## Pre-Development Checklist

Before changing this package, read:

1. [Library Boundary and Build](./library-conventions.md)
2. [Library Boundary and Build](./library-conventions.md) before adding a specialized component or migration-facing API.

## Guides

| Guide                                                  | Use it for                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [Library Boundary and Build](./library-conventions.md) | Public exports, Naive peer integration, theme bridge changes, library build/type verification |

## Quality Check

- `pnpm --filter @noob-naive-ui/ui typecheck`
- `pnpm --filter @noob-naive-ui/ui build`
- Confirm `src/index.ts` remains the deliberate public surface and Vite keeps `naive-ui` and `vue` external.

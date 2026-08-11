# `@noob-naive-ui/ui` Frontend Guidelines

`@noob-naive-ui/ui` is the workspace's home for reusable frontend components and library value-add. It currently ships no reusable component yet; adding one is expected, not forbidden. It is not a backend layer. Its current shape is documented in the code wiki at `openwiki/packages/ui.md`; this index sets the pre-development checklist and quality gate.

## Pre-Development Checklist

Before changing this package, read:

1. [Library Boundary and Build](./library-conventions.md)
2. [Component-Library Vue I18n Contract](./library-i18n-contract.md) before adding package-owned localized component text.

## Guides

| Guide                                                  | Use it for                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [Library Boundary and Build](./library-conventions.md) | Public exports, Naive peer integration, library build/type verification |
| [Component-Library Vue I18n Contract](./library-i18n-contract.md) | Local Composers, package overrides, fallback isolation, JSON precompilation, declaration typing |

## Quality Check

- `pnpm --filter @noob-naive-ui/ui typecheck`
- `pnpm --filter @noob-naive-ui/ui build`
- Confirm `src/index.ts` remains the deliberate public surface and Vite keeps `naive-ui` and `vue` external.

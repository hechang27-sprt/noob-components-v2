# Thinking Guides

Use these cross-package checks in addition to the package frontend guide that applies to the change.

## Guides

| Guide                                                         | Read when                                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [Code Reuse Thinking Guide](./code-reuse-thinking-guide.md)   | Adding a helper, store, export, or second implementation of an existing behavior                             |
| [Cross-Layer Thinking Guide](./cross-layer-thinking-guide.md) | Changing package boundaries, storage hydration/persistence, injected callbacks, or starter/runtime data flow |

## Project triggers

Read the code-reuse guide before creating an internal shared package, a second preferences path, or a new public barrel export.

Read the cross-layer guide before changing any of these contracts:

- `AdminAuthStatus`, `AdminAuthActions`, or `AdminMenuTree`;
- shell-preferences schema, storage adapter, or persistent fields;
- starter-owned auth, route, or navigation derivation;
- the Naive theme bridge consumed by an application.

The current starter has not been scaffolded. Use its [current-state spec](../admin-starter/frontend/current-state-and-ownership.md) and do not infer application behavior from planned work.

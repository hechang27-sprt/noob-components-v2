# Cross-Layer Thinking Guide

Use this guide when a change crosses package, storage/runtime, or application/runtime boundaries.

## Boundaries in this workspace

| Boundary                                    | Owner                                     | Contract                                                                                                                     |
| ------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Future starter/app → `@noob-naive-ui/admin` | Starter will derive frontend-ready values | `AdminAuthStatus`, `AdminAuthActions`, direct `MenuOption[]`, and optional shell tab controller |
| Browser storage → admin runtime             | Runtime parsing helper                    | `packages/admin/src/runtime/shell-preferences.ts` normalizes `unknown` with Zod before Pinia sees it                         |
| Admin runtime → component                   | Component props and callbacks             | `AdminLoginPageProps` in `packages/admin/src/components/admin-login-page.tsx`                                                |
| Future app → `@noob-naive-ui/ui`            | App will consume a narrow library API     | `NoobNaiveThemeBridge` from `packages/ui/src/theme/naive.ts`                                                                 |

The starter, shell, and navigation renderer are not scaffolded yet. Their ownership is ratified in `docs/agent/admin-runtime-contract.md` and `tasks/plan.md`; do not claim an unimplemented transport, router, query, shell, or navigation pattern as current code.

## Runtime/starter contract

`@noob-naive-ui/admin` already defines the frontend-ready contract but currently implements only the login page and shell-preferences state. Tasks 6–9 must keep backend DTOs, sessions, permission payloads, transport clients, and route registries in the starter/app. The shared runtime will consume mapped frontend values.

For planned navigation, the starter creates the final `MenuOption[]`, including visibility and router-aware label/link content. The runtime renders the tree unchanged; do not add route-key matching, `visibleRouteKeys`, a second backend-derived key, or a parallel menu-node contract.

## Storage/state contract

Persisted preferences are untrusted input. Keep their parsing and normalization in the one owning boundary module, `packages/admin/src/runtime/shell-preferences.ts`: `loadAdminShellPreferences` validates the persisted subset, merges defaults, then normalizes the complete runtime preferences before initializing `useAdminShellPreferencesStore`. Only the documented persistent subset—theme mode, font size, locale, and sidebar collapsed—crosses into storage; locale options remain runtime state.

When changing this path, trace both directions:

```text
Initialization defaults + storage -> Zod normalization -> Pinia store -> component state
Store mutation -> detached subscription -> persisted preference subset
```

`packages/admin/tests/shell-preferences.test.ts` covers valid hydration, malformed persistence, and storage failure. Extend those observable cases when the boundary changes.

## Component/action contract

`AdminLoginPage` owns form UX, accessible status feedback, and pending-state protection. Its injected `login` callback owns the actual authentication work. A rejection produces a generic UI error; raw transport details must not cross this boundary.

When adding an async action, specify who owns:

- input validation and normalization;
- pending/retry/error UI;
- business or transport execution;
- the frontend-ready result consumed by the shared runtime.

## Before commit

- [ ] Named each changed boundary and its owning package.
- [ ] Kept backend-shaped data in the starter/app rather than the admin runtime.
- [ ] Kept persisted or external parsing in its owning boundary module.
- [ ] Tested both success and failure behavior at the observable boundary.
- [ ] Updated the relevant runtime contract and package test when the shape changed.

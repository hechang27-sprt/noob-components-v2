# Cross-Layer Thinking Guide

Use this guide when a change crosses package, storage/runtime, or application/runtime boundaries.

## Boundaries in this workspace

| Boundary | Owner | Contract |
| --- | --- | --- |
| Host application → `@noob-naive-ui/admin` | Host application | Frontend-ready auth configuration, direct `MenuOption[]`, route registry, and router-neutral destinations |
| Browser storage → Admin shell | Runtime parsing helper | `packages/admin/src/runtime/shell-preferences.ts` normalizes `unknown` with Zod before Pinia sees it |
| Admin shell → component | Component props and stores | Public contracts under `packages/admin/src` |
| Host application → `@noob-naive-ui/ui` | Host application | Narrow value-add library API such as `NoobNaiveThemeBridge` |

## Shell/router/host contract

The Admin shell is backend-free and router-neutral. The admin router runtime owns Vue Router and browser-history coordination. The host application owns authentication effects, backend integration, route definitions, menu policy, and business pages. See the [ownership decision](../../../docs/adr/0001-separate-shell-router-and-host-ownership.md).

The host application creates the final `MenuOption[]`, including visibility and hierarchy. The Admin shell renders the tree unchanged; do not add route-key matching, `visibleRouteKeys`, a second backend-derived key, or a parallel menu-node contract.

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

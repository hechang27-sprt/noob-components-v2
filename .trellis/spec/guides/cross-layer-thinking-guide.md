# Cross-Layer Thinking Guide

Use this guide when a change crosses package, storage/runtime, or application/runtime boundaries.

> The **current** boundary ownership — who owns each contract (host→admin, storage→shell, admin→component, host→ui), the shell/router/host split, and the storage/state contract as it exists today — is documented in the code wiki at `openwiki/architecture/overview.md` and `openwiki/architecture/ownership-contract.md` plus the package pages. This guide sets only the rules to follow when changing across a boundary.

## Rules when crossing a boundary

- The Admin shell is backend-free and router-neutral. The admin router runtime owns Vue Router and browser-history coordination. The host application owns authentication effects, backend integration, route definitions, menu policy, and business pages.
- The host application creates the final `MenuOption[]`, including visibility and hierarchy. The Admin shell renders the tree unchanged; do not add route-key matching, `visibleRouteKeys`, a second backend-derived key, or a parallel menu-node contract.
- Persisted preferences are untrusted input. Keep their parsing and normalization in the one owning boundary module, `packages/admin/src/runtime/shell-preferences.ts`. Only the documented persistent subset crosses into storage; locale options remain runtime state.
- When changing the storage path, trace both directions:

```text
Initialization defaults + storage -> Zod normalization -> Pinia store -> component state
Store mutation -> detached subscription -> persisted preference subset
```

- `AdminLoginPage` owns form UX, accessible status feedback, and pending-state protection. Its injected `login` callback owns the actual authentication work. A rejection produces a generic UI error; raw transport details must not cross this boundary.
- When adding an async action, specify who owns: input validation and normalization; pending/retry/error UI; business or transport execution; the frontend-ready result consumed by the shared runtime.

## Before commit

- [ ] Named each changed boundary and its owning package.
- [ ] Kept backend-shaped data in the starter/app rather than the admin runtime.
- [ ] Kept persisted or external parsing in its owning boundary module.
- [ ] Tested both success and failure behavior at the observable boundary.
- [ ] Updated the relevant runtime contract and package test when the shape changed.

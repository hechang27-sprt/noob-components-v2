# Code Reuse Thinking Guide

Use this guide before extracting a shared helper, adding a public export, or duplicating a package-local pattern.

## Search before extracting

This workspace intentionally has two narrow public packages, not a shared utility package. Search both `packages/ui/src` and `packages/admin/src` before adding a helper. Extract only after concrete reuse pressure exists.

Keep a helper with the package that owns its concept:

- Naive theme bridge helpers belong in `packages/ui/src/theme/naive.ts`.
- Frontend runtime contracts, shell preferences normalization, and Pinia shell state belong in `packages/admin/src/runtime*` and `packages/admin/src/stores`.
- Route registries, backend derivation, and application state will belong in `apps/admin-starter` when it is scaffolded, never in the shared admin runtime.

Do not duplicate a helper solely to avoid an import. Do not extract a utility from one callsite simply because it looks reusable.

## Current source-of-truth patterns

### Theme bridge

`packages/ui/src/theme/naive.ts` owns `NoobNaiveThemeBridge` and conversion to `GlobalThemeOverrides`. Add a bridge field or mapping there rather than composing incompatible theme objects at each consumer.

### Shell-preferences parsing and persistence

`packages/admin/src/runtime/shell-preferences.ts` owns all Zod normalization, storage safety, cloning, and the persisted-field selection. Components and Pinia actions must call its typed functions rather than reparse storage or serialize their own preference shapes.

`packages/admin/src/stores/shell-preferences.ts` owns reactive state and mutations. Keep state transitions explicit through its setters, `toggleSidebar`, `replacePreferences`, and `reset`; do not create a second preference store or add a global persistence plugin.

### Public API

`packages/ui/src/index.ts` and `packages/admin/src/index.ts` are deliberate public barrels. Export an API once from the owning package; do not create root-monolith imports, duplicate re-export paths, or broad Naive UI re-exports.

## Extraction threshold

Extract when a behavior has at least two independent callsites with the same invariant and a focused owner can preserve that invariant. Keep code local when it is a one-off component concern or a thin composition of Naive UI primitives.

For example, `AdminLoginPage` owns its form feedback and pending UI locally (`packages/admin/src/components/admin-login-page.tsx`), while preferences normalization is shared because storage hydration and persistence must agree.

## Before commit

- [ ] Searched for an existing owner before adding a helper, store, or export.
- [ ] Kept the helper in the owning package/layer rather than pre-creating `shared`.
- [ ] Reused the runtime schema for persisted/external values.
- [ ] Kept package barrels explicit and free of convenience re-export sprawl.
- [ ] Added an observable test if a shared invariant changed.

# Code Reuse Thinking Guide

Use this guide before extracting a shared helper, adding a public export, or duplicating a package-local pattern.

## Search before extracting

This workspace intentionally has two narrow public packages, not a shared utility package. Search both `packages/ui/src` and `packages/admin/src` before adding a helper. Extract only after concrete reuse pressure exists.

Do not duplicate a helper solely to avoid an import. Do not extract a utility from one callsite simply because it looks reusable.

> The **current** source-of-truth patterns — which module owns each helper (shell-preferences parsing/persistence, public barrels) as they exist today — are documented in the code wiki at `openwiki/` (see `packages/admin/preferences.md` and the package overview pages). This guide sets only the rules to follow when reusing or extracting code.

## Where a helper belongs

Keep a helper with the package that owns its concept:

- Frontend runtime contracts, shell preferences normalization, and Pinia shell state belong in `packages/admin/src/runtime*` and `packages/admin/src/stores`.
- Route registries, backend derivation, and application state will belong in `apps/admin-starter` when it is scaffolded, never in the shared admin runtime.

Do not duplicate a helper solely to avoid an import. Do not extract a utility from one callsite simply because it looks reusable.

## Extraction threshold

Extract when a behavior has at least two independent callsites with the same invariant and a focused owner can preserve that invariant. Keep code local when it is a one-off component concern or a thin composition of Naive UI primitives.

For example, `AdminLoginPage` owns its form feedback and pending UI locally (`packages/admin/src/components/admin-login-page.tsx`), while preferences normalization is shared because storage hydration and persistence must agree.

## Before commit

- [ ] Searched for an existing owner before adding a helper, store, or export.
- [ ] Kept the helper in the owning package/layer rather than pre-creating `shared`.
- [ ] Reused the runtime schema for persisted/external values.
- [ ] Kept package barrels explicit and free of convenience re-export sprawl.
- [ ] Added an observable test if a shared invariant changed.

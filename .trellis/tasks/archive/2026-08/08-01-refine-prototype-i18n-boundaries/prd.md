# Refine prototype i18n boundaries

## Goal

Refine the completed i18n prototype so fallback authority, source-consumed build integration, and typed object iteration model production package boundaries without host knowledge of library source layout.

## Confirmed Facts

- `inheritLocale: true` already makes the component-local Composer inherit the root Composer's locale and fallback locale.
- Vue I18n 11.4.8 still requires `composer.fallbackRoot = false` after local Composer creation because the inheriting local Composer initializes that flag from the root.
- The current package plugin snapshots both `fallbackLocale` and message overrides, while the demo global Composer separately owns a fallback locale.
- The repository intentionally consumes internal workspace libraries from source without prebuilds. Therefore the demo build must precompile source-owned library JSON, but the host should not encode the package's relative filesystem layout.
- The repository does not currently depend on `tsafe`; its official `objectEntries` helper preserves object key/value tuple types more precisely than `Object.entries`.

## Requirements

1. Remove `fallbackLocale` from `PrototypeI18nPluginOptions`, the provided snapshot, defaults, and package exports. The host global Composer becomes the sole locale and fallback-locale authority.
2. Keep package isolation by setting only `composer.fallbackRoot = false` immediately after local Composer creation. Do not overwrite the inherited fallback locale.
3. Replace the demo's direct package locale path with the shared repository Vue I18n Vite preset. Source-consuming workspace hosts use that preset once; consumers of a built package require no library-source include or workspace tooling.
4. Update the fallback verification harness so the host configures the global Composer fallback and the package inherits it.
5. Destructure injected snapshot state and safe Composer data refs where it improves clarity. Keep Composer methods on the object because repository type-aware lint rejects unbound methods, and retain the object for the required mutable `fallbackRoot` correction.
6. Add `tsafe` to the prototype package and replace `Object.entries` plus manual locale casts with `objectEntries`.
7. Update child/parent task findings and the shared component-library i18n spec so they no longer advertise package-plugin-owned fallback configuration or direct host source paths.
8. Preserve immutable startup message overrides, component-local registries, defaults-first override merging, JSON precompilation in both prototype build boundaries, and the no-build workspace workflow.

## Acceptance Criteria

- [x] `PrototypeI18nPluginOptions` exposes only message override configuration; no package API or snapshot owns fallback locale.
- [x] Unsupported locales render the fallback selected by the host global Composer while the active global locale remains unchanged.
- [x] Local package messages still never fall through to root/global message registries.
- [x] `apps/demo/vite.config.ts` contains no package-relative `src/locales` path or package-specific resource import and uses the shared workspace Vue I18n preset.
- [x] Built-package guidance explicitly states that host applications do not include library source resources.
- [x] Both entry-iteration loops use `tsafe/objectEntries` without manual locale casts.
- [x] Injected state and safe Composer data refs are destructured; methods remain bound to the Composer and the required `fallbackRoot` mutation stays explicit.
- [x] Immutable partial overrides, sibling preservation, locale propagation, and reload restoration still work.
- [x] Prototype package/demo typecheck and build, scoped lint/format, and browser scenarios pass.
- [x] Parent design and shared Trellis i18n contract reflect the revised authority and build boundaries.

## Out of Scope

- Production translation work in `packages/ui` or `packages/admin`.
- Changing the repository's source-based workspace policy.
- Lazy-loading locale resources or publishing a public Vite integration package.
- Supporting object/array fallback configurations in the prototype URL harness.

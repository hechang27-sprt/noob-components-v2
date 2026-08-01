# Shared workspace Vue I18n Vite preset

## Goal

Replace per-library Vite locale-resource exports with one repository-owned Vue I18n preset for no-build workspace source consumption, while keeping built-library consumers completely free of library i18n build configuration.

## Confirmed Facts

- The repository intentionally aliases internal workspace libraries to source for application development and builds.
- Source-consuming application builds must run `@intlify/unplugin-vue-i18n` over imported package JSON if package locale resources are not prebuilt.
- The current demo imports `prototypeI18nResourceInclude` from a package-specific `./vite` export, so every newly localized source-consumed package would add another consumer configuration entry.
- Built library output already contains precompiled message ASTs; consumers of that output need no library locale include.
- The repository has no existing shared Vite tooling module or package.

## Requirements

1. Add one repository-owned shared Vite helper that creates the workspace Vue I18n plugin with locale-resource globs covering `apps/*/src/locales/**` and `packages/*/src/locales/**`.
2. Resolve those globs relative to the shared helper itself, not the consuming application and not a specific package.
3. Update `apps/demo/vite.config.ts` to call the shared helper once instead of importing `VueI18nPlugin` and package-specific resource includes.
4. Remove `@noob-naive-ui/prototype-i18n-verification/vite`, `vite.mjs`, and `vite.d.ts`; the component package must not expose workspace build-tooling contracts.
5. Keep the prototype package's standalone library build precompilation unchanged.
6. Keep demo source aliases and the no-build workspace behavior unchanged.
7. Document the split explicitly: the shared preset is internal monorepo tooling for source consumers; built-package consumers require no library-specific or shared workspace preset.
8. Update the prototype, parent design, and shared i18n code-spec to remove package-owned Vite integration guidance.

## Acceptance Criteria

- [x] Demo Vite configuration contains one `createWorkspaceVueI18nPlugin()` call and no package-specific locale-resource include/import.
- [x] The shared helper covers current and future app/package locale directories through workspace globs without naming the prototype package.
- [x] The shared helper is included in root TypeScript checking and exposes the exact Intlify factory return type.
- [x] The prototype package has no `./vite` export or root Vite helper artifacts.
- [x] The prototype package standalone build still precompiles its JSON resources.
- [x] Demo source-consuming build still precompiles prototype JSON resources without first building the package.
- [x] Adding another package under `packages/<name>/src/locales/**` requires no demo Vite configuration change.
- [x] Package/demo typecheck and build, scoped lint/format, and browser locale/fallback scenarios pass.
- [x] Documentation distinguishes internal workspace preset use from zero-config built-package consumption.

## Out of Scope

- Publishing the shared Vite helper as a public npm package.
- Changing production package entrypoints or requiring dependency prebuilds.
- Generated/committed precompiled locale modules.
- Runtime/JIT compilation as a replacement for precompilation.
- Migrating unrelated Vite configuration into a general preset framework.

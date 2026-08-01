# Implementation Plan: Shared Workspace Vue I18n Vite Preset

## 1. Shared Helper

- Create `tooling/vite/vue-i18n.ts`.
- Derive repository root from the helper's `import.meta.url`.
- Export `createWorkspaceVueI18nPlugin()` returning a fresh Intlify Vite plugin configured for app/package locale convention globs.
- Keep the module focused on resource precompilation only.

## 2. Consumer Migration

- Replace demo's direct Intlify plugin import and package resource export import with the shared helper.
- Replace the inline plugin options with one `createWorkspaceVueI18nPlugin()` call.
- Preserve all unrelated demo Vite configuration.

## 3. Package Cleanup

- Remove the `./vite` package export and helper files.
- Keep package standalone Vite build configuration unchanged.
- Reconcile package `files` metadata.

## 4. Documentation

- Update the shared component-library i18n contract.
- Update archived prototype findings and parent integration design/requirements.
- State that source-consuming workspace applications use the shared internal preset, while built-package consumers need no helper.

## 5. Verification

Run without prebuilding the prototype dependency first:

```bash
pnpm --filter demo typecheck
pnpm --filter demo build
pnpm --filter @noob-naive-ui/prototype-i18n-verification typecheck
pnpm --filter @noob-naive-ui/prototype-i18n-verification build
pnpm exec oxlint --type-aware tooling/vite apps/demo packages/prototype-i18n-verification
pnpm format:check
pnpm exec tsc -b --noEmit
pnpm typecheck
```

Browser scenarios:

1. Defaults render without package plugin.
2. Partial immutable override preserves default sibling text.
3. Unsupported `fr` uses host `zh-CN` fallback while active locale stays `fr`.
4. Post-mount preference change propagates and persists after reload.
5. Console/page/request failures remain empty.

Inspect build evidence that prototype locale messages are precompiled in both package and demo output.

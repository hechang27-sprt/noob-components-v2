# Design: Shared Workspace Vue I18n Vite Preset

## Boundary

Create one internal repository module at `tooling/vite/vue-i18n.ts`:

```ts
export function createWorkspaceVueI18nPlugin(): Plugin {
  return VueI18nPlugin({
    include: [
      resolve(workspaceRoot, "apps/*/src/locales/**"),
      resolve(workspaceRoot, "packages/*/src/locales/**"),
    ],
  })
}
```

`workspaceRoot` is derived from `import.meta.url` inside the helper. Consumers do not pass their directory, enumerate packages, or know package source layouts.

The helper remains a repository-internal TypeScript module rather than a new package:

- only Vite configs inside this monorepo consume it;
- Vite already preprocesses TypeScript config imports;
- no package publication, versioning, dependency, export map, or declaration surface is needed;
- one relative import to stable repository tooling is simpler than a workspace package created only to hold one function.

## Consumption Modes

```text
No-build workspace:
package JSON -> shared workspace Vite preset -> precompiled application bundle

Built package:
package JSON -> package library build -> precompiled dist JS -> external consumer
```

The shared preset is not part of component-library API. External consumers importing built output receive precompiled messages and configure nothing for library resources.

## Demo Migration

`apps/demo/vite.config.ts` imports `createWorkspaceVueI18nPlugin` from `../../tooling/vite/vue-i18n` and replaces its inline `VueI18nPlugin({ include: [...] })` block with one function call. Existing Vue, JSX, Tailwind, DevTools, aliases, and filesystem settings remain unchanged.

## Package Cleanup

Remove:

- package export `./vite`;
- `vite.mjs`;
- `vite.d.ts`;
- `files` entries for those helpers.

Retain `packages/prototype-i18n-verification/vite.config.ts`, which is the package's own standalone build and remains responsible for compiling package JSON into dist.

## Contracts

- The shared helper returns a fresh plugin instance per Vite config invocation.
- Workspace globs are structural conventions, not a dynamic filesystem scan; adding `packages/new-package/src/locales/**` is automatically covered.
- The helper owns only Vue I18n resource transformation. It does not absorb unrelated aliases, Vue plugins, Tailwind, server options, or application settings.
- Every function/global value receives an adjacent responsibility/input/output comment per project authoring rules.

## Risks

- **Config import loading:** prove demo dev/build/typecheck loads the TypeScript helper without a helper build.
- **Glob semantics:** prove prototype locale JSON still becomes precompiled AST in the demo output.
- **Overbroad transforms:** globs are limited to conventional `src/locales/**` paths under apps/packages.
- **Production confusion:** docs must state that external built consumers do not import this internal preset.

## Rollback

Revert this task's migration as one change if the shared helper proves incompatible with future Vite config loading. No runtime or persisted data migration exists.

## Observed Result — 2026-08-02

- Demo Vite config loads the relative TypeScript helper directly; Vite 8 preserves each bundled config module's real `import.meta.url`, so workspace-root resolution remains anchored at `tooling/vite`.
- With prototype package `dist` removed, demo build transformed 5,557 modules and emitted the same bundle hash while containing precompiled English and Chinese message ASTs. Source consumption therefore requires neither a dependency prebuild nor package-specific resource configuration.
- Root TypeScript coverage now includes `tooling/**/*.ts`; this caught and corrected the Intlify factory's `Plugin | Plugin[]` return type to the exact `ReturnType<typeof VueI18nPlugin>`.
- The standalone prototype build still transformed its locale JSON into precompiled AST output and retained its runtime API/declarations.
- Type/build, scoped type-aware lint, formatting, workspace typechecks, and browser defaults/override/fallback/preference/reload scenarios passed. Browser console warnings/errors, page errors, and request failures were empty.

Verdict: one internal structural-glob preset is sufficient for this repository's no-build source-consumption workflow. Component packages no longer expose Vite resource paths, and built-package consumers remain zero-config.

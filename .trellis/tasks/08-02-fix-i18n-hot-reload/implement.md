# Implementation Plan

1. Run `pnpm --filter demo dev` and reproduce stale JSON updates with a browser page-lifetime marker.
2. Convert `createWorkspaceVueI18nPlugin()` into a Vite plugin preset containing the existing precompiler and a workspace-locale HMR companion.
3. In `handleHotUpdate`, recognize conventional workspace locale JSON and return its direct Vue/TSX importer modules as precise HMR targets.
4. Edit and restore both prototype JSON files; verify text updates, unchanged page marker, preserved unrelated state and override precedence, and a clean console.
5. Run package/demo typechecks and builds.

## Validation

```sh
pnpm --filter @noob-naive-ui/prototype-i18n-verification typecheck
pnpm --filter @noob-naive-ui/prototype-i18n-verification build
pnpm --filter demo typecheck
pnpm --filter demo build
pnpm --filter demo dev
```

## Risky File

- `tooling/vite/vue-i18n.ts`: preserve existing include semantics and return a Vite-supported flattened plugin preset.

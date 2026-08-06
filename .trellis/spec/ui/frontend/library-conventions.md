# Library Boundary and Build

## Current shape

The package is a private ESM library with one root entrypoint and dist-only publication (`packages/ui/package.json`). `packages/ui/vite.config.ts` builds `src/index.ts` as ES output and externalizes `naive-ui` and `vue`; declarations come from `tsc` through the package `build:types` script.

Keep the public surface explicit. `packages/ui/src/index.ts` is the only barrel and exports the three theme-bridge symbols from `src/theme/naive.ts`. Do not add a broad namespace barrel or incidental internal exports.

## Naive UI boundary

Use Naive UI directly for commodity controls and layout. `@noob-naive-ui/ui` earns an export only when it contains durable current value: a specialized widget, a reusable workflow composite, a composable, or token/provider integration.

Do not:

- re-export Naive UI primitives or recreate wrapper parity;
- import auth/session state, route manifests, business API clients, CRUD pages, or backend-shaped contracts into this package;
- carry Element Plus props, slots, or CSS-variable conventions into a new public API.

## Theme bridge pattern

`packages/ui/src/theme/naive.ts` imports `GlobalThemeOverrides` as a type and exposes `NoobNaiveThemeBridge`. Keep public bridge fields typed against Naive UI contracts. `defineNoobNaiveThemeBridge` intentionally returns its supplied bridge; `toNoobNaiveThemeOverrides` currently emits only `common`. Do not infer that `layout` fields are automatically converted until implementation adds that behavior.

Keep provider/theme integration in dedicated bridge modules. Add measurement, virtualization, or JSON-flattening guidance only when the owning component is implemented.

## Type and build rules

- Extend the root strict TypeScript baseline as `packages/ui/tsconfig.json` does.
- Keep browser-facing library types within `src/**/*.ts`; compile declarations from the package config.
- Keep Vue, Vue I18n, and Naive UI as peers and Vite externals. Follow the shared workspace dependency policy: these ecosystem-wide runtime versions use `catalog:`, and the workspace root owns the Vue I18n build plugin used by library builds.

## Verification

Run:

```sh
pnpm --filter @noob-naive-ui/ui typecheck
pnpm --filter @noob-naive-ui/ui build
```

Inspect the built root entry when changing exports or externals: `dist/index.js` should retain peer imports and `dist/index.d.ts` should expose only the deliberate API.

## Static dead-code analysis (`fallow`)

`fallow`'s dead-code/unused-export analysis is heuristic and frequently false-positive for this codebase. Before deleting anything it flags, verify against the package's public surface and the spec contract:

- A symbol re-exported from the package barrel (`src/index.ts`) is public API even if no consumer inside the repo uses it. `fallow` reports these as unused exports / unused store members — do not remove. Example: `DEFAULT_SNAPSHOT` in `packages/admin/src/i18n/plugin.ts` and `replacePreferences`/`reset` in `useAdminShellPreferencesStore`.
- A file imported only from a Vite config is reported as an unused file (Vite configs are not entry points). Example: `tooling/vite/vue-i18n.ts` (imported by `apps/demo/vite.config.ts`).
- Framework CSS imports (`tailwindcss/theme.css`, `tailwindcss/utilities.css`) and root-declared devDeps consumed in package Vite configs are reported as unresolved/unlisted. Leave them.
- Generated files (e.g. `packages/*/src/locales/locale-types.generated.ts`) legitimately repeat shapes; regenerate, never hand-edit.

When a run reports findings, triage each as fix vs. false-positive in the task notes before changing code.

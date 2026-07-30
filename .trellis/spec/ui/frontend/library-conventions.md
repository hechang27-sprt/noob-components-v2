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

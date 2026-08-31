# Build Configuration

This guide covers the monorepo build setup: TypeScript configs, Vite
configs, and the custom plugins in `tooling/vite`.

## Overview

The workspace is a pnpm monorepo. Root scripts drive all packages:

```bash
pnpm -r --if-present build      # build every package
pnpm -r --if-present typecheck  # typecheck every package
pnpm lint                       # oxlint
pnpm format                     # oxfmt
```

Each package owns a Vite config and two TypeScript configs. Shared
settings live in three root configs.

## TypeScript configs

### Root configs

`tsconfig.json` is the base. It sets strict mode, ESNext targets,
`moduleResolution: Bundler`, JSX preserve with `jsxImportSource: vue`,
and the workspace path aliases:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "jsxImportSource": "vue",
    "strict": true,
    "paths": {
      "@noob-naive-ui/admin": ["./packages/admin/src/index.ts"],
      "@noob-naive-ui/ui": ["./packages/ui/src/index.ts"]
    }
  }
}
```

Every workspace package appears twice: once with the `@noob-naive-ui/*`
prefix and once with the shorter `@noob/*` prefix.

`tsconfig.vite.json` extends the base and sets `types` to `node` and
`vite/client`. Applications extend this.

`tsconfig.library.json` extends the Vite tree and enables declaration
emit:

```json
{
  "extends": "./tsconfig.vite.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "declarationMap": true
  }
}
```

Library packages extend this.

### Package configs

Each library package has two files.

`tsconfig.json` serves the editor and typecheck. It extends
`tsconfig.library.json`. Packages that reach sibling sources through path
aliases set `rootDir` to the workspace root.

`tsconfig.build.json` serves the declaration emitters. It extends the
package config, keeps the workspace `paths` (unplugin-dts resolves
sibling packages **from source** — no prebuilt dependency `dist` needed),
and sets no `rootDir`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "dist"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["tests"]
}
```

The Vite config passes two options to `unplugin-dts`:

```ts
dts({
  tsconfigPath: "./tsconfig.build.json",
  // Map output paths relative to this package's src, so declarations land
  // at dist/index.d.ts. Without it the plugin derives the root from the
  // whole program — sibling sources pulled in by paths widen it to the
  // workspace — and mirrors the tree under dist/packages/<pkg>/src/….
  entryRoot: "./src",
  // Keep alias specifiers verbatim in emitted declarations. The default
  // pathsToAliases rewrites tsconfig paths targets into relative sibling
  // source imports (e.g. ../../../registry/src/index.ts), which would leak
  // source paths into published packages.
  pathsToAliases: false,
})
```

`paths` stays inherited, so the alias pulls sibling `.ts` sources into the
program for type checking; the compiler's implicit program root already
spans the workspace, so nothing falls outside it. `entryRoot` and the
plugin's `include` filter scope the *output* to this package's own files:
sibling sources are checked but never emitted into `dist`.

Emitted declarations keep the alias specifier as written, for example
`@noob-naive-ui/registry`. Consumers resolve it through node_modules.

Cross-package imports must use these package aliases. A relative sibling
import such as `../../../registry/src/index.ts` bypasses `paths`, drags
the sibling source into the program, and leaks verbatim into the emitted
declaration. Because resolution is source-based, a package build works
standalone at any time; the root build script additionally follows the
workspace dependency order.

Module augmentations (`declare module "@noob-naive-ui/…"`) must be
reachable from the emitted declarations. unplugin-dts strips bare
side-effect imports (`import "./theme"`) from `.d.ts` output, which
orphans augmentations and collapses `keyof` schemas to `never` for
consumers. Re-export the augmentation module type-only instead:

```ts
export type * from "./theme";
```

Tests are excluded from the build.

The demo app extends `tsconfig.vite.json` instead of the library tree:
it emits nothing.

## Vite configs

Library packages use `vitest/config`'s `defineConfig`, so one config
covers both the build and the test run.

### Library build shape

```ts
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rolldownOptions: {
      external: [
        "@noob-naive-ui/i18n",
        "naive-ui",
        "vue",
        "vue-i18n",
        "zod",
      ],
    },
  },
});
```

`external` lists the peer dependencies. The package bundles its own code
but keeps framework and sibling packages external.

Packages that ship CSS (`ui`, `admin`) add `cssFileName: "style"`.

### Path resolution

Vite 8 reads the root `tsconfig.json` paths natively:

```ts
resolve: {
  tsconfigPaths: true,
}
```

This replaces manual JS and TS aliases. CSS subpath imports still need
explicit aliases, because `tsconfigPaths` does not resolve CSS:

```ts
alias: [
  {
    find: "@noob-naive-ui/ui/style.css",
    replacement: resolve(__dirname, "../ui/src/style.css"),
  },
],
```

### Per-package plugin stacks

| Package | Plugins | Test env |
| --- | --- | --- |
| `registry` | `dts` | node |
| `i18n` | `vueJsxVapor`, `dts` | node |
| `admin-vue-router` | `vueJsxVapor`, `dts` | node |
| `ui` | locale types, `tailwindcss`, `vueJsxVapor`, `vueI18n`, `dts` | happy-dom |
| `admin` | locale types, `tailwindcss`, `vueJsxVapor`, `vueI18n`, `dts` | node |
| `demo` | `tailwindcss`, `vue`, `vueJsxVapor`, devtools, workspace vue-i18n | — |

All library configs run `unplugin-dts` with
`tsconfigPath: "./tsconfig.build.json"` to emit declarations.

The demo config also sets `server.fs.allow` to the workspace root, so the
dev server can serve sibling package sources.

## Custom plugins in `tooling/vite`

Two workspace-owned plugins live under `tooling/vite`.

### `json-locale-types.ts`

Generates TypeScript types from locale JSON at build time. It scans a
directory for JSON files and emits one interface per file plus a
`LocaleFileMap` from file stem to type:

```ts
// packages/ui/src/locales/locale-types.generated.ts
export interface Example {
  en: { title: string; description: string };
  "zh-CN": { title: string; description: string };
}

export interface LocaleFileMap {
  "Example": Example;
}
```

The output is type-only, so it erases at runtime.

`createJsonLocaleTypesPlugin({ dir, outFile })` wires the generator into
Vite. The ui and admin configs install it before the module graph and
the declaration emitter run.

### `vue-i18n.ts`

`createWorkspaceVueI18nPlugin()` bundles the `@intlify/unplugin-vue-i18n`
precompiler with a Vite-only HMR companion. The companion recognizes JSON
edits under `apps/*/src/locales` and `packages/*/src/locales`, so locale
resource changes hot-update without a full reload.

The demo installs this preset. Built package consumers do not need it.

## Adding a package

1. Add the directory to `pnpm-workspace.yaml`.
2. Create `tsconfig.json` (extends `tsconfig.library.json`) and
   `tsconfig.build.json`.
3. Create `vite.config.ts` with the library build shape, externals, and
   plugins.
4. Add the package's `paths` entries to the root `tsconfig.json`.
5. Install and run `pnpm install`, then `pnpm -r typecheck`.

## What's next

- [Architecture](04-architecture.md) — package roles and data flow
- [Admin Router](06-admin-vue-router.md) — dynamic routes and payload codecs

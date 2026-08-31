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
package config and resets emit to a package-local shape:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "rootDir": "src",
    "outDir": "dist",
    "paths": {}
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["tests"]
}
```

`paths` is cleared so emitted declarations use relative imports instead
of aliases. Tests are excluded from the build.

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

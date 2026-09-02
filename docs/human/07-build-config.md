# Build Configuration

This guide covers the monorepo build setup: TypeScript configs, Vite
configs, and the `@noob/tooling-vite` helper package.

## Overview

The workspace is a pnpm monorepo. Root scripts drive all packages:

```bash
pnpm -r --if-present build      # build every package (topological order)
pnpm typecheck                  # whole-repo type gate + tooling typecheck
pnpm typecheck:all              # just the whole-repo gate
pnpm lint                       # oxlint
pnpm format                     # oxfmt
```

Each library package owns one Vite config and **one** TypeScript config.
Shared settings live in three root configs.

Declarations are produced by `rolldown-plugin-dts` (tsc generator, fused
single-file output), driven by the project-references setup. The compiler
is TypeScript 6, invoked as `tsc6`.

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
  },
  "include": ["packages/*/src/**/*.ts", "packages/*/tests/**/*.ts", "apps/demo/src/**/*.ts"]
}
```

Every workspace package appears twice: once with the `@noob-naive-ui/*`
prefix and once with the shorter `@noob/*` prefix. The aliases point at
**source**, so every tool (editor, vitest, vite `tsconfigPaths`, the
declaration plugin) resolves siblings from source — no prebuilt
dependency `dist` is required, and standalone package builds keep full
types.

`tsconfig.vite.json` extends the base and sets `types` to `node` and
`vite/client`. Applications extend this.

`tsconfig.library.json` extends the Vite tree and carries the shared
library build block. Every path uses the `${configDir}` template so it
resolves relative to each consuming package's own directory
(TS 5.5+, the repo uses TS 6):

```json
{
  "extends": "./tsconfig.vite.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "composite": true,
    "rootDir": "${configDir}/src",
    "outDir": "${configDir}/dist",
    "declarationDir": "${configDir}/dist"
  },
  "include": [
    "${configDir}/src/**/*.ts",
    "${configDir}/src/**/*.tsx",
    "${configDir}/src/**/*.json"
  ],
  "exclude": ["${configDir}/tests"]
}
```

Library packages extend this.

### Package configs

Each library package has a single, minimal `tsconfig.json`: it only
declares `references` — everything else comes from
`tsconfig.library.json`:

```json
{
  "extends": "../../tsconfig.library.json",
  "references": [
    { "path": "../registry/tsconfig.json" },
    { "path": "../i18n/tsconfig.json" },
    { "path": "../ui/tsconfig.json" }
  ]
}
```

`composite: true` plus `references` declare the package's dependency
graph. The same file serves the editor, the whole-repo type gate, and the
declaration plugin — there is no separate `tsconfig.build.json` anymore.

Reference graph:

| Package | References |
| --- | --- |
| `registry` | — |
| `i18n` | `registry` |
| `ui` | `registry`, `i18n` |
| `admin` | `registry`, `i18n`, `ui` |
| `admin-vue-router` | `admin`, `i18n` |

The demo app extends `tsconfig.vite.json` instead of the library tree:
it emits nothing.

## Compiler: TypeScript 6

The repo's compiler is TypeScript 6 via the npm alias in the workspace
catalog:

```yaml
# pnpm-workspace.yaml
catalog:
  typescript: npm:@typescript/typescript6@^6.0.2
```

Root and every workspace package declare `"typescript": "catalog:"`, so a
single version is shared and pnpm installs packages against a single
peer context. Two facts drive the choice:

- The official `typescript@7` package is an API stub (version fields only,
  no compiler API), while the tsgo generator has no bundled declaration
  fusion and refuses the `tsc` generator.
- TypeScript 5.x misses lib features this repo uses
  (`Map.getOrInsertComputed`) and flags spurious DOM/zod errors in tests.

`@typescript/typescript6` exposes the compiler API but ships only the
`tsc6` binary (no `tsc`), which is why every script calls `tsc6`.

The plugin resolves `typescript` from `tooling/vite`'s own dependencies,
so `tooling/vite` must keep the same alias — otherwise the generator
silently selects tsgo (TypeScript 7).

## Declaration build

Library Vite configs install the declarations plugin through the shared
helper:

```ts
import { dtsForBuild } from "@noob/tooling-vite";

dtsForBuild({
  tsconfig: "./tsconfig.json",
})
```

`dtsForBuild` wraps `dts()` from `rolldown-plugin-dts` and applies
`apply: "build"` to every returned plugin, so the declaration pipeline
never runs inside Vitest's dev server (its `buildStart` crashes without a
build input).

The plugin uses the `tsc` generator and the package's composite config.
Output per package is a **fused single-file** `dist/index.d.ts` (+ map):
the entry graph's own declarations are merged into one module, sibling
packages and dependencies stay external specifiers
(`import { … } from "@noob-naive-ui/registry"`), which is the correct
contract for published packages that declare those dependencies.

### Why not `build: true`

`build: true` was evaluated and dropped. `composite` forces the plugin's
incremental mode (`incremental: false` cannot turn it off), which shells
`tsc -b` and emits **per-file declarations** into `dist` — the tsc -b
layout, not the fused bundle. That mode also persists a cache that goes
stale across `dist` wipes or compiler switches (reproducible
"Unable to read file …/dist/index.d.ts" failures), and races with
rolldown's chunking under `pnpm -r`. The single-program path fuses
deterministically: two clean ordered builds are byte-identical.

### Vite plumbing for declarations

Library configs share three settings that keep the fused output intact:

```ts
oxc: {
  // vite's oxc transform would strip the virtual .d.ts modules.
  exclude: [/\.js$/, /\.d\.[cm]?ts$/],
},
build: {
  lib: {
    fileName: (_format, name) =>
      name.endsWith(".d") ? `${name}.ts` : `${name}.js`,
  },
},
```

The `fileName` mapping makes the declaration chunk emit as `index.d.ts`
instead of `index.ts`.

`ui` and `admin` additionally exclude the generated locale-types file
(`locale-types.generated.ts` + its `.d.ts` twin) from
`@intlify/unplugin-vue-i18n`'s resource transform.

## Externalizing dependencies

`externalFromPackageJson` builds the `rolldownOptions.external` predicate
from the package's own `package.json`:

```ts
import { externalFromPackageJson } from "@noob/tooling-vite";

build: {
  rolldownOptions: {
    external: externalFromPackageJson(
      resolve(import.meta.dirname, "package.json"),
    ),
  },
},
```

It externalizes every `dependencies`, `peerDependencies`, and
`optionalDependencies` entry (exact match or subpath), plus Node builtins.
`devDependencies` (build tooling) stay bundleable. This replaces the old
hand-maintained external arrays.

## Typecheck

There is one whole-repo type gate:

```bash
pnpm typecheck   # tsc6 -p tsconfig.json --noEmit
                 # + pnpm --filter @noob/tooling-vite run typecheck
```

The root program includes every package's `src` and `tests` plus the demo
source and resolves siblings through the `paths` aliases, so it checks
the **whole cross-package graph** in one pass.

`tsc -b` per package is deliberately not used for typechecking: its
per-file declaration emit inside `dist` conflicts with the fused bundle
(TS6305 "output file has not been built from source"), and references
verification in either mode requires `dist` to hold tsc-shaped output.

`tooling/**` is excluded from the root program (tooling uses
`allowImportingTsExtensions` for Node ESM-TS loading) and is typechecked
by its own `tsconfig.json` + script.

## Vite configs

Library packages use `vitest/config`'s `defineConfig`, so one config
covers both the build and the test run.

### Library build shape

```ts
export default defineConfig({
  plugins: [dtsForBuild({ tsconfig: "./tsconfig.json" })],
  oxc: { exclude: [/\.js$/, /\.d\.[cm]?ts$/] },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      formats: ["es"],
      fileName: (_format, name) =>
        name.endsWith(".d") ? `${name}.ts` : `${name}.js`,
    },
    rolldownOptions: {
      external: externalFromPackageJson(
        resolve(import.meta.dirname, "package.json"),
      ),
    },
  },
  resolve: { tsconfigPaths: true },
});
```

Packages that ship CSS (`ui`, `admin`) add `cssFileName: "style"` and
`cssMinify: false`.

### Path resolution

Vite 8 reads the root `tsconfig.json` paths natively:

```ts
resolve: {
  tsconfigPaths: true,
}
```

CSS subpath imports still need explicit aliases, because `tsconfigPaths`
does not resolve CSS:

```ts
alias: [
  {
    find: "@noob-naive-ui/ui/style.css",
    replacement: resolve(import.meta.dirname, "../ui/src/style.css"),
  },
],
```

### Per-package plugin stacks

| Package | Plugins | Test env |
| --- | --- | --- |
| `registry` | `dtsForBuild` | node |
| `i18n` | `vueJsxVapor`, `dtsForBuild` | node |
| `admin-vue-router` | `vueJsxVapor`, `dtsForBuild` | node |
| `ui` | locale types, `tailwindcss`, `vueJsxVapor`, `vueI18n`, `dtsForBuild` | happy-dom |
| `admin` | locale types, `tailwindcss`, `vueJsxVapor`, `vueI18n`, `dtsForBuild` | node |
| `demo` | `tailwindcss`, `vue`, `vueJsxVapor`, devtools | — |

All library configs run `dtsForBuild({ tsconfig: "./tsconfig.json" })`.

The demo config also sets `server.fs.allow` to the workspace root, so the
dev server can serve sibling package sources.

### Framework singletons in apps

Apps must render with **one instance** of each framework singleton (vue,
vue-router, pinia, vue-i18n, naive-ui, pro-naive-ui). Published library
dists import these by name, and pnpm may install several physical copies
under different peer-context variants; if the app's direct deps resolve a
different variant than the libraries, the bundle contains duplicates and
injection keys break across the boundary (a blank page with
`Cannot read properties of undefined (reading 'value')` inside
vue-router's RouterView). Two defenses are in place:

- `apps/demo` declares `"typescript": "catalog:"` like every package, so
  its whole import graph shares the same peer context.
- The demo config pins the singletons:

```ts
resolve: {
  dedupe: ["vue", "vue-router", "pinia", "vue-i18n", "naive-ui", "pro-naive-ui"],
},
```

## Custom plugins in `tooling/vite`

`tooling/vite` is an internal package, `@noob/tooling-vite` (never
published). Its `package.json` follows the internal-package pattern:
`"type": "module"`, `main`/`types`/`exports` point at the raw `.ts`
sources through `index.ts`, and consumers import by package name. A local
`tsconfig.json` (`noEmit` + `allowImportingTsExtensions`) typechecks it,
because Node's ESM loader needs explicit `.ts` extensions in re-exports.

Exports:

- `json-locale-types` — `createJsonLocaleTypesPlugin`, locale-types
  generation (see below).
- `dts-build` — `dtsForBuild`.
- `external` — `externalFromPackageJson`.
- `patch-hmr` — `hmrPatchServer`: dev-only in-memory patch interception
  (virtual module clients (apply/restore split) + module re-import via the self-accept boundary; no
  disk writes). Demo HMR test page exercise.

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

## Build determinism

- Clean ordered builds (`pnpm -r build`) are **byte-identical** across
  runs when the vite config-bundle cache
  (`node_modules/.vite-temp`, `node_modules/.vite`) is part of the clean
  state; `dist` contains only `index.d.ts(+map)`, `index.js(+map)`, and
  optionally `style.css`. (A persisted cache can flip an internal
  virtual-module counter that only appears in an emitted
  `//#region virtual:intlify-i18n-*` comment.)
- Standalone package builds keep full types because the `paths` aliases
  resolve siblings from source; the ordered `-r` build is still
  recommended so published packages are always validated together.

## Adding a package

1. Add the directory to `pnpm-workspace.yaml`.
2. Create a single `tsconfig.json` (extends `tsconfig.library.json`,
   `composite: true`, `rootDir: "src"`, `outDir: "dist"`,
   `emitDeclarationOnly: true`, `references` to sibling packages).
3. Add the package's `paths` entries to the root `tsconfig.json`.
4. Create `vite.config.ts` with the library build shape, `dtsForBuild`,
   `externalFromPackageJson`, and plugins.
5. Run `pnpm install`, then `pnpm typecheck` and
   `pnpm -r --if-present build`.

## What's next

- [Architecture](04-architecture.md) — package roles and data flow
- [Admin Router](06-admin-vue-router.md) — dynamic routes and payload codecs

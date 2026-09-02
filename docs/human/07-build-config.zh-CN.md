# 构建配置

本指南介绍 monorepo 的构建环境：TypeScript 配置、Vite 配置，以及 `@noob/tooling-vite` 辅助包。

## 概览

工作区是 pnpm monorepo。根脚本驱动所有包：

```bash
pnpm -r --if-present build      # 构建每个包（拓扑顺序）
pnpm typecheck                  # 全仓库类型门禁 + tooling 类型检查
pnpm typecheck:all              # 仅全仓库类型门禁
pnpm lint                       # oxlint
pnpm format                     # oxfmt
```

每个库包拥有一个 Vite 配置和**一个** TypeScript 配置。共享设置位于三个根配置中。

声明文件由 `rolldown-plugin-dts`（tsc 生成器，融合为单文件输出）生成，由项目引用结构驱动。编译器是 TypeScript 6，通过 `tsc6` 调用。

## TypeScript 配置

### 根配置

`tsconfig.json` 是基础配置。它设置了 strict 模式、ESNext 目标、`moduleResolution: Bundler`、JSX preserve（`jsxImportSource: vue`）和工作区路径别名：

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

每个工作区包出现两次：一次带 `@noob-naive-ui/*` 前缀，一次带更短的 `@noob/*` 前缀。别名指向**源码**，因此所有工具（编辑器、vitest、vite `tsconfigPaths`、声明插件）都从源码解析兄弟包——不需要预先构建依赖的 `dist`，独立构建单个包也保持完整类型。

`tsconfig.vite.json` 扩展基础配置，并把 `types` 设为 `node` 和 `vite/client`。应用继承它。

`tsconfig.library.json` 扩展 Vite 树，并承载共享的库构建块。每个路径都用 `${configDir}` 模板，使其相对各消费包自己的目录解析（TS 5.5+，本仓库使用 TS 6）：

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

库包继承它。

### 包配置

每个库包只有一个精简的 `tsconfig.json`：只声明 `references`，其余全部来自 `tsconfig.library.json`：

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

`composite: true` 加上 `references` 声明包的依赖图。同一份文件同时服务于编辑器、全仓库类型门禁和声明插件——不再有单独的 `tsconfig.build.json`。

引用图：

| 包 | 引用 |
| --- | --- |
| `registry` | — |
| `i18n` | `registry` |
| `ui` | `registry`、`i18n` |
| `admin` | `registry`、`i18n`、`ui` |
| `admin-vue-router` | `admin`、`i18n` |

demo 应用继承 `tsconfig.vite.json` 而非库树：它不输出任何文件。

## 编译器：TypeScript 6

仓库的编译器是 TypeScript 6，通过工作区目录（catalog）中的 npm 别名引入：

```yaml
# pnpm-workspace.yaml
catalog:
  typescript: npm:@typescript/typescript6@^6.0.2
```

根目录和每个工作区包都声明 `"typescript": "catalog:"`，因此共享单一版本，pnpm 也在单一的 peer 上下文（peer context）中安装包。选择它的两个原因：

- 官方 `typescript@7` 包只是 API 桩（仅版本字段，没有编译器 API）；tsgo 生成器没有声明融合能力，且会拒绝 `tsc` 生成器。
- TypeScript 5.x 缺少本仓库使用的库特性（`Map.getOrInsertComputed`），并会在测试里产生误报的 DOM/zod 类型错误。

`@typescript/typescript6` 提供完整编译器 API，但只提供 `tsc6` 二进制（没有 `tsc`），所以所有脚本都调用 `tsc6`。

插件的 `typescript` 从 `tooling/vite` 自己的依赖解析，因此 `tooling/vite` 必须保持相同的别名——否则生成器会静默选择 tsgo（TypeScript 7）。

## 声明构建

库的 Vite 配置通过共享辅助函数安装声明插件：

```ts
import { dtsForBuild } from "@noob/tooling-vite";

dtsForBuild({
  tsconfig: "./tsconfig.json",
})
```

`dtsForBuild` 包装 `rolldown-plugin-dts` 的 `dts()`，并对返回的每个插件应用 `apply: "build"`，使声明管线永不进入 Vitest 的 dev server（其 `buildStart` 在没有构建输入时会崩溃）。

插件使用 `tsc` 生成器和包的 composite 配置。每个包的输出是**融合的单文件** `dist/index.d.ts`（含 map）：入口图的自身声明合并进一个模块，兄弟包和依赖保持外部说明符（`import { … } from "@noob-naive-ui/registry"`）——这是声明了这些依赖的发布包的正确契约。

### 为什么不用 `build: true`

`build: true` 已经过评估并放弃。`composite` 强制开启插件的增量模式（`incremental: false` 无法关闭），它会调用 `tsc -b`，并把**逐文件声明**输出到 `dist`——这是 tsc -b 的布局，不是融合包。该模式还会持久化缓存；`dist` 被清空或编译器切换后缓存会失效（可复现的 "Unable to read file …/dist/index.d.ts" 失败），并在 `pnpm -r` 下与 rolldown 的分块逻辑竞争。单程序路径则确定性地融合：两次干净的顺序构建字节级一致。

### 声明构建的 Vite 配套

库配置共享三个保持融合输出完整的设置：

```ts
oxc: {
  // vite 的 oxc 转换会剥离虚拟 .d.ts 模块。
  exclude: [/\.js$/, /\.d\.[cm]?ts$/],
},
build: {
  lib: {
    fileName: (_format, name) =>
      name.endsWith(".d") ? `${name}.ts` : `${name}.js`,
  },
},
```

`fileName` 映射让声明块输出为 `index.d.ts` 而不是 `index.ts`。

`ui` 和 `admin` 还会把生成的 locale-types 文件（`locale-types.generated.ts` 及其 `.d.ts` 孪生）从 `@intlify/unplugin-vue-i18n` 的资源转换中排除。

## 外部化依赖

`externalFromPackageJson` 从包自己的 `package.json` 构建 `rolldownOptions.external` 谓词：

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

它把 `dependencies`、`peerDependencies`、`optionalDependencies` 中的每一项（精确匹配或子路径）以及 Node 内建模块外部化。`devDependencies`（构建工具）仍可被打包。这取代了旧的手写 external 数组。

## 类型检查

只有一个全仓库类型门禁：

```bash
pnpm typecheck   # tsc6 -p tsconfig.json --noEmit
                 # + pnpm --filter @noob/tooling-vite run typecheck
```

根程序包含每个包的 `src` 和 `tests` 以及 demo 源码，通过 `paths` 别名解析兄弟包，因此一次遍历检查整个跨包图。

每个包单独跑 `tsc -b` 刻意不用于类型检查：它的逐文件声明输出会落在 `dist` 内，与融合包冲突（TS6305 "output file has not been built from source"）；而在两种模式下，引用校验都要求 `dist` 持有符合 tsc 形状的输出。

`tooling/**` 被排除在根程序之外（tooling 使用 `allowImportingTsExtensions` 以支持 Node ESM-TS 加载），由自己的 `tsconfig.json` 和脚本检查。

## Vite 配置

库包使用 `vitest/config` 的 `defineConfig`，一份配置同时覆盖构建和测试运行。

### 库构建形态

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

带 CSS 的包（`ui`、`admin`）额外设置 `cssFileName: "style"` 和 `cssMinify: false`。

### 路径解析

Vite 8 原生读取根 `tsconfig.json` 的 paths：

```ts
resolve: {
  tsconfigPaths: true,
}
```

CSS 子路径导入仍需要显式别名，因为 `tsconfigPaths` 不解析 CSS：

```ts
alias: [
  {
    find: "@noob-naive-ui/ui/style.css",
    replacement: resolve(import.meta.dirname, "../ui/src/style.css"),
  },
],
```

### 各包插件栈

| 包 | 插件 | 测试环境 |
| --- | --- | --- |
| `registry` | `dtsForBuild` | node |
| `i18n` | `vueJsxVapor`、`dtsForBuild` | node |
| `admin-vue-router` | `vueJsxVapor`、`dtsForBuild` | node |
| `ui` | locale types、`tailwindcss`、`vueJsxVapor`、`vueI18n`、`dtsForBuild` | happy-dom |
| `admin` | locale types、`tailwindcss`、`vueJsxVapor`、`vueI18n`、`dtsForBuild` | node |
| `demo` | `tailwindcss`、`vue`、`vueJsxVapor`、devtools | — |

所有库配置都运行 `dtsForBuild({ tsconfig: "./tsconfig.json" })`。

demo 配置还设置了 `server.fs.allow` 指向工作区根，让 dev server 可以服务兄弟包源码。

### 应用里的框架单例

应用必须以**单一实例**渲染每个框架单例（vue、vue-router、pinia、vue-i18n、naive-ui、pro-naive-ui）。已发布的库 dist 按名称导入这些依赖，pnpm 可能在不同的 peer-context 变体下安装多个物理副本；如果应用的直接依赖与库解析到不同变体，包里就会出现重复实例，注入键在边界处失效（白屏，vue-router 的 RouterView 内报 `Cannot read properties of undefined (reading 'value')`）。有两道防线：

- `apps/demo` 与所有包一样声明 `"typescript": "catalog:"`，使它的整个导入图共享同一个 peer context。
- demo 配置固定单例：

```ts
resolve: {
  dedupe: ["vue", "vue-router", "pinia", "vue-i18n", "naive-ui", "pro-naive-ui"],
},
```

## `tooling/vite` 中的自定义插件

`tooling/vite` 是内部包 `@noob/tooling-vite`（永不发布）。它的 `package.json` 遵循内部包模式：`"type": "module"`，`main`/`types`/`exports` 通过 `index.ts` 指向原始 `.ts` 源码，消费者按包名导入。本地 `tsconfig.json`（`noEmit` + `allowImportingTsExtensions`）负责它的类型检查，因为 Node 的 ESM 加载器要求再导出中使用显式 `.ts` 扩展名。

导出项：

- `json-locale-types` — `createJsonLocaleTypesPlugin`，locale-types 生成（见下文）。
- `dts-build` — `dtsForBuild`。
- `external` — `externalFromPackageJson`。
- `patch-hmr` — `hmrPatchServer`（插件预设）：仅限开发的存内补丁拦截（单一 `virtual:noob-hmr-patch` 客户端，默认导出；通过 self-accept 边界重新导入模块；不写磁盘）。demo HMR 测试页使用。

### `json-locale-types.ts`

在构建时从 locale JSON 生成 TypeScript 类型。它扫描目录中的 JSON 文件，为每个文件发出一个接口，再加一个从文件主名到类型的 `LocaleFileMap`：

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

输出仅包含类型，因此在运行时被擦除。

`createJsonLocaleTypesPlugin({ dir, outFile })` 把生成器接入 Vite。ui 和 admin 配置在模块图与声明输出器运行之前安装它。

## 构建确定性

- 干净的顺序构建（`pnpm -r build`）在 clean 状态包含 vite 配置包缓存（`node_modules/.vite-temp`、`node_modules/.vite`）时**字节级一致**；`dist` 只包含 `index.d.ts(+map)`、`index.js(+map)`，可选 `style.css`。（持久化的缓存可能翻转一个只出现在输出 `//#region virtual:intlify-i18n-*` 注释中的内部虚拟模块计数器。）
- 独立构建单个包仍保持完整类型，因为 `paths` 别名从源码解析兄弟包；仍然推荐按顺序的 `-r` 构建，保证发布包始终一起校验。

## 新增包

1. 把目录加入 `pnpm-workspace.yaml`。
2. 创建单个 `tsconfig.json`（继承 `tsconfig.library.json`，`composite: true`，`rootDir: "src"`，`outDir: "dist"`，`emitDeclarationOnly: true`，`references` 指向兄弟包）。
3. 在根 `tsconfig.json` 中为该包添加 `paths` 条目。
4. 创建带库构建形态、`dtsForBuild`、`externalFromPackageJson` 和插件的 `vite.config.ts`。
5. 运行 `pnpm install`，然后 `pnpm typecheck` 和 `pnpm -r --if-present build`。

## 下一步

- [架构](04-architecture.zh-CN.md) — 包角色与数据流
- [Admin Router](06-admin-vue-router.zh-CN.md) — 动态路由与载荷编解码

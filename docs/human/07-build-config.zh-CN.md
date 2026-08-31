# 构建配置

本指南介绍 monorepo 的构建环境：TypeScript 配置、Vite 配置，以及 `tooling/vite` 中的自定义插件。

## 概览

工作区是 pnpm monorepo。根脚本驱动所有包：

```bash
pnpm -r --if-present build      # 构建每个包
pnpm -r --if-present typecheck  # 检查每个包的类型
pnpm lint                       # oxlint
pnpm format                     # oxfmt
```

每个包拥有一个 Vite 配置和两个 TypeScript 配置。共享设置位于三个根配置中。

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
  }
}
```

每个工作区包出现两次：一次带 `@noob-naive-ui/*` 前缀，一次带更短的 `@noob/*` 前缀。

`tsconfig.vite.json` 扩展基础配置，并把 `types` 设为 `node` 和 `vite/client`。应用继承它。

`tsconfig.library.json` 扩展 Vite 树并启用声明输出：

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

库包继承它。

### 包配置

每个库包有两个文件。

`tsconfig.json` 服务于编辑器和 typecheck。它扩展 `tsconfig.library.json`。需要经由路径别名访问兄弟源码的包，会把 `rootDir` 设为工作区根。

`tsconfig.build.json` 服务于声明输出器。它扩展包配置，保留 workspace 的
`paths`（unplugin-dts 直接从源码解析兄弟包——不需要预先构建依赖的
`dist`），并且不设置 `rootDir`：

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

Vite 配置给 `unplugin-dts` 传两个选项：

```ts
dts({
  tsconfigPath: "./tsconfig.build.json",
  // 输出路径相对本包 src 映射，声明落在 dist/index.d.ts。如果不设，
  // 插件会从整个程序推导根目录——paths 拉入的兄弟源码会把根扩大到
  // workspace——于是镜像出 dist/packages/<pkg>/src/…。
  entryRoot: "./src",
  // 输出声明中原样保留别名说明符。默认的 pathsToAliases 会把 tsconfig paths
  // 的目标改写成相对兄弟源码的导入（例如 ../../../registry/src/index.ts），
  // 把源码路径泄露进发布产物。
  pathsToAliases: false,
})
```

`paths` 保持继承，别名把兄弟 `.ts` 源码拉进程序用于类型检查；编译器隐式的
程序根已经覆盖整个 workspace，所以不会有文件越界。`entryRoot` 和插件的
`include` 过滤把输出限定为本包自己的文件：兄弟源码只被检查、不会输出到
`dist`。

输出的声明会按原样保留别名说明符，例如 `@noob-naive-ui/registry`。
消费者通过 node_modules 解析它。

跨包导入必须使用这些包别名。相对兄弟导入，例如 `../../../registry/src/index.ts`，
会绕过 `paths`，把兄弟源码拉进程序，并原样泄露到输出的声明中。由于解析基于
源码，包构建随时可以独立运行；根构建脚本另外遵循 workspace 的依赖顺序。

模块增强（`declare module "@noob-naive-ui/…"`）必须能从输出的声明中触达。
unplugin-dts 会从 `.d.ts` 输出中剔除纯副作用导入（`import "./theme"`），
这会使增强孤立，消费者的 `keyof` schema 退化为 `never`。请改为仅类型再导出
增强模块：

```ts
export type * from "./theme";
```

测试被排除在构建之外。

demo 应用改为继承 `tsconfig.vite.json`，而不是库树：它不输出任何内容。

## Vite 配置

库包使用 `vitest/config` 的 `defineConfig`，因此一个配置同时覆盖构建和测试。

### 库构建形态

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

`external` 列出 peer 依赖。包打包自己的代码，但把框架和兄弟包保持在外部。

输出 CSS 的包（`ui`、`admin`）会加上 `cssFileName: "style"`。

### 路径解析

Vite 8 原生读取根 `tsconfig.json` 的 paths：

```ts
resolve: {
  tsconfigPaths: true,
}
```

这取代了手写的 JS 和 TS 别名。CSS 子路径导入仍需要显式别名，因为 `tsconfigPaths` 不解析 CSS：

```ts
alias: [
  {
    find: "@noob-naive-ui/ui/style.css",
    replacement: resolve(__dirname, "../ui/src/style.css"),
  },
],
```

### 各包的插件栈

| 包 | 插件 | 测试环境 |
| --- | --- | --- |
| `registry` | `dts` | node |
| `i18n` | `vueJsxVapor`、`dts` | node |
| `admin-vue-router` | `vueJsxVapor`、`dts` | node |
| `ui` | locale 类型、`tailwindcss`、`vueJsxVapor`、`vueI18n`、`dts` | happy-dom |
| `admin` | locale 类型、`tailwindcss`、`vueJsxVapor`、`vueI18n`、`dts` | node |
| `demo` | `tailwindcss`、`vue`、`vueJsxVapor`、devtools、工作区 vue-i18n | — |

所有库配置都运行 `unplugin-dts`，并用 `tsconfigPath: "./tsconfig.build.json"` 输出声明。

demo 配置还设置了 `server.fs.allow` 为工作区根，这样开发服务器可以服务兄弟包的源码。

## `tooling/vite` 中的自定义插件

两个工作区自有的插件位于 `tooling/vite` 下。

### `json-locale-types.ts`

在构建时从 locale JSON 生成 TypeScript 类型。它扫描目录中的 JSON 文件，为每个文件输出一个接口，并输出从文件 stem 到类型的 `LocaleFileMap`：

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

输出仅包含类型，运行时会被擦除。

`createJsonLocaleTypesPlugin({ dir, outFile })` 把生成器接入 Vite。ui 和 admin 配置在模块图和声明输出器运行之前安装它。

### `vue-i18n.ts`

`createWorkspaceVueI18nPlugin()` 把 `@intlify/unplugin-vue-i18n` 预编译器与仅 Vite 的 HMR 伴生插件组合在一起。伴生插件能识别 `apps/*/src/locales` 和 `packages/*/src/locales` 下的 JSON 修改，因此 locale 资源变化可以热更新，而无需完整刷新。

demo 安装这个预设。已构建的包消费者不需要它。

## 添加一个包

1. 把目录加入 `pnpm-workspace.yaml`。
2. 创建 `tsconfig.json`（继承 `tsconfig.library.json`）和 `tsconfig.build.json`。
3. 创建带库构建形态、externals 和插件的 `vite.config.ts`。
4. 在根 `tsconfig.json` 中添加该包的 `paths` 条目。
5. 运行 `pnpm install`，然后 `pnpm -r typecheck`。

## 下一步

- [架构](04-architecture.zh-CN.md) — 包的作用与数据流
- [Admin 路由](06-admin-vue-router.zh-CN.md) — 动态路由与载荷 codec

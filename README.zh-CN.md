# Noob Components（V2）

> **WIP 起始模板。** 框架正在积极开发中。公开 API 可能会变化。demo 应用是参考示例。

Noob Components 是一个用于构建管理后台的起始模板。它提供了可用的应用外壳、主题系统和 i18n，三者已集成在一起。你可以在此基础上添加自己的页面、路由和后端集成。

## 技术栈

- **Vite 8** 构建工具，使用 `resolve.tsconfigPaths`
- **Vue 3.5** 与 JSX（`vue-jsx-vapor` 插件）
- **naive-ui** 和 **pro-naive-ui**，用于外壳和表单组件
- **Tailwind CSS 4** 工具类
- **pinia** 状态管理
- **vue-router** 导航
- **vue-i18n** 消息
- **zod** 运行时校验

## 工作区

这是 pnpm workspace。

| 包 | 作用 |
| --- | --- |
| `@noob-naive-ui/registry` | 覆写注册表、`useTheme`、字号解析 |
| `@noob-naive-ui/ui` | 可复用组件（UiCard、CardTabs） |
| `@noob-naive-ui/admin` | 管理后台外壳：Provider、Shell、登录页、store |
| `@noob-naive-ui/i18n` | 组件 i18n 工具 |
| `@noob-naive-ui/admin-vue-router` | Vue Router 与 AdminShell 的适配器 |
| `apps/demo` | 可运行的参考应用（仅前端登录） |
| `apps/admin-starter` | 占位（尚未搭建） |

## 快速开始

环境要求：Node.js 20+、pnpm 11。

```bash
pnpm install
pnpm --filter demo dev
```

打开 `http://localhost:5173`。输入任意非空用户名和密码即可登录。demo 使用仅前端的、内存中的登录方式，不会发起任何 HTTP 请求。

其他命令：

```bash
pnpm -r typecheck   # 检查所有包的类型
pnpm -r build       # 构建所有包
pnpm lint           # 代码检查（oxlint）
```

## 你会得到什么

- 可用的登录页和应用外壳（`AdminProvider`、`AdminShell`）
- 支持亮色/暗色切换、并响应浏览器配色方案的主题预设
- 基于 CSS 自定义属性的主题系统
- 带宿主消息回退的组件 i18n
- 与 vue-router 联动的标签页系统

## 文档

文档位于 `docs/human/`，提供英文和简体中文版本。

- [快速开始](docs/human/01-getting-started.zh-CN.md)
- [主题（宿主侧）](docs/human/02-theming.zh-CN.md)
- [i18n（宿主侧）](docs/human/03-i18n.zh-CN.md)
- [架构](docs/human/04-architecture.zh-CN.md)
- [组件编写](docs/human/05-authoring-components.zh-CN.md)
- [Admin 路由](docs/human/06-admin-vue-router.zh-CN.md)

## 状态

这是一个 WIP 起始模板。demo 应用（`apps/demo`）是使用框架的参考示例。`apps/admin-starter` 是未来会复制 demo 结构的模板。

# 架构

工作区遵循一条规则：应用拥有策略，包拥有可复用行为。demo 应用（`apps/demo`）提供路由、菜单树、主题和消息。包在它们周围渲染外壳。

## 包的作用

| 包 | 职责 |
| --- | --- |
| `@noob-naive-ui/registry` | 覆盖注册表、`useTheme`、字号解析 |
| `@noob-naive-ui/ui` | 可复用组件（UiCard、CardTabs、useUiTheme） |
| `@noob-naive-ui/admin` | 外壳：`AdminProvider`、`AdminShell`、`AdminLoginPage`、store |
| `@noob-naive-ui/i18n` | `createComponentI18n`、`getComponentI18n`、解析器 |
| `@noob-naive-ui/admin-vue-router` | 绑定外壳页面实例的 Vue Router 插件 |
| `apps/demo` | 宿主应用：路由、菜单、主题、消息、仅前端登录 |
| `apps/admin-starter` | 未来复制 demo 结构的模板占位 |

## 覆盖注册表

`@noob-naive-ui/registry` 承载 `LibraryOverridesRegistry`。每个库通过模块增强声明其完整的语言和主题类型：

```ts
declare module "@noob-naive-ui/registry" {
  interface LibraryOverridesRegistry {
    "noob-naive-ui:ui": {
      locale: Record<NoobUiLocaleName, NoobUiLocale>;
      theme: NoobUiThemeComponents;
    };
  }
}
```

派生类型都来自这一处声明。它们产生 i18n 覆盖树（`RegistryI18nOverrides`）和主题覆盖树（`RegistryThemeOverrides`）。注册表没有字符串索引，因此派生投影保持按库有类型。

运行时，`AdminConfigProvider` 构建一个 computed 注册表值，并通过 `libraryOverridesKey` 提供。组件读取自己库的片段。

## 主题数据流

1. 宿主定义主题预设（`AdminThemePreset[]`）。
2. `AdminProvider` 从偏好设置 store 读取当前预设。
3. naive-ui 配置合并用 `toMerged` 构建主题和覆盖。
4. `NGlobalStyle` 根据合并后的主题写入页面背景。
5. ui 包中的 `useUiTheme` 绑定组件的 CSS 自定义属性。

## i18n 数据流

1. 宿主把消息注入全局的 vue-i18n composer。
2. 包组件调用 `createComponentI18n`。
3. 函数用包默认消息构建局部 composer。
4. 它从注册表合并组件的覆盖片段。
5. 缺失的 key 通过根 composer 回退到宿主消息。

## 外壳与路由

`AdminShell` 渲染导航、页面实例和偏好设置。它与路由框架无关。`@noob-naive-ui/admin-vue-router` 把 Vue Router 连接到外壳页面实例：路由用 `defineAdminRouteRegistry` 声明，目的地携带用 zod 校验的 URL codec（`defineAdminRouteUrlCodec`）。

宿主拥有路由历史和路由组件。外壳拥有标签条和已打开页面注册表。

## 认证边界

认证由宿主拥有。`@noob-naive-ui/admin` 提供仅前端的认证 store（`useAdminAuthStore`），状态包括 loading、unavailable、anonymous 和 authenticated。这是展示状态，不是会话或凭据。任何真实认证都由宿主执行。

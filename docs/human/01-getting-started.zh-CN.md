# 快速开始

本指南说明如何运行框架并添加你的第一个页面。demo 应用（`apps/demo`）是参考示例。

## 环境要求

- Node.js 20 或更高版本
- pnpm 11

## 安装并运行

```bash
pnpm install
pnpm --filter demo dev
```

打开 `http://localhost:5173`。

输入任意非空用户名和密码即可登录。登录过程仅在前端、在内存中完成，不会发起任何 HTTP 请求。demo 中不校验密码。

## 目录结构

工作区使用 pnpm。你运行的应用是 `apps/demo`。框架包位于 `packages/` 下。

| 路径 | 内容 |
| --- | --- |
| `apps/demo/src/main.ts` | 应用初始化：pinia、i18n、router、Provider |
| `apps/demo/src/App.tsx` | 根组件：`AdminProvider` 和路由视图 |
| `apps/demo/src/routes.ts` | 绑定到外壳的路由注册表 |
| `apps/demo/src/pages/` | 宿主自己的页面 |
| `apps/demo/src/themes.ts` | 主题预设 |
| `apps/demo/src/locales/` | 宿主语言消息 |

## 添加页面

页面是在外壳内渲染的 Vue 组件。

1. 创建 `apps/demo/src/pages/demo/hello-demo-page.tsx`：

```tsx
import { defineComponent } from "vue";
import { NH3, NP } from "naive-ui";

export const HelloDemoPage = defineComponent(() => {
  return () => (
    <div>
      <NH3>你好</NH3>
      <NP>这个页面位于管理后台外壳内部。</NP>
    </div>
  );
});
```

2. 在 `apps/demo/src/routes.ts` 中注册路由：

```ts
import { defineAdminRouteRegistry } from "@noob-naive-ui/admin-vue-router";
import { HelloDemoPage } from "./pages/demo/hello-demo-page";

export const demoRouteRegistry = defineAdminRouteRegistry({
  // ... 已有路由
  hello: {
    route: {
      path: "hello",
      component: HelloDemoPage,
    },
  },
});
```

3. 在 `apps/demo/src/App.tsx` 中添加菜单项。菜单函数生成 naive-ui 的 `MenuOption[]`：

```tsx
function createDemoMenu(): MenuOption[] {
  return [
    // ... 已有条目
    createMenuOption("hello", "nav.hello"),
  ];
}
```

4. 在 `apps/demo/src/locales/demo.json` 中添加标签：

```json
{
  "en": { "nav": { "hello": "Hello" } }
}
```

## 添加语言

demo 应用自己管理消息。在 `apps/demo/src/locales/demo.json` 的 `en` 旁边添加 `zh-CN`：

```json
{
  "en": { "nav": { "hello": "Hello" } },
  "zh-CN": { "nav": { "hello": "你好" } }
}
```

外壳通过偏好设置控件切换语言。当前语言会注入全局的 vue-i18n composer。

## 验证

```bash
pnpm --filter demo typecheck
pnpm --filter demo dev
```

typecheck 会在 demo 项目上运行 `tsc -p tsconfig.json --noEmit`。

## 下一步

- [主题](02-theming.zh-CN.md) — 主题预设与 CSS 自定义属性
- [i18n](03-i18n.zh-CN.md) — 组件级 i18n 结构体
- [架构](04-architecture.zh-CN.md) — 包的作用与数据流
- [Admin 路由](06-admin-vue-router.zh-CN.md) — 动态路由与载荷 codec

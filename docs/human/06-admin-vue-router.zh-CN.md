# Admin 路由（Vue Router 集成）

`@noob-naive-ui/admin-vue-router` 把与路由框架无关的 `AdminShell` 连接到 Vue Router。它拥有 Router 实例、路由记录、认证守卫和历史作用域修复。

本指南介绍如何定义路由，尤其是动态路由，以及路由变量如何编码和解码。

## 路由注册表

路由用 `defineAdminRouteRegistry` 声明。每个条目由一个稳定的导航键标识。这个键同时是外壳目的地键和 Vue Router 路由名。

```ts
export const demoRouteRegistry = defineAdminRouteRegistry({
  reports: {
    route: {
      path: "reports",
      component: ReportsDemoPage,
      props: false,
    },
  },
});
```

路由记录不能声明 name。`toRouteRecords()` 从键推导路由名。

## 动态路由

动态路由声明路径参数和一个 codec。codec 在路由无关的目的地载荷与 Vue Router 字段之间转换。

demo 中的示例：带 `reportId` 参数的报告详情。

```ts
import {
  defineAdminRouteRegistry,
  defineAdminRouteUrlCodec,
} from "@noob-naive-ui/admin-vue-router";
import { z } from "zod";

const detailPayloadSchema = z.object({ reportId: z.string().min(1) });

export const demoRouteRegistry = defineAdminRouteRegistry({
  detail: {
    route: {
      path: "detail/:reportId",
      component: DetailDemoPage,
      props: true,
    },
    codec: defineAdminRouteUrlCodec(detailPayloadSchema, {
      encode(payload) {
        return { params: { reportId: payload.reportId } };
      },
      decode(route, _state) {
        const reportId = route.params.reportId;
        return { reportId: typeof reportId === "string" ? reportId : "" };
      },
    }),
  },
});
```

### 载荷结构体

`defineAdminRouteUrlCodec` 接收一个 zod 结构体。结构体在两个方向上负责校验和规范化。`encode` 接收解析后的输出。`decode` 返回由结构体解析的原始数据。

### 编码：载荷到 URL

`encode(payload)` 返回 Vue Router 字段，并合并到生成的有名 location 中：

- `params` — 动态路径参数
- `query` — URL 查询参数
- `hash` — URL 片段
- `state` — 宿主拥有的历史状态

标签页打开时，`toLocation(destination)` 执行：

1. `payloadSchema.parse(destination.payload)` 校验并规范化载荷。
2. `codec.encode(parsed)` 构建路由字段。

### 解码：URL 到载荷

`decode(route, state)` 返回原始载荷数据。`route` 携带解析后的路由：`name`、`params`、`query`、`hash`、`matched`、`meta` 和 `fullPath`。`state` 是历史状态对象。

导航解析时，`fromRoute(route, state)` 执行：

1. 把路由名与注册的导航键匹配。
2. `codec.decode(route, state)` 产生原始载荷数据。
3. `payloadSchema.parse(raw)` 产生规范目的地。

### 无 codec 的路由

没有 codec 时，路由没有参数。`toLocation` 返回 `{ name: navKey }`。`fromRoute` 返回 `{ navKey }`。

### 多个与可选变量

可以同时使用 params 和 query。可选参数需要在路径中加 `?`，并且 `decode` 必须处理缺失情况。字符串查询值可以用 zod 再转换回数值。以下是示例代码：

```ts
const searchPayloadSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
});

export const demoRouteRegistry = defineAdminRouteRegistry({
  search: {
    route: { path: "search", component: SearchDemoPage, props: false },
    codec: defineAdminRouteUrlCodec(searchPayloadSchema, {
      encode(payload) {
        return {
          query: {
            ...(payload.q ? { q: payload.q } : {}),
            page: String(payload.page),
          },
        };
      },
      decode(route, _state) {
        const q = route.query.q;
        const page = route.query.page;
        return {
          ...(typeof q === "string" ? { q } : {}),
          page: typeof page === "string" ? page : "1",
        };
      },
    }),
  },
});
```

### 历史状态

`encode` 可以添加 `state` 字段。适配器还会在历史状态中用一个保留键保存自己的标签页元数据。不要使用那个保留键；如果 codec 使用了，运行时就会抛出错误。

## 端到端流程

1. 外壳请求打开一个目的地。
2. `registry.toLocation(destination)` 解析载荷并编码路由字段。
3. 运行时用导航作用域元数据标记该 location。
4. `router.push` 执行导航。
5. 加载时，`registry.fromRoute(route, state)` 解码回规范目的地，供外壳展示。

## 路由器插件

`createAdminRouterPlugin` 拥有 Router：

```ts
const adminRouter = createAdminRouterPlugin({
  history: createWebHistory(),
  registry: demoRouteRegistry,
  homeDestination: { navKey: "dashboard" },
  describeDestination: describeDemoDestination,
  createPageId: () => crypto.randomUUID(),
  getNavigationScopeId: () => navigationScopeId.value,
});

const app = createApp(App).use(pinia).use(i18n).use(adminRouter);
```

插件构建登录路由和外壳路由，把注册表中的记录挂载为外壳的子路由，并安装：

- 认证守卫
- 历史作用域守卫
- 认证切换路由
- 导航错误报告器

`additionalRoutes` 添加公开的兄弟路由。插件会拒绝名称或路径冲突。`ADMIN_DISPOSE_KEY` 提供清理函数。

## 参考

- `defineAdminRouteRegistry` / `AdminRouteRegistry` — 路由注册表 API
- `defineAdminRouteUrlCodec` / `AdminRouteUrlCodec` — 载荷与 URL 的双向转换
- `createAdminRouterPlugin` — 工厂拥有的 Router 与守卫
- `createAdminShellVueRouterRuntime` — 导航控制器与作用域修复
- Demo：`apps/demo/src/routes.ts`、`apps/demo/src/main.ts`

## 下一步

- [架构](04-architecture.zh-CN.md) — 包的作用与数据流

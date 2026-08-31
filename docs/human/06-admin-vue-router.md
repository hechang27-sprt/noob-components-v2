# Admin Router (Vue Router integration)

`@noob-naive-ui/admin-vue-router` connects the router-neutral `AdminShell`
to Vue Router. It owns the Router instance, the route records, the auth
guards, and history-scope repair.

This guide covers defining routes, especially dynamic routes, and how route
variables are encoded and decoded.

## Route registry

Routes are declared with `defineAdminRouteRegistry`. Each entry is keyed by
a stable nav key. The key becomes both the shell destination key and the
Vue Router route name.

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

The route record must not declare a name. `toRouteRecords()` derives the
names from the keys.

## Dynamic routes

A dynamic route declares path parameters and a codec. The codec converts
between the router-neutral destination payload and Vue Router fields.

Example from the demo, a report detail with a `reportId` parameter:

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

### The payload schema

`defineAdminRouteUrlCodec` takes a zod schema. The schema owns validation
and normalization in both directions. `encode` receives the parsed output.
`decode` returns raw data that the schema parses.

### Encode: payload to URL

`encode(payload)` returns Vue Router fields merged into the generated named
location:

- `params` — dynamic path parameters
- `query` — URL query parameters
- `hash` — URL fragment
- `state` — host-owned history state

When a tab opens, `toLocation(destination)` runs:

1. `payloadSchema.parse(destination.payload)` validates and normalizes the
   payload.
2. `codec.encode(parsed)` builds the route fields.

### Decode: URL to payload

`decode(route, state)` returns raw payload data. `route` carries the
resolved route: `name`, `params`, `query`, `hash`, `matched`, `meta`, and
`fullPath`. `state` is the history state object.

When navigation resolves, `fromRoute(route, state)` runs:

1. The route name is matched against the registered nav keys.
2. `codec.decode(route, state)` produces raw payload data.
3. `payloadSchema.parse(raw)` produces the canonical destination.

### Codec-less routes

Without a codec, the route is parameterless. `toLocation` returns
`{ name: navKey }`. `fromRoute` returns `{ navKey }`.

### Multiple and optional variables

Use params and query together. Optional parameters need a `?` in the path,
and `decode` must handle absence. String query values can be coerced back
with zod. Illustrative example:

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

### History state

`encode` may add `state` fields. The adapter also stores its own tab
metadata in history state under a reserved key. Do not use that reserved
key; the runtime throws if a codec does.

## End-to-end flow

1. The shell asks to open a destination.
2. `registry.toLocation(destination)` parses the payload and encodes the
   route fields.
3. The runtime stamps the location with navigation-scope metadata.
4. `router.push` navigates.
5. On load, `registry.fromRoute(route, state)` decodes back to the
   canonical destination for the shell to display.

## The router plugin

`createAdminRouterPlugin` owns the Router:

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

The plugin builds the login route and the shell route, mounts the
registry's records as shell children, and installs:

- the auth guard,
- the history-scope guard,
- the auth-transition routing,
- the navigation error reporter.

`additionalRoutes` adds public sibling routes. The plugin rejects name or
path collisions. `ADMIN_DISPOSE_KEY` provides the cleanup function.

## Reference

- `defineAdminRouteRegistry` / `AdminRouteRegistry` — route registry API
- `defineAdminRouteUrlCodec` / `AdminRouteUrlCodec` — payload to URL and back
- `createAdminRouterPlugin` — factory-owned Router and guards
- `createAdminShellVueRouterRuntime` — navigation controller and scope repair
- Demo: `apps/demo/src/routes.ts`, `apps/demo/src/main.ts`

## What's next

- [Architecture](04-architecture.md) — package roles and data flow

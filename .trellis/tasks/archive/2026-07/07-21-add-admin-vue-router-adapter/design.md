# Design: `@noob-naive-ui/admin-vue-router`

## Boundary

`@noob-naive-ui/admin-vue-router` is an optional Vue Router adapter. It imports types/contracts from `@noob-naive-ui/admin` and Vue Router APIs/types, but the admin core remains router-neutral.

The adapter owns only reversible conversion between a shell destination and Vue Router location state. It does not create a router, register records, call `push`, install guards, construct tabs, maintain browser history, or decide tab presentation.

## Registry contract

```ts
const routes = defineAdminRouteRegistry({
  dashboard: {
    route: {
      path: "/",
      component: DashboardPage,
    },
  },
  detail: {
    route: {
      path: "/detail/:reportId",
      component: DetailPage,
      props: true,
    },
    codec: {
      encode(params) {
        const reportId = requireReportId(params?.reportId);
        return { params: { reportId } };
      },
      decode(route) {
        return { reportId: requireReportId(route.params.reportId) };
      },
    },
  },
});
```

The registry map key is the sole identity:

```text
AdminShellDestination.navKey === Vue Router route.name
```

Each item has a name-free Vue Router record and optional codec. The returned registry exposes:

```ts
routes.navKey                 // inferred union: "dashboard" | "detail"
routes.getDefinition(navKey)  // the original route/codec definition
routes.toRouteRecords()       // named RouteRecordRaw[]
routes.toLocation(destination) // RouteLocationNamedRaw
routes.fromRoute(route)       // AdminShellDestination | null
```

The adapter injects `name` from the registry key while preserving host route path, component, props, nested children, aliases, and other route-record fields.

## Codec semantics

A codec is directional and explicit:

```ts
type AdminRouteUrlCodec = {
  encode(params: AdminShellDestination["params"]): {
    params?: RouteLocationNamedRaw["params"];
    query?: RouteLocationNamedRaw["query"];
    hash?: string;
  };
  decode(route: RouteLocationNormalizedLoaded):
    | AdminShellDestination["params"]
    | undefined;
};
```

- `encode` owns validation and maps destination params into explicit path/query/hash state.
- `decode` reconstructs canonical params from normalized URL state.
- When codec is omitted, the adapter uses a parameterless codec: it ignores destination params in forward conversion and returns no params in reverse conversion.
- Codec exceptions intentionally propagate for registered routes. They identify malformed URL state or host-provided invalid destination data.

`fromRoute` returns `null` for a non-string or unregistered route name. This permits a host router to include public routes such as `/login`.

## URL-authoritative restoration

The host persists `AdminShellTabDescriptor` in browser history, but its destination must be canonicalized from the current route:

```ts
const destination = routes.fromRoute(router.currentRoute.value);
if (!destination) return null;

const restored = historyDescriptor &&
  historyDescriptor.nav.navKey === destination.navKey
  ? { ...historyDescriptor, nav: destination }
  : describeDestination(crypto.randomUUID(), destination);
```

The adapter does not create the descriptor, choose its ID, or apply its tab policy. A starter-owned presentation policy converts destination to `label` / `closable` when a descriptor is needed.

## Demo ownership after migration

```text
packages/admin-vue-router
  registry / codec / location conversion only

apps/demo/routes.tsx
  page components and route + codec registration

apps/demo/admin-navigation.ts
  host-owned tab presentation map and descriptor factory

apps/demo/App.tsx
  router push, history state persistence, navigation adapter, auth integration
```

The demo tab-presentation map is exhaustive over the registry's inferred `navKey` union. It is separate from router records and URL codecs.

## Package setup

Create `packages/admin-vue-router` following the existing admin library pattern:

- ESM Vite library entry `src/index.ts`;
- declaration emission via `tsc`;
- Vitest node tests;
- `vue`, `vue-router`, and `@noob-naive-ui/admin` peer dependencies;
- local `vue` and `vue-router` development dependencies;
- Rollup externals for all peer packages.

The demo depends on the new workspace package. Admin core package metadata and imports remain unchanged.

## Failure semantics

- `toLocation` with unknown `navKey` throws ordinary `Error` naming the unknown key.
- `fromRoute` with non-string/unregistered name returns `null`.
- Registered route codec decode errors propagate unchanged.
- Omitted codec never throws solely because destination params are non-empty; those params are omitted from location output and absent from reverse reconstruction.

## Migration

1. Move generic registry/codec definitions from demo `routes.tsx` into the adapter package.
2. Retain demo-specific paths/components/codecs in `routes.tsx` through the adapter registry API.
3. Move demo `label`/`closable` policy and descriptor creation out of the router registry into `admin-navigation.ts`.
4. Replace demo-local destination/location helpers with bound adapter methods.
5. Preserve current URL and browser history behavior.

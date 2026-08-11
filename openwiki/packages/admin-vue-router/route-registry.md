---
type: concept
title: Admin Route Registry and URL Codecs
description: How hosts bind navigation target keys to name-free route records and reversible Zod payload codecs, and how destinations convert to and from Vue Router state.
tags: [admin, vue-router, routes, zod]
---

# Admin Route Registry and URL Codecs

`route-registry.ts` binds host-defined **navigation target keys** to child route
records and optional reversible payload codecs. Registry keys are stable
navigation target keys represented as generated Vue Router route names — the
single place where `AdminShellDestination.navKey` becomes a route name.

## `defineAdminRouteRegistry(definitions)`

```ts
type AdminRouteDefinition<TSchema> = {
  route: Omit<RouteRecordRaw, "name">;   // host record WITHOUT a name
  codec?: AdminRouteUrlCodec<TSchema>;   // optional reversible payload conversion
};

export const registry = defineAdminRouteRegistry({
  dashboard: { route: { path: "", component: DashboardDemoPage, props: false } },
  detail: {
    route: { path: "detail/:reportId", component: DetailDemoPage, props: true },
    codec: defineAdminRouteUrlCodec(payloadSchema, { encode, decode }),
  },
});
```

The returned bound registry exposes:

- `navKeys` — the stable keys, usable as both shell nav keys and generated route
  names (typed as `AdminRouteRegistryNavKey<TDefinitions>`).
- `getDefinition(navKey)` — throws `Unknown admin route navKey "..."` for
  unregistered keys.
- `toLocation(destination)` — validates the payload through the codec's schema,
  encodes it, and returns `{ name: navKey, ...encoded }` for `router.push(...)`.
  Parameterless definitions yield `{ name: navKey }`.
- `fromRoute(route, state)` — reconstructs the canonical destination from a
  resolved/loaded route; returns `null` for non-admin routes; validates decoded
  data through the schema (Zod failures propagate); when the parsed payload is
  falsy it emits **`{ navKey: route.name }` with the payload omitted** (so a
  falsy-but-valid payload, e.g. a `z.optional()` absence, round-trips to a
  parameterless destination).
- `toRouteRecords()` — derives named host route records from registry keys
  (spreads the host record and stamps `name: navKey`).

### Invariants

- Host records must not declare `route.name` — the factory throws at
  construction time ("must not declare route.name"); name ownership belongs to
  the registry keys.
- The definition map is built with `Object.entries`, so **inherited
  `Object.prototype` keys are not registered**: `getDefinition("constructor")`
  throws and `fromRoute({ name: "toString" })` returns `null`
  ("rejects inherited route-definition keys").
- Payload validation runs in **both directions** (`toLocation` before encode,
  `fromRoute` after decode), so canonical payloads never enter Vue Router
  unvalidated and untrusted route/history data is normalized on the way back.
- A route without a codec silently drops any destination payload
  ("silently drops payload for a route without a codec").

## `defineAdminRouteUrlCodec(payloadSchema, codec)`

Contextually types `encode`/`decode` from the schema so method payload types are
inferred, and returns the complete codec:

```ts
type AdminRouteUrlCodec<TPayloadSchema> = {
  payloadSchema: TPayloadSchema;                       // zod normalization gate
  encode: (payload: z.output<TPayloadSchema>) => VueRouterNavParams;
  decode: (route: RouteReadInput, state: HistoryState) => unknown;
};
```

- `VueRouterNavParams` is the constrained field set the codec may emit: `params`,
  `query`, `hash`, and host-owned `state` — merged into the generated named
  location by `toLocation`.
- `RouteReadInput` is the shared route boundary: the fields of a
  `RouteLocationResolved` that are meaningful for decoding (`name`, `params`,
  `query`, `hash`, `matched`, `meta`, `redirectedFrom`, `fullPath`).
- `encode` receives the **already-schema-validated and normalized** payload;
  `decode` returns **raw** data passed through the schema. Codecs may represent
  payload identity in the URL (params), in host-owned history state, or a mix —
  see the demo `detail` codec (URL `reportId` param) and the navigation tests'
  `detail` codec (URL `reportId` + history-state `section`).

### Codec contract details

- The reserved key `"_noobAdminShell"` is the adapter's history-state namespace;
  `toScopedLocation` throws if a codec's `state` collides with it (test:
  "rejects codec collisions with the reserved metadata namespace").
- The schema can explicitly accept an absent payload
  (`z.optional`-style schemas), supporting history-only representation with
  schema defaults/transforms (test: "supports history-only representation and
  schema defaults/transforms").

## Destination equality and payload normalization

The shell treats two destinations as the same page only when navKey **and**
canonical payload are equal (deep `isEqual` in the admin package). The registry
guarantees canonicalization at both boundaries: any payload reaching Vue Router
was parsed by `payloadSchema`, and any payload reconstructed from a route was
re-validated by the same schema — so equal URLs yield equal canonical payloads,
and unequal payloads yield distinct URLs (when the codec encodes identity into
params/state).

## Tests — `tests/route-registry.test.ts`

- derives route names from nav keys while preserving host route records;
- maps URL-only payload and validates decoded route data;
- supports history-only representation and schema defaults/transforms;
- supports mixed URL/history representation with codec-owned precedence;
- silently drops payload for a route without a codec;
- supports a codec whose schema explicitly accepts absent payload;
- returns null for unregistered routes and throws for unknown destinations;
- propagates unchanged Zod failures before encode and after decode;
- rejects inherited route-definition keys.

## Related

- [admin-vue-router overview](overview.md)
- [Navigation runtime](navigation-runtime.md) — consumes `toLocation`/`fromRoute`
- [Plugin](plugin.md) — consumes `toRouteRecords()` for the shell children
- [Demo host](../../apps/demo.md) — `demoRouteRegistry` with the `detail` codec

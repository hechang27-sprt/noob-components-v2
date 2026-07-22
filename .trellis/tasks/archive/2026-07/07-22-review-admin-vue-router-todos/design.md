# Design

## Public codec contract

Rename the codec output to the concrete host-facing name:

```ts
export type VueRouterNavParams = {
  params?: RouteLocationNamedRaw["params"];
  query?: RouteLocationNamedRaw["query"];
  hash?: string;
  state?: HistoryState;
};
```

`VueRouterNavParams` describes the fields a route codec contributes to one Vue Router navigation. `params` specifically means Vue Router path params; `state` means browser-history state.

Update the codec contract bidirectionally:

```ts
export type AdminRouteUrlCodec<
  TPayloadSchema extends z.ZodType<
    AdminShellDestination["payload"],
    unknown
  >,
> = {
  payloadSchema: TPayloadSchema;
  encode(
    payload: z.output<TPayloadSchema>,
  ): VueRouterNavParams;

  decode(
    route: RouteLocationNormalizedLoaded,
    state: HistoryState,
  ): z.input<TPayloadSchema>;
};
```

Update registry reverse conversion to `registry.fromRoute(route, state)`. Each codec may use URL-only, history-only, or mixed storage and defines its own canonical reconstruction precedence. Parameterless routes ignore both inputs and decode no payload.

The schema is codec-owned because payload validation and Vue Router representation are one reversible route contract. A payload-bearing route already needs a codec whether it chooses URL, history state, or both. Parameterless routes may omit the codec as before.

Forward conversion performs `payloadSchema.parse(destination.payload)` before `encode`, so defaults/transforms produce the canonical typed payload consumed by the encoder. Reverse conversion passes `decode(route, state)` through the same schema before constructing `AdminShellDestination`; decoded URL/history data is never trusted directly.

`z.output<TPayloadSchema>` types `encode` after normalization. `z.input<TPayloadSchema>` types `decode` before normalization. Required schemas reject absent payload; `.optional()`, `.default()`, and transforms retain standard Zod semantics. Zod errors propagate unchanged.

The schema output is constrained to `Readonly<Record<string, unknown>> | undefined`, preserving the public destination contract. A codec cannot normalize payload into a primitive, array, class instance, or other non-record output.

Because Zod types cross the public codec surface, `@noob-naive-ui/admin-vue-router` declares compatible Zod 4 as a peer dependency and uses the root workspace installation for development.

Registry definition generics must preserve each route's concrete schema type so inline `encode(payload)` receives the schema output without a cast. Add a compile-time `expectTypeOf` assertion alongside runtime tests; do not require callers to annotate `AdminRouteUrlCodec<typeof schema>` merely to recover inference.

## `AdminRouteRegistry` boundary

The registry remains effect-free and owns no router. `toLocation(destination)` returns a named location containing every codec-emitted field, including `state`. `fromRoute(route, state)` reconstructs the destination from the normalized route and current history state.

## Higher-level Vue Router navigation adapter

Add a separate factory:

```ts
export type AdminShellVueRouterNavigationOptions<
  TDefinitions extends AdminRouteDefinitions,
> = {
  router: Router;
  registry: AdminRouteRegistry<TDefinitions>;
  describeDestination: (
    id: string,
    destination: AdminShellDestination,
  ) => AdminShellTabDescriptor;
  createPageId: () => string;
};

export function createAdminShellVueRouterNavigation<
  TDefinitions extends AdminRouteDefinitions,
>(
  options: AdminShellVueRouterNavigationOptions<TDefinitions>,
): AdminShellNavigation;
```

It accepts an existing router and returns only `AdminShellNavigation`. It does not create/proxy the router, register routes, or install guards. Host callbacks retain page-instance identity and tab-presentation policy.

## History-state ownership and reserved namespace

Codec-emitted state stays top-level and host-owned. The adapter adds only page-instance metadata under the default reserved `_noobAdminShell` namespace:

```ts
{
  selectedSection: "summary", // codec-owned
  _noobAdminShell: {
    tab: {
      id: "tab-123",
      label: "Report quarterly-2021",
      closable: true,
    },
  },
}
```

The key is never repeated as an implementation literal. Resolve it through variables:

```ts
const DEFAULT_ADMIN_SHELL_HISTORY_STATE_KEY = "_noobAdminShell";
const historyStateKey = DEFAULT_ADMIN_SHELL_HISTORY_STATE_KEY;
```

All collision checks, writes, and reads use `historyStateKey`. This preserves one implementation seam for a later additive configuration option without exposing it now.

Persisted metadata contains only:

```ts
type PersistedAdminShellTab = Pick<
  AdminShellTabDescriptor,
  "id" | "label" | "closable"
>;
```

It never contains `navKey`, `nav.payload`, or shell-private fields. The adapter rejects codec state containing `historyStateKey` instead of silently overwriting host data.

The adapter reads current state from `router.options.history.state`, not `window.history.state`, so memory and browser history use the same router abstraction. Vue Router marks `RouterHistory` Alpha, so this dependency stays isolated here.

Sources:

- Vue Router `RouterHistory.state`: https://router.vuejs.org/api/interfaces/routerhistory#state
- Vue Router navigation state association: https://router.vuejs.org/api/interfaces/routerhistory#push
- MDN `pushState`: https://developer.mozilla.org/en-US/docs/Web/API/History/pushState
- MDN `structuredClone`: https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone

## Persisted metadata validation

The persisted value is adapter-private, so `@noob-naive-ui/admin-vue-router` owns a private Zod schema for `id`, `label`, and optional `closable`. Parsing strips unrelated fields and treats malformed metadata as absent. Core admin gains no persistence parser or public Zod schema.

## Active descriptor restoration

The returned `navigation.active` getter:

1. Reads `router.currentRoute.value` and `router.options.history.state`.
2. Calls `registry.fromRoute(route, state)` and returns `null` outside the registry.
3. Parses only `state[historyStateKey].tab`.
4. Combines valid metadata with the codec-reconstructed destination.
5. Otherwise reuses one closure-local fallback for the same current route/history snapshot.
6. Otherwise calls `createPageId()` and `describeDestination()`.

Because metadata contains no destination, no persisted `navKey` comparison exists. URL/history destination precedence is codec-owned. The unstamped cache keys on the current route and history-state object snapshots rather than only `navKey`, preserving distinct same-route entries.

## Navigation request handling
- `open`: apply host presentation to the shell candidate ID.
- `activate`: use the exact existing descriptor.
- `close` with fallback: use the fallback descriptor.
- `close` without fallback: return `{ active: null }` without navigation.

For a destination-bearing request:

1. Call `registry.toLocation(descriptor.nav)`.
2. Read codec-emitted `location.state`.
3. Reject a collision with `historyStateKey`.
4. Clone adapter metadata with `structuredClone()`.
5. Merge codec state and metadata at `[historyStateKey]`.
6. Call `router.push()` with `force: true` and replacement for close-current opens.
7. Re-read `navigation.active` so the response uses codec-canonical destination payload.

## Demo migration

`App.tsx` constructs one adapter with the router, registry, `describeDemoDestination`, and `crypto.randomUUID` callback. Remove local cloning, history parsing, fallback state, destination restoration, and request handling. `admin-navigation.ts` remains the tab-presentation owner.

The detail codec stays URL-only to demonstrate deep linking. Shared tests separately prove state-only and mixed policies.

## Compatibility and errors

- Clean pre-release rename from `AdminRouteUrlState` to `VueRouterNavParams`; no alias.
- `fromRoute` gains required history state.
- Registered codec and host callback errors propagate.
- Reserved namespace collisions throw a clear ordinary `Error`.
- `structuredClone` failures propagate.
- Malformed metadata falls back to host descriptor construction; malformed codec state follows codec policy.

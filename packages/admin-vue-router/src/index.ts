import type {
  AdminShellDestination,
  AdminShellNavigation,
  AdminShellTabDescriptor,
} from "@noob-naive-ui/admin";
import type {
  HistoryState,
  RouteLocationNamedRaw,
  RouteLocationNormalizedLoaded,
  RouteRecordRaw,
  Router,
} from "vue-router";
import { z } from "zod";

/** Describes the router-neutral payload shape accepted by the shared route boundary. */
type AdminRoutePayload = AdminShellDestination["payload"];

/** Describes a Zod contract whose normalized output remains a shell destination payload. */
type AdminRoutePayloadSchema = z.ZodType<AdminRoutePayload, unknown>;

/** Describes concrete Vue Router fields emitted by one registered admin destination. */
export type VueRouterNavParams = {
  /** Supplies declared dynamic path parameters for a named route. */
  params?: RouteLocationNamedRaw["params"];
  /** Supplies explicit URL query parameters. */
  query?: RouteLocationNamedRaw["query"];
  /** Supplies an optional URL fragment. */
  hash?: string;
  /** Supplies host-owned browser-history state associated with the route entry. */
  state?: HistoryState;
};

/** Validates and converts one destination payload to and from Vue Router state. */
export type AdminRouteUrlCodec<
  TPayloadSchema extends AdminRoutePayloadSchema = AdminRoutePayloadSchema,
> = {
  /** Validates and normalizes payload in both conversion directions. */
  payloadSchema: TPayloadSchema;
  /**
   * Encodes canonical destination payload into concrete Vue Router fields.
   *
   * @param payload - Schema-validated and normalized router-neutral payload.
   * @returns Vue Router fields merged into the generated named location.
   */
  encode: (payload: z.output<TPayloadSchema>) => VueRouterNavParams;
  /**
   * Decodes untrusted route and history data for schema validation.
   *
   * @param route - Vue Router's normalized current route.
   * @param state - Current state from the router's history abstraction.
   * @returns Raw payload passed through the codec's schema.
   */
  decode: (
    route: RouteLocationNormalizedLoaded,
    state: HistoryState,
  ) => z.input<TPayloadSchema>;
};

/**
 * Defines one codec while inferring method payload types from its schema.
 *
 * @param payloadSchema - Zod schema owning payload validation and normalization.
 * @param codec - Encode/decode methods contextually typed from the supplied schema.
 * @returns A complete route codec ready for a registry definition.
 */
export function defineAdminRouteUrlCodec<
  const TPayloadSchema extends AdminRoutePayloadSchema,
>(
  payloadSchema: TPayloadSchema,
  codec: Omit<AdminRouteUrlCodec<TPayloadSchema>, "payloadSchema">,
): AdminRouteUrlCodec<TPayloadSchema> {
  return { payloadSchema, ...codec };
}

/** Defines host-owned route data and optional payload conversion for one nav key. */
export type AdminRouteDefinition<
  TPayloadSchema extends AdminRoutePayloadSchema = AdminRoutePayloadSchema,
> = {
  /** Supplies a host-owned Vue Router record without a name. */
  route: Omit<RouteRecordRaw, "name">;
  /** Converts payload to and from Vue Router state; omission means parameterless. */
  codec?: AdminRouteUrlCodec<TPayloadSchema>;
};

/** Describes the input map accepted by a bound admin route registry. */
export type AdminRouteDefinitions = Readonly<
  Record<string, AdminRouteDefinition>
>;

/** Applies inferred sibling schemas to contextual codec methods. */
type ValidatedAdminRouteDefinitions<TDefinitions> = {
  readonly [TKey in keyof TDefinitions]: TDefinitions[TKey] extends {
    codec: { payloadSchema: infer TSchema extends AdminRoutePayloadSchema };
  }
    ? {
        route: Omit<RouteRecordRaw, "name">;
        codec: AdminRouteUrlCodec<TSchema>;
      }
    : { route: Omit<RouteRecordRaw, "name">; codec?: undefined };
};

/** Extracts the stable nav-key union from a route registry definition map. */
export type AdminRouteRegistryNavKey<
  TDefinitions extends AdminRouteDefinitions,
> = keyof TDefinitions & string;

/** Provides a reusable bound conversion API for one host-owned route registry. */
export type AdminRouteRegistry<TDefinitions extends AdminRouteDefinitions> = {
  /** Lists the stable keys that are both shell nav keys and generated route names. */
  readonly navKeys: readonly AdminRouteRegistryNavKey<TDefinitions>[];
  /**
   * Gets the host definition registered for a nav key.
   *
   * @param navKey - Stable shell destination key and Vue Router route name.
   * @returns The matching route definition.
   * @throws When the host did not register the nav key.
   */
  getDefinition: (navKey: string) => AdminRouteDefinition;
  /**
   * Converts a shell destination into a named Vue Router location.
   *
   * @param destination - Router-neutral shell destination to validate and encode.
   * @returns A named location with fields supplied by the route codec.
   */
  toLocation: (destination: AdminShellDestination) => RouteLocationNamedRaw;
  /**
   * Reconstructs a canonical shell destination from a matched host route.
   *
   * @param route - Current normalized Vue Router route.
   * @param state - Current state from the router's history abstraction.
   * @returns A canonical destination, or null for a non-admin route.
   */
  fromRoute: (
    route: RouteLocationNormalizedLoaded,
    state: HistoryState,
  ) => AdminShellDestination | null;
  /** Produces host route records whose names derive from registry keys. */
  toRouteRecords: () => RouteRecordRaw[];
};

/**
 * Binds host route definitions to reversible AdminShell destination conversion.
 *
 * @param definitions - Name-free host route records keyed by stable nav-key identity.
 * @returns One immutable registry API bound to the supplied definitions.
 */
export function defineAdminRouteRegistry<
  const TInput extends Readonly<
    Record<string, { route: Omit<RouteRecordRaw, "name">; codec?: unknown }>
  >,
>(
  definitions: TInput & ValidatedAdminRouteDefinitions<TInput>,
): AdminRouteRegistry<ValidatedAdminRouteDefinitions<TInput>> {
  type TDefinitions = ValidatedAdminRouteDefinitions<TInput>;
  const entries = Object.entries(definitions) as [
    AdminRouteRegistryNavKey<TDefinitions>,
    AdminRouteDefinition,
  ][];
  const definitionsByNavKey = new Map<string, AdminRouteDefinition>(entries);

  for (const [navKey, definition] of entries) {
    if ("name" in definition.route) {
      throw new Error(
        `Admin route definition "${navKey}" must not declare route.name.`,
      );
    }
  }

  /** Resolves a definition or reports the invalid host destination key clearly. */
  function getDefinition(navKey: string): AdminRouteDefinition {
    const definition = definitionsByNavKey.get(navKey);
    if (!definition) {
      throw new Error(`Unknown admin route navKey "${navKey}".`);
    }
    return definition;
  }

  /** Converts one destination to its generated named Vue Router location. */
  function toLocation(
    destination: AdminShellDestination,
  ): RouteLocationNamedRaw {
    const definition = getDefinition(destination.navKey);
    if (!definition.codec) return { name: destination.navKey };
    const payload = definition.codec.payloadSchema.parse(destination.payload);
    return { name: destination.navKey, ...definition.codec.encode(payload) };
  }

  /** Reconstructs one canonical destination from route and history state. */
  function fromRoute(
    route: RouteLocationNormalizedLoaded,
    state: HistoryState,
  ): AdminShellDestination | null {
    if (typeof route.name !== "string" || !definitionsByNavKey.has(route.name))
      return null;
    const definition = getDefinition(route.name);
    if (!definition.codec) return { navKey: route.name };
    const payload = definition.codec.payloadSchema.parse(
      definition.codec.decode(route, state),
    );
    return payload ? { navKey: route.name, payload } : { navKey: route.name };
  }

  /** Derives named host route records from stable registry keys. */
  function toRouteRecords(): RouteRecordRaw[] {
    return entries.map(([navKey, definition]) => ({
      ...definition.route,
      name: navKey,
    })) as RouteRecordRaw[];
  }

  return {
    navKeys: entries.map(([navKey]) => navKey),
    getDefinition,
    toLocation,
    fromRoute,
    toRouteRecords,
  };
}

/** Default reserved history-state namespace owned by the navigation adapter. */
const DEFAULT_ADMIN_SHELL_HISTORY_STATE_KEY = "_noobAdminShell";

/** Validates the adapter-owned subset persisted for one tab instance. */
const persistedAdminShellTabSchema = z.object({
  id: z.string(),
  label: z.string(),
  closable: z.boolean().optional(),
});

/** Validates adapter-owned history metadata for one authenticated navigation scope. */
const persistedAdminShellStateSchema = z.object({
  scopeId: z.string(),
  tab: persistedAdminShellTabSchema,
});

/** Describes validated adapter metadata stored in one history entry. */
type PersistedAdminShellState = z.output<typeof persistedAdminShellStateSchema>;

/** Describes the minimal tab presentation persisted by the adapter. */
type PersistedAdminShellTab = z.output<typeof persistedAdminShellTabSchema>;

/** Supplies host-owned dependencies for Vue Router page-instance navigation. */
export type AdminShellVueRouterNavigationOptions<
  TDefinitions extends AdminRouteDefinitions,
> = {
  /** Supplies the existing host router whose route and history state are authoritative. */
  router: Router;
  /** Supplies deterministic destination conversion for the host route registry. */
  registry: AdminRouteRegistry<TDefinitions>;
  /** Supplies application-owned tab label and closability policy. */
  describeDestination: (
    id: string,
    destination: AdminShellDestination,
  ) => AdminShellTabDescriptor;
  /** Creates page-instance identity for direct routes without persisted metadata. */
  createPageId: () => string;
  /** Returns the host-owned transient scope for the current authenticated session. */
  getNavigationScopeId: () => string;
};

/** Extends shell navigation with host-guard location construction. */
export type AdminShellVueRouterNavigation = AdminShellNavigation & {
  /** Builds a route location stamped for the current navigation scope. */
  toScopedLocation: (
    descriptor: AdminShellTabDescriptor,
  ) => RouteLocationNamedRaw;
};

/**
 * Coordinates AdminShell page instances with an existing Vue Router.
 *
 * @param options - Router, registry, and host-owned identity/presentation callbacks.
 * @returns A stable navigation adapter backed by current route and history state.
 */
export function createAdminShellVueRouterNavigation<
  TDefinitions extends AdminRouteDefinitions,
>(
  options: AdminShellVueRouterNavigationOptions<TDefinitions>,
): AdminShellVueRouterNavigation {
  const {
    router,
    registry,
    describeDestination,
    createPageId,
    getNavigationScopeId,
  } = options;
  const historyStateKey = DEFAULT_ADMIN_SHELL_HISTORY_STATE_KEY;
  const fallbackPageIds = new Map<string, string>();

  /** Reads and validates adapter metadata from the current navigation scope. */
  function readPersistedState(
    state: HistoryState,
  ): PersistedAdminShellState | null {
    const parsed = persistedAdminShellStateSchema.safeParse(
      state[historyStateKey],
    );
    if (!parsed.success || parsed.data.scopeId !== getNavigationScopeId()) {
      return null;
    }
    return parsed.data;
  }

  /** Derives stable identity for one unstamped browser-history entry. */
  function fallbackEntryKey(
    route: RouteLocationNormalizedLoaded,
    state: HistoryState,
  ): string {
    const position = state.position;
    return `${typeof position === "number" ? position : "initial"}:${route.fullPath}`;
  }

  /** Resolves the current canonical descriptor from router and history authority. */
  function currentDescriptor(): AdminShellTabDescriptor | null {
    const route = router.currentRoute.value;
    const state = router.options.history.state;
    const destination = registry.fromRoute(route, state);
    if (!destination) return null;
    const persisted = readPersistedState(state)?.tab;
    if (persisted) return { ...persisted, nav: destination };
    const entryKey = fallbackEntryKey(route, state);
    let pageId = fallbackPageIds.get(entryKey);
    if (!pageId) {
      pageId = createPageId();
      fallbackPageIds.set(entryKey, pageId);
    }
    return describeDestination(pageId, destination);
  }

  /** Converts one shell request into the exact descriptor that must become active. */
  function descriptorForRequest(
    request: Parameters<AdminShellNavigation["handleNavigation"]>[0],
  ): AdminShellTabDescriptor | null {
    if (request.kind === "open") {
      return describeDestination(request.candidate.id, request.candidate.nav);
    }
    if (request.kind === "activate") return request.destination;
    return request.destination;
  }

  /** Builds one destination with adapter metadata for the current scope. */
  function toScopedLocation(
    descriptor: AdminShellTabDescriptor,
  ): RouteLocationNamedRaw {
    const location = registry.toLocation(descriptor.nav);
    const codecState = location.state ?? {};
    if (Object.hasOwn(codecState, historyStateKey)) {
      throw new Error(
        `Admin route state must not use reserved key "${historyStateKey}".`,
      );
    }
    const tab = structuredClone<PersistedAdminShellTab>({
      id: descriptor.id,
      label: descriptor.label,
      ...(descriptor.closable === undefined
        ? {}
        : { closable: descriptor.closable }),
    });
    return {
      ...location,
      force: true,
      state: {
        ...codecState,
        [historyStateKey]: { scopeId: getNavigationScopeId(), tab },
      },
    };
  }

  /** Persists one scoped descriptor through Vue Router. */
  async function navigateToDescriptor(
    descriptor: AdminShellTabDescriptor,
    replace: boolean,
  ): Promise<void> {
    await router.push({ ...toScopedLocation(descriptor), replace });
  }

  return {
    /** Returns the descriptor reconstructed from current router authority. */
    get active() {
      return currentDescriptor();
    },
    toScopedLocation,
    /** Executes open, activate, and close requests through one router effect. */
    async handleNavigation(request) {
      const descriptor = descriptorForRequest(request);
      if (
        request.kind === "close" &&
        currentDescriptor()?.id !== request.closing.id
      ) {
        return { active: currentDescriptor() };
      }
      if (!descriptor) return { active: null };
      await navigateToDescriptor(
        descriptor,
        request.kind === "open" && request.closeCurrent,
      );
      return { active: currentDescriptor() };
    },
  };
}

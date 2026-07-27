import { type AdminShellDestination } from "@noob-naive-ui/admin";
import type {
  HistoryState,
  RouteLocationNamedRaw,
  RouteLocationResolved,
  RouteRecordRaw,
} from "vue-router";
import { z } from "zod";

/** Describes the route fields shared by resolved (synthetic) and loaded routes. */
export type RouteReadInput = Pick<
  RouteLocationResolved,
  | "name"
  | "params"
  | "query"
  | "hash"
  | "matched"
  | "meta"
  | "redirectedFrom"
  | "fullPath"
>;

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
   * @param route - Vue Router route data (resolved or loaded).
   * @param state - Current state from the router's history abstraction.
   * @returns Raw payload passed through the codec's schema.
   */
  decode: (route: RouteReadInput, state: HistoryState) => unknown;
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
    route: RouteReadInput,
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

  /** Converts one destination to its generated named Vue Router location to be used in `router.push(...)`. */
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
    route: RouteReadInput,
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

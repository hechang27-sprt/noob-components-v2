import type { AdminShellDestination } from "@noob-naive-ui/admin";
import type {
  RouteLocationNamedRaw,
  RouteLocationNormalizedLoaded,
  RouteRecordRaw,
} from "vue-router";

/** Describes URL state emitted by one registered admin destination. */
export type AdminRouteUrlState = {
  /** Supplies declared dynamic path parameters for a named route. */
  params?: RouteLocationNamedRaw["params"];
  /** Supplies explicit URL query parameters. */
  query?: RouteLocationNamedRaw["query"];
  /** Supplies an optional URL fragment. */
  hash?: string;
};

/** Converts one destination's router-neutral params to and from explicit URL state. */
export type AdminRouteUrlCodec = {
  /**
   * Encodes destination params into the registered route's explicit URL state.
   *
   * @param params - Router-neutral params supplied with a shell navigation request.
   * @returns URL state merged into the generated named route location.
   */
  encode: (params: AdminShellDestination["params"]) => AdminRouteUrlState;
  /**
   * Decodes canonical destination params from a normalized matched route.
   *
   * @param route - Vue Router's normalized current route.
   * @returns Canonical params, or undefined for a parameterless destination.
   */
  decode: (
    route: RouteLocationNormalizedLoaded,
  ) => AdminShellDestination["params"];
};

/** Defines host-owned route data and optional URL conversion for one nav key. */
export type AdminRouteDefinition = {
  /** Supplies a host-owned Vue Router record without a name. */
  route: Omit<RouteRecordRaw, "name">;
  /** Converts destination params to and from URL state; omission means parameterless. */
  codec?: AdminRouteUrlCodec;
};

/** Describes the input map accepted by a bound admin route registry. */
export type AdminRouteDefinitions = Readonly<
  Record<string, AdminRouteDefinition>
>;

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
   * @param destination - Router-neutral shell destination to encode.
   * @returns A named location with URL state supplied by the route codec.
   * @throws When the nav key is unknown or a declared codec rejects its input.
   */
  toLocation: (destination: AdminShellDestination) => RouteLocationNamedRaw;
  /**
   * Reconstructs a canonical shell destination from a matched host route.
   *
   * @param route - Current normalized Vue Router route.
   * @returns A canonical destination, or null for a non-admin route.
   * @throws When a registered route codec rejects malformed URL state.
   */
  fromRoute: (
    route: RouteLocationNormalizedLoaded,
  ) => AdminShellDestination | null;
  /**
   * Produces host route records whose names derive from registry keys.
   *
   * @returns Vue Router records ready for the host to place into its route tree.
   */
  toRouteRecords: () => RouteRecordRaw[];
};

/** Silently omits destination params for routes that declare no URL codec. */
const parameterlessCodec: AdminRouteUrlCodec = {
  /**
   * Ignores params because this route deliberately has no URL parameter contract.
   *
   * @param _params - Destination params intentionally not represented in the URL.
   * @returns Empty URL state.
   */
  encode(_params) {
    return {};
  },
  /**
   * Reconstructs no params because this route has no URL parameter contract.
   *
   * @param _route - Normalized route intentionally unused by the parameterless codec.
   * @returns Undefined because the canonical destination is parameterless.
   */
  decode(_route) {
    return undefined;
  },
};

/**
 * Binds host route definitions to reversible AdminShell destination conversion.
 *
 * @param definitions - Name-free host route records keyed by stable nav-key/route-name identity.
 * @returns One immutable registry API bound to the supplied definitions.
 * @throws When a route record attempts to declare a second route name.
 */
export function defineAdminRouteRegistry<
  TDefinitions extends AdminRouteDefinitions,
>(definitions: TDefinitions): AdminRouteRegistry<TDefinitions> {
  const entries = Object.entries(definitions) as [
    AdminRouteRegistryNavKey<TDefinitions>,
    AdminRouteDefinition,
  ][];

  for (const [navKey, definition] of entries) {
    if ("name" in definition.route) {
      throw new Error(
        `Admin route definition "${navKey}" must not declare route.name.`,
      );
    }
  }

  /** Resolves a definition or reports the invalid host destination key clearly. */
  function getDefinition(navKey: string): AdminRouteDefinition {
    const definition = definitions[navKey];
    if (!definition) {
      throw new Error(`Unknown admin route navKey "${navKey}".`);
    }
    return definition;
  }

  /** Resolves a definition's declared codec or the silent parameterless default. */
  function getCodec(navKey: string): AdminRouteUrlCodec {
    return getDefinition(navKey).codec ?? parameterlessCodec;
  }

  /** Converts one destination to its generated named Vue Router location. */
  function toLocation(
    destination: AdminShellDestination,
  ): RouteLocationNamedRaw {
    return {
      name: destination.navKey,
      ...getCodec(destination.navKey).encode(destination.params),
    };
  }

  /** Reconstructs one URL-authoritative destination from the current normalized route. */
  function fromRoute(
    route: RouteLocationNormalizedLoaded,
  ): AdminShellDestination | null {
    if (typeof route.name !== "string" || !definitions[route.name]) {
      return null;
    }
    const params = getCodec(route.name).decode(route);
    return params ? { navKey: route.name, params } : { navKey: route.name };
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

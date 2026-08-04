export {
  defineAdminRouteRegistry,
  defineAdminRouteUrlCodec,
  type AdminRouteDefinition,
  type AdminRouteDefinitions,
  type AdminRouteRegistry,
  type AdminRouteRegistryNavKey,
  type AdminRouteUrlCodec,
  type RouteReadInput,
} from "./route-registry";

export {
  createAdminShellVueRouterRuntime,
  type AdminShellVueRouterRuntime,
  type AdminShellVueRouterRuntimeOptions,
} from "./navigation";

export {
  ADMIN_DISPOSE_KEY,
  createAdminRouterPlugin,
  type AdminRouteOverride,
  type AdminRouterPlugin,
  type CreateAdminRouterOptions,
} from "./create-admin-router";

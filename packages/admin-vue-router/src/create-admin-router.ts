import {
  AdminLoginPage,
  AdminShell,
  useAdminAuthStore,
  useAdminShellNavigationStore,
  type AdminShellDestination,
  type AdminShellTabDescriptor,
} from "@noob-naive-ui/admin";
import type { Pinia } from "pinia";
import { h, defineComponent, type Component } from "vue";
import type {
  RouteMeta,
  RouteRecordRaw,
  Router,
  RouterHistory,
  RouterScrollBehavior,
} from "vue-router";
import { createRouter, RouterView } from "vue-router";
import type {
  AdminRouteDefinitions,
  AdminRouteRegistry,
  RouteReadInput,
} from "./route-registry";
import { createAdminShellVueRouterRuntime } from "./navigation";

// ---------------------------------------------------------------------------
// createAdminRouter — factory-owned Vue Router with auth/scope lifecycle
// ---------------------------------------------------------------------------

/** Identifies the package-owned login route without colliding with host names. */
const ADMIN_LOGIN_ROUTE_NAME = "_noobAdminLogin";

/** Identifies the package-owned shell route without colliding with host names. */
const ADMIN_SHELL_ROUTE_NAME = "_noobAdminShell";

/** Namespaces package-owned route metadata away from additive host metadata. */
const ADMIN_ROUTE_META_KEY = "_noobAdminMeta";

/**
 * Reports whether one route record carries the package-owned auth requirement.
 *
 * @param meta - Vue Router metadata from a matched route record.
 * @returns Whether the package namespace marks the route as protected.
 */
function requiresAdminAuth(meta: RouteMeta): boolean {
  const adminMeta = meta[ADMIN_ROUTE_META_KEY];
  return (
    typeof adminMeta === "object" &&
    adminMeta !== null &&
    "requiresAuth" in adminMeta &&
    adminMeta.requiresAuth === true
  );
}

/** Describes the constrained host overrides accepted for one generated route. */

export interface AdminRouteOverride {
  /** Overrides the default package-owned path while preserving route-name ownership. */
  path?: string;
  /** Replaces the presentation rendered inside the package-owned route component. */
  innerComponent?: Component;
  /** Supplies additive route metadata merged beneath package-owned internal meta. */
  meta?: Record<string, unknown>;
}

/** Supplies host-owned configuration for the factory-owned admin router. */
export interface CreateAdminRouterOptions<
  TDefinitions extends AdminRouteDefinitions,
> {
  /** Supplies the application Pinia instance owning auth, menu, and preferences stores. */
  pinia: Pinia;
  /** Supplies the host-selected history implementation, base path, and mode. */
  history: RouterHistory;
  /** Supplies the bound host route registry for destination conversion and child routes. */
  registry: AdminRouteRegistry<TDefinitions>;
  /** Designates the fallback route when redirect validation fails or scope is lost. */
  homeDestination: AdminShellDestination;
  /** Overrides the shell path, inner presentation component, or additive metadata. */
  shellRoute?: AdminRouteOverride;
  /** Overrides the login path, inner presentation component, or additive metadata. */
  loginRoute?: AdminRouteOverride;
  /** Supplies application-owned tab label and closability policy. */
  describeDestination: (
    id: string,
    destination: AdminShellDestination,
  ) => AdminShellTabDescriptor;
  /** Creates page-instance identity for direct routes without persisted metadata. */
  createPageId: () => string;
  /** Returns the host-owned transient scope for the current authenticated session. */
  getNavigationScopeId: () => string;
  /** Supplies non-admin public sibling routes appended outside the shell parent. */
  additionalRoutes?: readonly RouteRecordRaw[];
  /** Supplies the host-selected scroll policy forwarded to Vue Router. */
  scrollBehavior?: RouterScrollBehavior;
}

/** Per-router redirect context available to the internal login route component. */
interface LoginRedirectContext {
  registry: AdminRouteRegistry<AdminRouteDefinitions>;
  homeDestination: AdminShellDestination;
}

/** Validates that additional routes do not collide with generated admin records. */
function validateAdditionalRoutes(
  additionalRoutes: readonly RouteRecordRaw[] | undefined,
  registry: { navKeys: readonly string[] },
  loginPath: string,
  shellPath: string,
): void {
  if (!additionalRoutes) return;
  const internalNames = new Set([
    ADMIN_LOGIN_ROUTE_NAME,
    ADMIN_SHELL_ROUTE_NAME,
  ]);
  const registryNames = new Set(registry.navKeys);
  const internalPaths = new Set([loginPath, shellPath]);
  for (const route of additionalRoutes) {
    if (route.name) {
      const name = String(route.name);
      if (internalNames.has(name)) {
        throw new Error(
          `Additional route "${name}" conflicts with internal admin route name.`,
        );
      }
      if (registryNames.has(name)) {
        throw new Error(
          `Additional route "${name}" conflicts with a registered route name.`,
        );
      }
    }
    if (route.path && internalPaths.has(route.path)) {
      throw new Error(
        `Additional route path "${route.path}" conflicts with an internal admin route path.`,
      );
    }
  }
}

/** Resolves an untrusted redirect query to a valid registered protected destination. */
function resolvePostLoginDestination(
  redirectUrl: unknown,
  router: Router,
  ctx: LoginRedirectContext,
): AdminShellDestination {
  if (
    typeof redirectUrl !== "string" ||
    !redirectUrl.startsWith("/") ||
    redirectUrl.startsWith("//")
  ) {
    return ctx.homeDestination;
  }
  const resolved = router.resolve(redirectUrl);
  if (
    resolved.name === ADMIN_LOGIN_ROUTE_NAME ||
    !resolved.matched.some((record) => requiresAdminAuth(record.meta))
  ) {
    return ctx.homeDestination;
  }
  try {
    return (
      ctx.registry.fromRoute(resolved as RouteReadInput, {}) ??
      ctx.homeDestination
    );
  } catch {
    return ctx.homeDestination;
  }
}

/** Creates the internal login route component around the host-chosen presentation. */
function createLoginRouteComponent(innerComponent: Component): Component {
  return defineComponent(() => () => h(innerComponent), {
    name: "AdminRouterLoginRoute",
  });
}

/** Creates the internal shell route component with its nested route outlet. */
function createShellRouteComponent(innerComponent: Component): Component {
  return defineComponent(
    () => () => h(innerComponent, null, { default: () => h(RouterView) }),
    { name: "AdminRouterShellRoute" },
  );
}

/** Non-enumerable cleanup symbol for deterministic guard/subscription teardown. */
const ADMIN_DISPOSE_KEY = Symbol("adminRouterDispose");

/**
 * Creates the complete Vue Router instance owning admin route records, auth
 * guards, scope repair, and navigation adapter.
 *
 * @param options - Host-owned configuration: history, registry, auth callbacks,
 *   and presentation policy.
 * @returns The fully configured Vue Router with deterministic cleanup via
 *   a non-enumerable `[Symbol("adminRouterDispose")]()` method.
 * @throws When additional routes collide with generated admin records or
 *   login/shell paths are identical.
 */
export function createAdminRouter<TDefinitions extends AdminRouteDefinitions>(
  options: CreateAdminRouterOptions<TDefinitions>,
): Router {
  const {
    pinia,
    history,
    registry,
    homeDestination,
    shellRoute: shellOverride,
    loginRoute: loginOverride,
    describeDestination,
    createPageId,
    getNavigationScopeId,
    additionalRoutes,
    scrollBehavior,
  } = options;

  const loginPath = loginOverride?.path ?? "/login";
  const shellPath = shellOverride?.path ?? "/";

  if (loginPath === shellPath) {
    throw new Error(
      "Admin login and shell paths must be distinct. " +
        `Received login "${loginPath}" and shell "${shellPath}".`,
    );
  }

  validateAdditionalRoutes(additionalRoutes, registry, loginPath, shellPath);

  const auth = useAdminAuthStore(pinia);

  // Build internal route components bound to this router's adapter
  const LoginRouteComponent = createLoginRouteComponent(
    loginOverride?.innerComponent ?? AdminLoginPage,
  );
  const ShellRouteComponent = createShellRouteComponent(
    shellOverride?.innerComponent ?? AdminShell,
  );

  // Compose generated route records
  const shellChildren = registry.toRouteRecords();
  const { [ADMIN_ROUTE_META_KEY]: _loginAdminMeta, ...loginMeta } =
    loginOverride?.meta ?? {};
  const { [ADMIN_ROUTE_META_KEY]: _shellAdminMeta, ...shellHostMeta } =
    shellOverride?.meta ?? {};
  const shellMeta = {
    ...shellHostMeta,
    [ADMIN_ROUTE_META_KEY]: { requiresAuth: true as const },
  };

  const adminRoutes: RouteRecordRaw[] = [
    {
      path: loginPath,
      name: ADMIN_LOGIN_ROUTE_NAME,
      component: LoginRouteComponent,
      meta: loginMeta,
    },
    {
      path: shellPath,
      name: ADMIN_SHELL_ROUTE_NAME,
      component: ShellRouteComponent,
      meta: shellMeta,
      children: shellChildren,
    },
  ];

  const allRoutes = additionalRoutes
    ? [...adminRoutes, ...additionalRoutes]
    : adminRoutes;

  const router = createRouter({
    history,
    routes: allRoutes,
    ...(scrollBehavior ? { scrollBehavior } : {}),
  });
  /**
   * Reports router navigation failures through stderr so detached lifecycle
   * effects never leave Vue Router to classify a handled rejection as uncaught.
   *
   * @param error - Navigation failure reported by Vue Router.
   * @returns Nothing after reporting the failure.
   */
  function reportRouterError(error: unknown): void {
    console.error("Admin router navigation failed:", error);
  }

  /** Removes the factory-owned navigation error reporter during disposal. */
  const removeRouterErrorHandler = router.onError(reportRouterError);

  // Create the navigation runtime bound to this router.
  const navigationRuntime = createAdminShellVueRouterRuntime({
    router,
    registry,
    describeDestination,
    createPageId,
    getNavigationScopeId,
    homeDestination,
  });
  useAdminShellNavigationStore(pinia).configure(navigationRuntime.navigation);

  /** Prevents duplicate scope entry while one authenticated transition is pending. */
  let scopeEntryPending = false;

  /**
   * Applies login scope entry or protected-shell logout routing for one auth transition.
   *
   * @param kind - Current package auth status discriminator.
   * @returns A promise that settles after any required router effect.
   */
  async function handleAuthTransition(kind: string): Promise<void> {
    // No-op during loading — the guard awaits restoration, transition handler
    // will fire again when status settles to authenticated or anonymous.
    if (kind === "loading") return;

    if (kind === "anonymous") {
      scopeEntryPending = false;
      if (
        router.currentRoute.value.matched.some((record) =>
          requiresAdminAuth(record.meta),
        )
      ) {
        await router.replace({ name: ADMIN_LOGIN_ROUTE_NAME });
      }
      return;
    }
    if (
      kind !== "authenticated" ||
      scopeEntryPending ||
      router.currentRoute.value.name !== ADMIN_LOGIN_ROUTE_NAME
    ) {
      return;
    }
    scopeEntryPending = true;
    const redirectContext: LoginRedirectContext = {
      registry: registry as AdminRouteRegistry<AdminRouteDefinitions>,
      homeDestination,
    };
    try {
      await navigationRuntime.enterScope(
        resolvePostLoginDestination(
          router.currentRoute.value.query.redirectUrl,
          router,
          redirectContext,
        ),
      );
    } finally {
      scopeEntryPending = false;
    }
  }
  /**
   * Starts one auth-driven router effect while containing recoverable navigation failure.
   *
   * @param kind - Current package auth status discriminator.
   * @returns Nothing; router failures settle inside the detached lifecycle effect.
   */
  function runAuthTransition(kind: string): void {
    void handleAuthTransition(kind).catch(() => undefined);
  }

  /** Owns auth-transition effects for the same lifetime as the factory router. */
  const removeAuthTransitionGuard = auth.$subscribe(
    (_mutation, state) => runAuthTransition(state.status.kind),
    { detached: true },
  );
  runAuthTransition(auth.status.kind);

  /**
   * Auth guard installed before the scope guard.
   *
   * When status is loading the guard awaits restoration settlement
   * before evaluating the destination, so protected content is never
   * rendered optimistically.  After settlement the same decision
   * block runs regardless of the path taken.
   *
   * @returns A route location to redirect, `true` to proceed, or a
   *          Promise of either when restoration is pending.
   */
  const removeAuthGuard = router.beforeEach(async (to) => {
    if (auth.status.kind === "loading") {
      await auth.waitForRestoration();
    }

    const protectedTarget = to.matched.some((record) =>
      requiresAdminAuth(record.meta),
    );
    if (protectedTarget && auth.status.kind !== "authenticated") {
      return {
        name: ADMIN_LOGIN_ROUTE_NAME,
        query: { redirectUrl: to.fullPath },
      };
    }
    if (
      to.name === ADMIN_LOGIN_ROUTE_NAME &&
      auth.status.kind === "authenticated"
    ) {
      return { name: String(homeDestination.navKey) };
    }
    return true;
  });

  // Install scope guard
  const removeScopeGuard = navigationRuntime.installScopeGuard();

  // Deterministic cleanup exposed via non-enumerable symbol property
  const cleanupFunctions: Array<() => void> = [
    removeRouterErrorHandler,
    removeAuthGuard,
    removeScopeGuard,
    removeAuthTransitionGuard,
  ];

  Object.defineProperty(router, ADMIN_DISPOSE_KEY, {
    value: () => {
      for (const fn of cleanupFunctions) fn();
    },
    writable: false,
    enumerable: false,
    configurable: false,
  });

  return router;
}

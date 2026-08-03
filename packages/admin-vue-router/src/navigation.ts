import {
  type AdminShellDestination,
  type AdminShellNavigation,
  type AdminShellNavigationRequest,
  type AdminShellTabDescriptor,
} from "@noob-naive-ui/admin";
import { i18nTextSchema } from "@noob-naive-ui/i18n";
import type {
  HistoryState,
  RouteLocationNormalizedLoaded,
  RouteLocationNamedRaw,
  Router,
} from "vue-router";
import { z } from "zod";
import type {
  AdminRouteDefinitions,
  AdminRouteRegistry,
} from "./route-registry";

/** Default reserved history-state namespace owned by the navigation adapter. */
const DEFAULT_ADMIN_SHELL_HISTORY_STATE_KEY = "_noobAdminShell";

/** Validates the adapter-owned subset persisted for one tab instance. */
const persistedAdminShellTabSchema = z.object({
  id: z.string(),
  // The label persists as its I18nText representation, so `i18n` keys
  // survive restores and render in the current locale after refresh.
  label: i18nTextSchema,
  closable: z.boolean().optional(),
});

/** Validates scope metadata while allowing absent tab reconstruction data. */
const persistedAdminShellStateSchema = z.object({
  scopeId: z.string(),
  tab: persistedAdminShellTabSchema.optional(),
});

/** Requires complete tab metadata when restoring a persisted descriptor. */
const persistedAdminShellTabStateSchema =
  persistedAdminShellStateSchema.required({ tab: true });

/** Describes validated adapter metadata stored in one history entry. */
type PersistedAdminShellState = z.output<
  typeof persistedAdminShellTabStateSchema
>;

/** Describes the minimal tab presentation persisted by the adapter. */
type PersistedAdminShellTab = z.output<typeof persistedAdminShellTabSchema>;

/** Supplies host-owned dependencies for the Vue Router navigation runtime. */
export type AdminShellVueRouterRuntimeOptions<
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
  /** Supplies the designated home destination for history-scope repair. */
  homeDestination?: AdminShellDestination;
};

/** Separates the shell-facing controller from Vue Router lifecycle operations. */
export type AdminShellVueRouterRuntime = {
  /** Supplies the router-neutral controller configured into the admin Pinia store. */
  navigation: AdminShellNavigation;
  /** Builds a route location stamped for the current navigation scope. */
  toScopedLocation: (
    descriptor: AdminShellTabDescriptor,
  ) => RouteLocationNamedRaw;
  /**
   * Installs a generic history-scope guard on the bound router.
   *
   * The guard bypasses non-admin routes (those not recognized by the bound
   * registry), allows current-scope entries, and replaces stale or missing
   * scope with one stable home descriptor per scope.  Loop prevention is
   * internal to the adapter.
   *
   * @returns A removal function that unregisters the guard.
   * @throws When {@link homeDestination} was not configured.
   */
  installScopeGuard: () => () => void;
  /**
   * Stamps a valid destination and navigates to it so the scope guard
   * admits it for a newly created auth scope without mistaking it for
   * stale history.
   *
   * Creates a page identity via {@link createPageId} and a descriptor
   * via {@link describeDestination}, then replaces the current history
   * entry with the scoped location.  The guard admits this entry once.
   *
   * Call after login or scope rotation to establish the first protected
   * route in the new scope.
   *
   * @param destination - The router-neutral destination to navigate to.
   * @throws When {@link homeDestination} was not configured.
   */
  enterScope: (destination: AdminShellDestination) => Promise<void>;
};

/**
 * Creates the shell navigation controller and its Vue Router lifecycle operations.
 *
 * @param options - Router, registry, and host-owned identity/presentation callbacks.
 * @returns A runtime whose navigation controller is safe to expose to AdminShell.
 */
export function createAdminShellVueRouterRuntime<
  TDefinitions extends AdminRouteDefinitions,
>(
  options: AdminShellVueRouterRuntimeOptions<TDefinitions>,
): AdminShellVueRouterRuntime {
  const {
    router,
    registry,
    describeDestination,
    createPageId,
    getNavigationScopeId,
  } = options;
  const historyStateKey = DEFAULT_ADMIN_SHELL_HISTORY_STATE_KEY;
  const fallbackPageIds = new Map<string, string>();
  /** Caches one stable home descriptor per navigation scope. */
  const homeDescriptors = new Map<string, AdminShellTabDescriptor>();
  /** Prevents the guard from re-entering during its own replacement navigation. */
  let replacementInFlight = false;
  /** Holds the explicit scope entry stamped by a prior enterScope call. */
  let pendingScopeEntry: AdminShellTabDescriptor | null = null;

  /** Reads a validated scope identifier without requiring valid tab metadata. */
  function readScopeId(state: HistoryState): string | undefined {
    return persistedAdminShellStateSchema.safeParse(state[historyStateKey]).data
      ?.scopeId;
  }

  /** Throws when scope-guard features are used without a configured home destination. */
  function assertHomeConfigured(): void {
    if (!options.homeDestination) {
      throw new Error(
        "installScopeGuard and enterScope require homeDestination to be configured.",
      );
    }
  }

  /** Reads and validates adapter metadata from the current navigation scope. */
  function readPersistedState(
    state: HistoryState,
  ): PersistedAdminShellState | null {
    const parsed = persistedAdminShellTabStateSchema.safeParse(
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
    request: AdminShellNavigationRequest,
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

  /**
   * Installs a generic history-scope guard on the bound router.
   *
   * The guard acts only on routes recognized by the bound registry.  Public
   * and unrelated routes pass through untouched.  A current-scope history
   * entry proceeds normally.  Stale or missing scope is replaced with one
   * stable home descriptor cached for the current scope.  Loop prevention is
   * internal: a replacement navigation clears its own flag on re-entry.
   *
   * @returns A removal function that unregisters the guard.
   * @throws When homeDestination was not configured.
   */
  function installScopeGuard(): () => void {
    assertHomeConfigured();
    const remove = router.beforeEach((to) => {
      if (replacementInFlight) {
        replacementInFlight = false;
        return true;
      }
      const state = router.options.history.state;
      const destination = registry.fromRoute(to, state);
      if (!destination) return true;
      if (pendingScopeEntry) {
        pendingScopeEntry = null;
        return true;
      }

      const historyScopeId = readScopeId(state);
      if (historyScopeId === getNavigationScopeId()) return true;
      const scopeId = getNavigationScopeId();
      let home = homeDescriptors.get(scopeId);
      if (!home) {
        home = describeDestination(createPageId(), options.homeDestination!);
        homeDescriptors.set(scopeId, home);
      }
      replacementInFlight = true;
      const tab: PersistedAdminShellTab = {
        id: home.id,
        label: home.label,
        ...(home.closable === undefined ? {} : { closable: home.closable }),
      };
      return {
        name: home.nav.navKey,
        replace: true,
        force: true,
        state: {
          [historyStateKey]: { scopeId: getNavigationScopeId(), tab },
        },
      };
    });
    return remove;
  }

  /**
   * Stamps a valid destination and navigates to it so the scope guard
   * admits it for a newly created auth scope.
   *
   * Creates a page identity and descriptor, then replaces the current
   * history entry with the scoped location.
   *
   * @param destination - The router-neutral destination to navigate to.
   * @throws When homeDestination was not configured.
   */
  async function enterScope(destination: AdminShellDestination): Promise<void> {
    assertHomeConfigured();
    const descriptor = describeDestination(createPageId(), destination);
    pendingScopeEntry = descriptor;
    await router.replace(toScopedLocation(descriptor));
  }

  const navigation: AdminShellNavigation = {
    /** Returns the descriptor reconstructed from current router authority. */
    get active() {
      return currentDescriptor();
    },
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

  return { navigation, toScopedLocation, installScopeGuard, enterScope };
}

import {
  AdminShell,
  useAdminShellPreferencesStore,
  type AdminAuthActions,
  type AdminAuthStatus,
  type AdminLoginValues,
  type AdminShellDestination,
  type AdminShellNavigation,
  type AdminShellTabDescriptor,
} from "@noob-naive-ui/admin";
import {
  darkTheme,
  NConfigProvider,
  type GlobalTheme,
  type GlobalThemeOverrides,
  type MenuOption,
} from "naive-ui";
import {
  computed,
  defineComponent,
  onBeforeUnmount,
  ref,
} from "vue";
import { RouterView, useRouter, type HistoryState } from "vue-router";

import { demoRouteDefinitions, type DemoRouteDefinition } from "./routes";

/** Maps each stable demo route name to its route and tab presentation metadata. */
const routeDefinitionsByName = Object.fromEntries(
  demoRouteDefinitions.map((definition) => [definition.name, definition]),
) as Record<string, DemoRouteDefinition>;


/**
 * Resolves current route metadata for a router-neutral destination.
 *
 * @param destination - Data-only destination whose params remain in tab state, not the URL.
 * @returns The registered route definition matching the destination key.
 */
function resolveDefinition(destination: AdminShellDestination): DemoRouteDefinition {
  const definition = demoRouteDefinitions.find(
    ({ path }) => path === destination.navKey,
  );
  if (!definition) throw new Error("Unknown demo destination.");
  return definition;
}

/**
 * Resolves a host-owned destination into a Vue Router path without coupling params to query.
 *
 * @param destination - Data-only destination interpreted by the demo route registry.
 * @returns A path-only Vue Router location.
 */
function resolveDestination(destination: AdminShellDestination): { path: string } {
  return { path: resolveDefinition(destination).path };
}

/**
 * Adds current route presentation to one shell-owned page-instance identity and destination.
 *
 * @param id - Immutable page-instance identity generated or retained by the shell.
 * @param nav - Serializable router-neutral destination retained in browser history.
 * @returns A complete public descriptor suitable for shell confirmation and history state.
 */
function describeDestination(id: string, nav: AdminShellDestination): AdminShellTabDescriptor {
  const definition = resolveDefinition(nav);
  return { id, nav, label: definition.label, closable: definition.closable };
}

/**
 * Detaches a descriptor into the plain JSON representation required by the navigation contract.
 *
 * @param descriptor - Public descriptor whose params are contractually a plain JSON object.
 * @returns A detached descriptor safe for Vue Router and browser history state.
 */
function descriptorForHistory(
  descriptor: AdminShellTabDescriptor,
): AdminShellTabDescriptor {
  return JSON.parse(JSON.stringify(descriptor)) as AdminShellTabDescriptor;
}

/**
 * Checks the shallow public shape before trusting browser-owned history state.
 *
 * @param value - Unknown value read from the current browser-history entry.
 * @returns Whether the value has the required public descriptor fields.
 */
function isTabDescriptor(value: unknown): value is AdminShellTabDescriptor {
  if (!value || typeof value !== "object") return false;
  const descriptor = value as Partial<AdminShellTabDescriptor>;
  return Boolean(
    typeof descriptor.id === "string" &&
      typeof descriptor.label === "string" &&
      descriptor.nav &&
      typeof descriptor.nav.navKey === "string" &&
      (descriptor.closable === undefined || typeof descriptor.closable === "boolean"),
  );
}

/** Maps each public font-size preference to its bounded Naive UI font-size override. */
const fontSizeOverrides = {
  small: { common: { fontSize: "13px" } },
  medium: { common: { fontSize: "14px" } },
  large: { common: { fontSize: "16px" } },
} satisfies Record<"small" | "medium" | "large", GlobalThemeOverrides>;

/** Renders the frontend-only demo by composing application state with public admin APIs. */
export default defineComponent({
  name: "DemoApp",
  /**
   * Composes the in-memory auth, router, and public runtime inputs for the demo.
   *
   * @returns A render function for the public admin shell.
   */
  setup() {
    /** Owns the app-local router used by menu links and tab callbacks. */
    const router = useRouter();
    /** Reads the one public preferences store initialized by the application entry point. */
    const preferences = useAdminShellPreferencesStore();
    /** Holds the complete in-memory frontend authentication state for this browser session. */
    const authStatus = ref<AdminAuthStatus>({ kind: "anonymous" });
    /** Holds system color-scheme media state so system theme mode remains reactive after mount. */
    const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    /** Retains one stable fallback only while the current route lacks persisted descriptor state. */
    let unstampedDescriptor: AdminShellTabDescriptor | null = null;
    /** Reflects the browser's current dark-mode media-query match. */
    const systemUsesDark = ref(systemThemeQuery.matches);

    /** Resolves the shell theme from the public preference without adding a parallel theme store. */
    const theme = computed<GlobalTheme | null>(() => {
      if (preferences.themeMode === "dark") {
        return darkTheme;
      }

      if (preferences.themeMode === "light") {
        return null;
      }

      return systemUsesDark.value ? darkTheme : null;
    });

    /**
     * Synchronizes system-theme state after the browser color-scheme preference changes.
     *
     * @param event - The media-query change event reporting the current dark-mode match.
     * @returns Nothing after updating the reactive system-theme state.
     */
    function updateSystemTheme(event: MediaQueryListEvent): void {
      systemUsesDark.value = event.matches;
    }

    /**
     * Removes the browser media-query listener when the demo root unmounts.
     *
     * @returns Nothing after releasing the system-theme listener.
     */
    function stopSystemThemeListener(): void {
      systemThemeQuery.removeEventListener("change", updateSystemTheme);
    }

    systemThemeQuery.addEventListener("change", updateSystemTheme);
    onBeforeUnmount(stopSystemThemeListener);
    /** Resolves the Naive font override from the public preference store's bounded font-size value. */
    const themeOverrides = computed<GlobalThemeOverrides>(
      () => fontSizeOverrides[preferences.fontSize],
    );
    /** Supplies a stable, router-aware menu tree without shell-owned selection callbacks. */
    const menuOptions: MenuOption[] = [
      createMenuOption(demoRouteDefinitions[0]),
      {
        key: "workspace",
        label: "Workspace",
        children: [
          createMenuOption(demoRouteDefinitions[1]),
          createMenuOption(demoRouteDefinitions[2]),
        ],
      },
    ];

    /**
     * Accepts only trimmed non-empty credentials and promotes local auth state without I/O.
     *
     * @param values - Frontend form values supplied by the packaged login UI.
     * @returns A promise that resolves after local home-route navigation completes.
     */
    async function login(values: AdminLoginValues): Promise<void> {
      const username = values.username.trim();
      const password = values.password.trim();
      if (!username || !password) {
        throw new Error("Username and password are required.");
      }

      const homeDescriptor = descriptorForHistory(
        describeDestination(crypto.randomUUID(), {
          navKey: demoRouteDefinitions[0].path,
        }),
      );
      await router.replace({
        path: demoRouteDefinitions[0].path,
        force: true,
        state: homeDescriptor as unknown as HistoryState,
      });
      authStatus.value = { kind: "authenticated", userLabel: username };
    }

    /**
     * Returns to the local home route and clears authentication without retaining a session.
     *
     * @returns A promise that resolves after local home-route navigation completes.
     */
    async function logout(): Promise<void> {
      await router.replace(demoRouteDefinitions[0].path);
      authStatus.value = { kind: "anonymous", reason: "signed-out" };
    }

    /** Holds the public callback contract used by the packaged anonymous login branch. */
    const authActions: AdminAuthActions = { login, logout };
    /**
     * Returns the current history-backed descriptor or derives one for an unstamped route.
     *
     * @param preferred - Host-confirmed descriptor for navigation that just completed.
     * @returns The active public descriptor, or null when the route is not registered.
     */
    function currentDescriptor(
      preferred?: AdminShellTabDescriptor,
    ): AdminShellTabDescriptor | null {
      if (preferred) return preferred;
      const definition =
        routeDefinitionsByName[String(router.currentRoute.value.name ?? "")];
      if (!definition) return null;
      const state = window.history.state as Record<string, unknown> | null;
      if (isTabDescriptor(state) && state.nav.navKey === definition.path) {
        unstampedDescriptor = null;
        return state;
      }
      if (unstampedDescriptor?.nav.navKey !== definition.path) {
        unstampedDescriptor = describeDestination(crypto.randomUUID(), {
          navKey: definition.path,
        });
      }
      return unstampedDescriptor;
    }

    /** Holds one stable page-instance navigation adapter derived from confirmed router state. */
    const navigation: AdminShellNavigation = {
      /** Returns the complete descriptor persisted on the current history entry. */
      get active() {
        return currentDescriptor();
      },
      /** Executes one shell-resolved operation and returns the confirmed active descriptor. */
      async handleNavigation(request) {
        let descriptor: AdminShellTabDescriptor;
        if (request.kind === "open") {
          descriptor = describeDestination(request.candidate.id, request.candidate.nav);
        } else if (request.kind === "activate") {
          descriptor = request.destination;
        } else if (request.destination) {
          descriptor = request.destination;
        } else {
          return { active: null };
        }
        const persistedDescriptor = descriptorForHistory(descriptor);
        await router.push({
          ...resolveDestination(persistedDescriptor.nav),
          force: true,
          state: persistedDescriptor as unknown as HistoryState,
          replace: request.kind === "open" && request.closeCurrent,
        });
        return { active: currentDescriptor(persistedDescriptor) };
      },
    };


    return () => (
      <NConfigProvider
        theme={theme.value}
        themeOverrides={themeOverrides.value}
      >
        <AdminShell
          authStatus={authStatus.value}
          authActions={authActions}
          menuOptions={menuOptions}
          navigation={navigation}
        >
          <RouterView />
        </AdminShell>
      </NConfigProvider>
    );
  },
});

/**
 * Creates one plain Naive UI menu option while preserving app-owned route identity.
 *
 * @param definition - The local route metadata used to render the menu label.
 * @returns The opaque menu option passed unchanged to the public shell.
 */
function createMenuOption(definition: DemoRouteDefinition): MenuOption {
  return {
    key: definition.path,
    label: definition.label,
  };
}

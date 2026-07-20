import {
  AdminShell,
  useAdminShellPreferencesStore,
  type AdminAuthActions,
  type AdminAuthStatus,
  type AdminLoginValues,
  type AdminShellDestination,
  type AdminShellNavigate,
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
  h,
  onBeforeUnmount,
  ref,
  type Component,
} from "vue";
import { RouterView, useRouter, type LocationQueryRaw } from "vue-router";

import { demoRouteDefinitions, type DemoRouteDefinition } from "./routes";

/** Maps each stable demo route name to its route and tab presentation metadata. */
const routeDefinitionsByName = Object.fromEntries(
  demoRouteDefinitions.map((definition) => [definition.name, definition]),
) as Record<string, DemoRouteDefinition>;

/** Names the browser-history field that persists exact shell page-instance identity. */
const pageInstanceStateKey = "adminShellPageInstanceId";

/** Resolves a host-owned destination into a validated Vue Router location. */
function resolveDestination(destination: AdminShellDestination): {
  path: string;
  query: LocationQueryRaw;
} {
  const definition = demoRouteDefinitions.find(
    ({ path }) => path === destination.navKey,
  );
  if (!definition) throw new Error("Unknown demo destination.");
  const query = Object.fromEntries(
    Object.entries(destination.params ?? {}).filter(
      (entry): entry is [string, string | number] =>
        typeof entry[1] === "string" || typeof entry[1] === "number",
    ),
  );
  return { path: definition.path, query };
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

      authStatus.value = { kind: "authenticated", userLabel: username };
      await router.replace(demoRouteDefinitions[0].path);
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
    /** Builds a confirmed descriptor from the current route and persisted history identity. */
    function currentDescriptor(
      preferredId?: string,
    ): AdminShellTabDescriptor | null {
      const definition =
        routeDefinitionsByName[String(router.currentRoute.value.name ?? "")];
      if (!definition) return null;
      const state = window.history.state as Record<string, unknown> | null;
      const storedId = state?.[pageInstanceStateKey];
      const id =
        preferredId ??
        (typeof storedId === "string" ? storedId : crypto.randomUUID());
      if (storedId !== id)
        window.history.replaceState(
          { ...state, [pageInstanceStateKey]: id },
          "",
        );
      return {
        id,
        nav: {
          navKey: definition.path,
          params: { ...router.currentRoute.value.query },
        },
        label: definition.label,
        closable: definition.closable,
      };
    }

    /** Holds one stable page-instance navigation adapter derived from confirmed router state. */
    const navigation: AdminShellNavigation = {
      /** Returns the route plus exact browser-history page-instance identity. */
      get active() {
        return currentDescriptor();
      },
      /** Executes one shell-resolved operation and returns the confirmed active descriptor. */
      async handleNavigation(request) {
        let descriptor: Pick<AdminShellTabDescriptor, "id" | "nav">;
        if (request.kind === "open") descriptor = request.candidate;
        else if (request.kind === "activate") descriptor = request.destination;
        else if (request.destination) descriptor = request.destination;
        else return { active: null };
        await router.push({
          ...resolveDestination(descriptor.nav),
          force: true,
          state: { [pageInstanceStateKey]: descriptor.id },
          replace: request.kind === "open" && request.closeCurrent,
        });
        return { active: currentDescriptor(descriptor.id) };
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
          {({
            navigate,
          }: {
            navigate: AdminShellNavigate;
          }) => (
            <RouterView
              v-slots={{
                default: ({
                  Component: RouteComponent,
                }: {
                  Component: Component | undefined;
                }) => (RouteComponent ? h(RouteComponent, { navigate }) : null),
              }}
            />
          )}
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

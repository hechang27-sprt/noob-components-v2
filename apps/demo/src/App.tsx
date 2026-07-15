import {
  AdminShell,
  useAdminShellPreferencesStore,
  type AdminAuthActions,
  type AdminAuthStatus,
  type AdminLoginValues,
  type AdminShellTabController,
  type AdminShellTabInput,
} from "@noob-naive-ui/admin";
import {
  darkTheme,
  NButton,
  NConfigProvider,
  type GlobalTheme,
  type GlobalThemeOverrides,
  type MenuOption,
} from "naive-ui";
import { computed, defineComponent, onBeforeUnmount, ref } from "vue";
import { RouterLink, RouterView, useRouter } from "vue-router";

import { demoRouteDefinitions, type DemoRouteDefinition } from "./routes";

/** Maps each stable demo route name to its route and tab presentation metadata. */
const routeDefinitionsByName = Object.fromEntries(
  demoRouteDefinitions.map((definition) => [definition.name, definition]),
) as Record<string, DemoRouteDefinition>;

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
    /** Derives the active route's shell descriptor directly from Vue Router's reactive state. */
    const currentTab = computed<AdminShellTabInput | null>(() => {
      const definition = routeDefinitionsByName[
        String(router.currentRoute.value.name ?? "")
      ];

      return definition
        ? {
            key: definition.path,
            label: definition.label,
            closable: definition.closable,
          }
        : null;
    });

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
    /** Holds a stable shell tab controller whose current descriptor derives from the active route. */
    const tabController: AdminShellTabController = {
      /**
       * Returns the active local route as the host-authoritative tab descriptor.
       *
       * @returns The current route's tab descriptor, or null before route resolution.
       */
      get current() {
        return currentTab.value;
      },
      /**
       * Navigates to an existing demo tab key through the app-owned router.
       *
       * @param key - The stable local route path selected in the shell tab bar.
       * @returns A promise that resolves after the router processes the location.
       */
      async activate(key: string): Promise<void> {
        await router.push(key);
      },
      /**
       * Navigates to the shell-suggested next tab, falling back to the permanent home route.
       *
       * @param closedKey - The closed tab key, intentionally unused because the shell owns membership.
       * @param suggestedNextKey - The route key the shell recommends after the close.
       * @returns A promise that resolves after the router processes the selected location.
       */
      async close(closedKey: string, suggestedNextKey: string | null): Promise<void> {
        void closedKey;
        await router.push(suggestedNextKey ?? demoRouteDefinitions[0].path);
      },
    };

    return () => (
      <NConfigProvider theme={theme.value} themeOverrides={themeOverrides.value}>
        <AdminShell
          authStatus={authStatus.value}
          authActions={authActions}
          menuOptions={menuOptions}
          tabController={tabController}
        >
          <div class="demo-content">
            <div class="demo-signout">
              <NButton attr-type="button" onClick={() => void logout()}>
                Sign out
              </NButton>
            </div>
            <RouterView />
          </div>
        </AdminShell>
      </NConfigProvider>
    );
  },
});


/**
 * Creates one router-aware Naive UI menu option while preserving the app-owned route hierarchy.
 *
 * @param definition - The local route metadata used to render the menu link.
 * @returns The opaque menu option passed unchanged to the public shell.
 */
function createMenuOption(definition: DemoRouteDefinition): MenuOption {
  return {
    key: definition.path,
    label: () => <RouterLink to={definition.path}>{definition.label}</RouterLink>,
  };
}

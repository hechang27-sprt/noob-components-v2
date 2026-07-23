import {
  AdminShell,
  useAdminShellPreferencesStore,
  type AdminAuthActions,
  type AdminAuthStatus,
  type AdminLoginValues,
} from "@noob-naive-ui/admin";
import { createAdminShellVueRouterNavigation } from "@noob-naive-ui/admin-vue-router";
import {
  darkTheme,
  NConfigProvider,
  type GlobalTheme,
  type GlobalThemeOverrides,
  type MenuOption,
} from "naive-ui";
import { computed, defineComponent, onBeforeUnmount, ref } from "vue";
import { RouterView, useRouter } from "vue-router";

import { describeDemoDestination } from "./admin-navigation";
import { demoRouteRegistry, type DemoNavKey } from "./routes";

/** Maps each public font-size preference to its bounded Naive UI font-size override. */
const fontSizeOverrides = {
  small: { common: { fontSize: "13px" } },
  medium: { common: { fontSize: "14px" } },
  large: { common: { fontSize: "16px" } },
} satisfies Record<"small" | "medium" | "large", GlobalThemeOverrides>;

/** Renders the frontend-only demo by composing application state with public admin APIs. */
export default defineComponent(
  /**
   * Composes the in-memory auth, router, and public runtime inputs for the demo.
   *
   * @returns A render function for the public admin shell.
   */
  () => {
    /** Owns the app-local router used by menu links and tab callbacks. */
    const router = useRouter();
    /** Reads the one public preferences store initialized by the application entry point. */
    const preferences = useAdminShellPreferencesStore();
    /** Holds the complete in-memory frontend authentication state for this browser session. */
    const authStatus = ref<AdminAuthStatus>({ kind: "anonymous" });
    /** Identifies history entries created for the current authenticated demo session. */
    const navigationScopeId = ref(crypto.randomUUID());
    /** Retains one Dashboard page identity throughout the current auth scope. */
    let dashboardDescriptor = describeDemoDestination(crypto.randomUUID(), {
      navKey: "dashboard",
    });
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
      createMenuOption("dashboard", "Dashboard"),
      {
        key: "workspace",
        label: "Workspace",
        children: [
          createMenuOption("reports", "Reports"),
          createMenuOption("settings", "Settings"),
        ],
      },
    ];
    /** Coordinates shell requests with the existing application router and host presentation policy. */
    const navigation = createAdminShellVueRouterNavigation({
      router,
      registry: demoRouteRegistry,
      describeDestination: describeDemoDestination,
      createPageId: () => crypto.randomUUID(),
      getNavigationScopeId: () => navigationScopeId.value,
    });

    /** Allows the scoped replacement emitted by the guard to complete exactly once. */
    let scopedReplacementPending = false;
    /** Replaces protected history entries that do not belong to the current auth scope. */
    const removeHistoryScopeGuard = router.beforeEach(() => {
      if (scopedReplacementPending) {
        scopedReplacementPending = false;
        return true;
      }
      const namespace = router.options.history.state._noobAdminShell;
      const historyScopeId =
        namespace && typeof namespace === "object"
          ? (namespace as Record<string, unknown>).scopeId
          : undefined;
      if (
        authStatus.value.kind === "authenticated" &&
        historyScopeId === navigationScopeId.value
      ) {
        return true;
      }
      scopedReplacementPending = true;
      return {
        ...navigation.toScopedLocation(dashboardDescriptor),
        replace: true,
      };
    });
    onBeforeUnmount(removeHistoryScopeGuard);

    /** Replaces the current route with this auth scope's Dashboard page instance. */
    async function navigateHome(): Promise<void> {
      const candidate = dashboardDescriptor;
      await navigation.handleNavigation({
        kind: "open",
        candidate,
        current: navigation.active,
        closeCurrent: true,
      });
    }

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

      navigationScopeId.value = crypto.randomUUID();
      dashboardDescriptor = describeDemoDestination(crypto.randomUUID(), {
        navKey: "dashboard",
      });
      await navigateHome();
      authStatus.value = { kind: "authenticated", userLabel: username };
    }

    /**
     * Returns to the local home route and clears authentication without retaining a session.
     *
     * @returns A promise that resolves after local home-route navigation completes.
     */
    async function logout(): Promise<void> {
      await navigateHome();
      authStatus.value = { kind: "anonymous", reason: "signed-out" };
    }

    /** Holds the public callback contract used by the packaged anonymous login branch. */
    const authActions: AdminAuthActions = { login, logout };

    return () => (
      <NConfigProvider
        theme={theme.value}
        themeOverrides={themeOverrides.value}>
        <AdminShell
          authStatus={authStatus.value}
          authActions={authActions}
          menuOptions={menuOptions}
          navigation={navigation}>
          <RouterView />
        </AdminShell>
      </NConfigProvider>
    );
  },
  { name: "DemoApp" },
);

/**
 * Creates one plain Naive UI menu option while preserving host-owned nav-key identity.
 *
 * @param navKey - Stable application destination key.
 * @param label - Visible menu label.
 * @returns One unchanged Naive UI menu option.
 */
function createMenuOption(navKey: DemoNavKey, label: string): MenuOption {
  return { key: navKey, label };
}

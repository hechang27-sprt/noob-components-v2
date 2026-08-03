import { useAdminShellPreferencesStore } from "@noob-naive-ui/admin";
import { NConfigProvider } from "naive-ui";
import { defineComponent, onBeforeUnmount } from "vue";
import { RouterView } from "vue-router";

/**
 * Renders app-wide presentation providers around the host-owned outer route view.
 *
 * All NConfigProvider props (theme incl. system dark mode, font-size
 * overrides, component size, naive-ui locale) derive from the package-owned
 * `naiveUiConfig` store computed, so the host only binds preferences. The
 * browser color-scheme signal is runtime-only state the host feeds into the
 * store; it is never serialized.
 */
export default defineComponent(
  /**
   * Composes shared presentation state without owning auth, routes, or shell navigation.
   *
   * @returns A render function for the demo application root.
   */
  () => {
    /** Reads the one public preferences store initialized by the application entry point. */
    const preferences = useAdminShellPreferencesStore();
    /** Tracks the browser color scheme while system theme mode is selected. */
    const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

    /**
     * Mirrors one browser color-scheme change into the runtime-only store signal.
     *
     * @param event - The media-query event containing the current dark-mode match.
     * @returns Nothing after updating the store signal.
     */
    function updateSystemTheme(event: MediaQueryListEvent): void {
      preferences.setSystemUsesDark(event.matches);
    }

    /** Releases the browser listener when the application root unmounts. */
    function stopSystemThemeListener(): void {
      systemThemeQuery.removeEventListener("change", updateSystemTheme);
    }

    preferences.setSystemUsesDark(systemThemeQuery.matches);
    systemThemeQuery.addEventListener("change", updateSystemTheme);
    onBeforeUnmount(stopSystemThemeListener);

    return () => (
      <NConfigProvider {...preferences.naiveUiConfig}>
        <RouterView />
      </NConfigProvider>
    );
  },
  { name: "DemoApp" },
);

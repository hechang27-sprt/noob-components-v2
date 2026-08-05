import {
  resolveAdminNaiveBaseFontSize,
  useAdminShellPreferencesStore,
} from "@noob-naive-ui/admin";
import { NConfigProvider } from "naive-ui";
import { defineComponent, onBeforeUnmount, watch } from "vue";
import { RouterView } from "vue-router";

/**
 * Renders app-wide presentation providers around the host-owned outer route view.
 *
 * All NConfigProvider props (theme incl. system dark mode, font-size
 * overrides, component size, naive-ui locale) derive from the package-owned
 * `naiveUiConfig` store computed, so the host only binds preferences. The
 * browser color-scheme signal is runtime-only state the host feeds into the
 * store; it is never serialized.
 *
 * naive-ui sets `body { font-size: 14px }` statically and cannot scale plain
 * HTML, so the host additionally applies the preference base font to the root
 * element; `rem`-based content then scales with the font-size preference.
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

    /**
     * Applies the preference base font to the root element so `rem`-based
     * content scales with the font-size preference.
     *
     * @param size - The current font-size preference tier.
     * @returns Nothing after setting the root font-size.
     */
    function applyBaseFontSize(size: typeof preferences.fontSize): void {
      document.documentElement.style.fontSize =
        resolveAdminNaiveBaseFontSize(size);
    }

    preferences.setSystemUsesDark(systemThemeQuery.matches);
    systemThemeQuery.addEventListener("change", updateSystemTheme);
    /** Applies the base font immediately and on every font-size preference change. */
    const stopBaseFontSizeWatcher = watch(
      () => preferences.fontSize,
      applyBaseFontSize,
      { immediate: true },
    );
    onBeforeUnmount(() => {
      stopSystemThemeListener();
      stopBaseFontSizeWatcher();
    });

    return () => (
      <NConfigProvider {...preferences.naiveUiConfig}>
        <RouterView />
      </NConfigProvider>
    );
  },
  { name: "DemoApp" },
);

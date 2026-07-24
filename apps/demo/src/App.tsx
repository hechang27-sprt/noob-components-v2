import { useAdminShellPreferencesStore } from "@noob-naive-ui/admin";
import {
  darkTheme,
  NConfigProvider,
  type GlobalTheme,
  type GlobalThemeOverrides,
} from "naive-ui";
import { computed, defineComponent, onBeforeUnmount, ref } from "vue";
import { RouterView } from "vue-router";

/** Maps each public font-size preference to its bounded Naive UI font-size override. */
const fontSizeOverrides = {
  small: { common: { fontSize: "13px" } },
  medium: { common: { fontSize: "14px" } },
  large: { common: { fontSize: "16px" } },
} satisfies Record<"small" | "medium" | "large", GlobalThemeOverrides>;

/** Renders app-wide presentation providers around the host-owned outer route view. */
export default defineComponent(
  /**
   * Composes shared theme state without owning auth, routes, or shell navigation.
   *
   * @returns A render function for the demo application root.
   */
  () => {
    /** Reads the one public preferences store initialized by the application entry point. */
    const preferences = useAdminShellPreferencesStore();
    /** Tracks the browser color scheme while system theme mode is selected. */
    const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    /** Reflects the current system dark-mode preference. */
    const systemUsesDark = ref(systemThemeQuery.matches);
    /** Resolves the Naive UI theme from the package-owned presentation preference. */
    const theme = computed<GlobalTheme | null>(() => {
      if (preferences.themeMode === "dark") return darkTheme;
      if (preferences.themeMode === "light") return null;
      return systemUsesDark.value ? darkTheme : null;
    });
    /** Resolves the bounded font override from the package-owned preference. */
    const themeOverrides = computed<GlobalThemeOverrides>(
      () => fontSizeOverrides[preferences.fontSize],
    );

    /**
     * Mirrors one browser color-scheme change into reactive presentation state.
     *
     * @param event - The media-query event containing the current dark-mode match.
     * @returns Nothing after updating local state.
     */
    function updateSystemTheme(event: MediaQueryListEvent): void {
      systemUsesDark.value = event.matches;
    }

    /** Releases the browser listener when the application root unmounts. */
    function stopSystemThemeListener(): void {
      systemThemeQuery.removeEventListener("change", updateSystemTheme);
    }

    systemThemeQuery.addEventListener("change", updateSystemTheme);
    onBeforeUnmount(stopSystemThemeListener);

    return () => (
      <NConfigProvider
        theme={theme.value}
        themeOverrides={themeOverrides.value}>
        <RouterView />
      </NConfigProvider>
    );
  },
  { name: "DemoApp" },
);

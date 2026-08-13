import {
  AdminProvider,
  resolveAdminNaiveBaseFontSize,
  useAdminProvider,
} from "@noob-naive-ui/admin";
import type { MenuOption } from "naive-ui";
import { defineComponent, onBeforeUnmount, watch } from "vue";
import { RouterView } from "vue-router";

import { i18n } from "./i18n";
import demoMessages from "./locales/demo.json";
import type { DemoNavKey } from "./routes";
import type { AdminLocaleOverrides } from "@noob-naive-ui/admin";

/**
 * Renders the demo's root providers around the host-owned outer route view.
 *
 * `AdminProvider` owns the package shell wiring: it initializes the
 * shell-preferences store, seeds the host global Composer with the demo
 * locale messages, and configures the shell menu from the demo tree built by
 * `createDemoMenu`. The browser color-scheme signal is runtime-only state the
 * host feeds into the preferences store; it is never serialized.
 *
 * naive-ui sets `body { font-size: 14px }` statically and cannot scale plain
 * HTML, so the host additionally applies the preference base font to the root
 * element; `rem`-based content then scales with the font-size preference.
 */

/** Creates one menu option with a reactive locale label while preserving host-owned nav-key identity. */
function createMenuOption(
  navKey: DemoNavKey,
  labelKey: `nav.${string}`,
): MenuOption {
  return { key: navKey, label: () => i18n.global.t(labelKey) };
}

/** Supplies the demo menu tree without coupling its hierarchy to route generation. */
function createDemoMenu(): MenuOption[] {
  return [
    createMenuOption("dashboard", "nav.dashboard"),
    {
      key: "demo",
      label: () => i18n.global.t("nav.demo"),
      children: [
        createMenuOption("internationalization", "nav.internationalization"),
      ],
    },
    {
      key: "workspace",
      label: () => i18n.global.t("nav.workspace"),
      children: [
        createMenuOption("reports", "nav.reports"),
        createMenuOption("settings", "nav.settings"),
      ],
    },
  ];
}
export default defineComponent(
  /**
   * Composes shared presentation state without owning auth, routes, or shell navigation.
   *
   * @returns A render function for the demo application root.
   */
  () => {
    /** Reads the admin provider's public preference/theme state initialized by `AdminProvider`. */
    const provider = useAdminProvider();
    /** Tracks the browser color scheme while system theme mode is selected. */
    const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

    /**
     * Mirrors one browser color-scheme change into the runtime-only store signal.
     *
     * @param event - The media-query event containing the current dark-mode match.
     * @returns Nothing after updating the store signal.
     */
    function updateSystemTheme(event: MediaQueryListEvent): void {
      provider.setSystemUsesDark(event.matches);
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
    function applyBaseFontSize(size: typeof provider.fontSize.value): void {
      document.documentElement.style.fontSize =
        resolveAdminNaiveBaseFontSize(size);
    }

    provider.setSystemUsesDark(systemThemeQuery.matches);
    systemThemeQuery.addEventListener("change", updateSystemTheme);
    /** Applies the base font immediately and on every font-size preference change. */
    const stopBaseFontSizeWatcher = watch(
      provider.fontSize,
      (size) => applyBaseFontSize(size),
      { immediate: true },
    );
    onBeforeUnmount(() => {
      stopSystemThemeListener();
      stopBaseFontSizeWatcher();
    });

    return () => (
      <AdminProvider
        messages={demoMessages}
        menu={createDemoMenu()}
        storeOptions={{
          defaults: {
            availableLocales: [
              { key: "en", label: "English" },
              { key: "zh-CN", label: "简体中文" },
            ],
          },
          fallbackLocale: "en",
        }}
        overrides={{
          "noob-naive-ui:admin": {
            en: { AdminShell: { account: { signOut: "Log out" } } },
            "zh-CN": { AdminShell: { account: { signOut: "退出" } } },
          } satisfies AdminLocaleOverrides,
        }}>
        <RouterView />
      </AdminProvider>
    );
  },
  { name: "DemoApp" },
);

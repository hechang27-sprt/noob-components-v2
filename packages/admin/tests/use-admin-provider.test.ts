// @vitest-environment happy-dom

import { darkTheme } from "naive-ui";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { createApp, defineComponent, type App } from "vue";
import { afterEach, describe, expect, it } from "vitest";

import {
  useAdminProvider,
  type AdminProviderApi,
} from "../src/use-admin-provider";
import { useAdminShellMenuStore } from "../src/stores/menu";
import type { AdminThemePreset } from "../src/runtime-contract";
import { useAdminShellPreferencesStore } from "../src/stores/shell-preferences";

/** Retains mounted apps until cleanup prevents DOM and Pinia state leakage. */
const mountedApps: App[] = [];

/** Unmounts every mounted application and clears the synthetic document. */
afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

/** The shared menu options configured into the menu store once per Pinia. */
const menuOptions = [{ key: "demo", label: () => "Demo" }];

/** Locale options seeded through the preferences store defaults. */
const availableLocales = [
  { key: "en", label: "English" },
  { key: "zh-CN", label: "中文" },
];

/**
 * Configures a fresh Pinia with the preferences store (initialize) and menu
 * store (configure) — the consumer-owned step `useAdminProvider` must never
 * perform itself.
 */
function configureStores(pinia: Pinia): void {
  useAdminShellPreferencesStore(pinia).initialize({
    defaults: {
      themeMode: "system",
      fontSize: "medium",
      locale: "en",
      availableLocales,
      sidebarCollapsed: false,
    },
    fallbackLocale: "en",
  });
  useAdminShellMenuStore(pinia).configure(menuOptions);
}

/**
 * Mounts a tiny component that resolves `useAdminProvider()` during setup and
 * returns the API object (setup runs synchronously during mount).
 */
function mountApi(pinia: Pinia): AdminProviderApi {
  let api!: AdminProviderApi;
  const target = document.createElement("div");
  document.body.append(target);
  const app = createApp(
    defineComponent({
      setup() {
        api = useAdminProvider();
        return () => null;
      },
    }),
  );
  app.use(pinia);
  app.mount(target);
  mountedApps.push(app);
  return api;
}

describe("useAdminProvider", () => {
  it("projects reactive state from the configured stores", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    configureStores(pinia);

    const api = mountApi(pinia);

    // Reactive state mirrors the configured preferences and menu stores.
    expect(api.themeMode.value).toBe("system");
    expect(api.themeKey.value).toBe("");
    expect(api.themes.value).toEqual([]);
    expect(api.activeTheme.value).toBeUndefined();
    expect(api.fontSize.value).toBe("medium");
    expect(api.locale.value).toBe("en");
    expect(api.availableLocales.value).toEqual(availableLocales);
    expect(api.menu.value).toEqual(menuOptions);
    // Default system mode with no dark signal resolves to a light theme.
    expect(api.naiveUiConfig.value.theme).toBeNull();
  });

  it("calls through to the stores for its actions", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    configureStores(pinia);

    const api = mountApi(pinia);
    const preferences = useAdminShellPreferencesStore(pinia);

    // setSystemUsesDark drives the composable's derived naiveUiConfig theme.
    api.setSystemUsesDark(true);
    expect(api.naiveUiConfig.value.theme).toBe(darkTheme);

    // setThemeMode updates the store's active mode and the projection.
    api.setThemeMode("dark");
    expect(preferences.preferences.themeMode).toBe("dark");
    expect(api.themeMode.value).toBe("dark");
    expect(api.naiveUiConfig.value.theme).toBe(darkTheme);

    // setTheme pins the mode to the preset polarity and records the key.
    api.configureThemePresets(
      [
        {
          key: "default",
          label: { kind: "string", value: "Default" },
          themeOverrides: { "naive-ui": {} },
          isDark: false,
        },
        {
          key: "midnight",
          label: { kind: "string", value: "Midnight" },
          themeOverrides: { "naive-ui": {} },
          isDark: true,
        },
      ],
      "default",
      "midnight",
    );
    api.setTheme("midnight");
    expect(preferences.preferences.themeMode).toBe("dark");
    expect(preferences.preferences.themeKey).toBe("midnight");
    expect(api.activeTheme.value?.key).toBe("midnight");
    expect(api.naiveUiConfig.value.theme).toBe(darkTheme);
    // Selecting an unknown key is a no-op.
    api.setTheme("missing");
    expect(preferences.preferences.themeKey).toBe("midnight");

    // setAvailableLocales re-seeds the store and the reactive projection.
    api.setAvailableLocales([{ key: "fr", label: "Français" }]);
    expect(preferences.preferences.availableLocales).toEqual([
      { key: "fr", label: "Français" },
    ]);
    expect(api.availableLocales.value).toEqual([
      { key: "fr", label: "Français" },
    ]);
  });

  it("is a pure projection: it never initializes or configures the stores", () => {
    // No configureStores: stores are unconfigured. Calling useAdminProvider
    // before consumers initialize/configure must not throw, and should
    // surface the stores' unconfigured defaults.
    const pinia = createPinia();
    setActivePinia(pinia);

    const api = mountApi(pinia);
    const preferences = useAdminShellPreferencesStore(pinia);
    const menu = useAdminShellMenuStore(pinia);

    expect(preferences.runtime.isHydrated).toBe(false);
    expect(menu.options).toEqual([]);
    expect(api.availableLocales.value).toEqual([]);
    expect(api.menu.value).toEqual([]);
    // Unconfigured defaults still surface (locale defaults to "en").
    expect(api.locale.value).toBe("en");
  });

  it("derives preferences, naiveUiConfig, and proLayoutConfig from raw store state", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    // The store holds only raw state; derived presentation config lives on the
    // composable, computed from these members.
    useAdminShellPreferencesStore(pinia).initialize({
      defaults: {
        themeMode: "light",
        fontSize: "small",
        locale: "en",
        availableLocales,
        sidebarCollapsed: false,
      },
    });
    useAdminShellMenuStore(pinia).configure(menuOptions);
    const api = mountApi(pinia);

    // `preferences` mirrors the store's raw state snapshot.
    expect(api.preferences.value).toEqual({
      themeMode: "light",
      themeKey: "",
      fontSize: "small",
      locale: "en",
      availableLocales,
      sidebarCollapsed: false,
    });

    // Light mode resolves to the light theme (null), and the font-size
    // preference maps to the per-component size tier, not a global size prop.
    const config = api.naiveUiConfig.value;
    expect(config.theme).toBeNull();
    expect(config.themeOverrides).toMatchObject({
      common: { fontSize: "13px" },
    });
    expect(config.componentOptions.Button?.size).toBe("small");
    expect(config.componentOptions.Input?.size).toBe("small");
    expect(config.componentOptions.Tabs?.size).toBe("small");
    expect("size" in config).toBe(false);

    // `proLayoutConfig` tracks the sidebar collapse state.
    expect(api.proLayoutConfig.value.collapsed).toBe(false);

    // Changing the font-size preference re-sizes every component together.
    api.setFontSize("large");
    expect(api.naiveUiConfig.value.themeOverrides).toMatchObject({
      common: { fontSize: "16px" },
    });
    expect(api.naiveUiConfig.value.componentOptions.Button?.size).toBe("large");
    expect(api.preferences.value.fontSize).toBe("large");

    // System mode follows the runtime-only dark signal.
    api.setThemeMode("system");
    expect(api.naiveUiConfig.value.theme).toBeNull();
    api.setSystemUsesDark(true);
    expect(api.naiveUiConfig.value.theme).not.toBeNull();

    // An unsupported locale resolves through the host fallback (en).
    api.setLocale("fr");
    expect(api.naiveUiConfig.value.locale).not.toBeNull();

    // Sidebar collapse propagates to both the snapshot and proLayoutConfig.
    api.setSidebarCollapsed(true);
    expect(api.preferences.value.sidebarCollapsed).toBe(true);
    expect(api.proLayoutConfig.value.collapsed).toBe(true);
  });

  it("resolves the active theme preset and merges its overrides", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useAdminShellPreferencesStore(pinia).initialize({
      defaults: { themeMode: "system", fontSize: "medium", locale: "en" },
      fallbackLocale: "en",
    });
    const api = mountApi(pinia);
    const preferences = useAdminShellPreferencesStore(pinia);

    const presets: AdminThemePreset[] = [
      {
        key: "default",
        label: { kind: "string", value: "Default" },
        themeOverrides: { "naive-ui": {
          common: { primaryColor: "#18a058", fontSize: "99px" } },
        },
        isDark: false,
      },
      {
        key: "ocean",
        label: { kind: "string", value: "Ocean" },
        themeOverrides: { "naive-ui": { common: { primaryColor: "#2563eb" } } },
        fontSizeOverrides: {
          small: { common: { fontSize: "12px" } },
          medium: { common: { fontSize: "18px" } },
          large: { common: { fontSize: "22px" } },
        },
        isDark: false,
      },
      {
        key: "midnight",
        label: { kind: "string", value: "Midnight" },
        themeOverrides: { "naive-ui": { common: { primaryColor: "#6366f1" } } },
        isDark: true,
      },
    ];
    api.configureThemePresets(presets, "default", "midnight");

    // System + OS light resolves the light default and merges its overrides.
    api.setSystemUsesDark(false);
    expect(api.activeTheme.value?.key).toBe("default");
    expect(api.naiveUiConfig.value.theme).toBeNull();
    expect(api.naiveUiConfig.value.themeOverrides).toMatchObject({
      common: { fontSize: "14px", primaryColor: "#18a058" },
    });
    // Without `fontSizeOverrides` the built-in "14px" tier beats the preset's
    // direct "99px" font value.
    expect(api.naiveUiConfig.value.themeOverrides.common?.fontSize).not.toBe(
      "99px",
    );

    // System + OS dark resolves the dark default on the dark base theme.
    api.setSystemUsesDark(true);
    expect(api.activeTheme.value?.key).toBe("midnight");
    expect(api.naiveUiConfig.value.theme).toBe(darkTheme);

    // Picking a preset pins mode and wins over the polarity default.
    api.setTheme("ocean");
    expect(api.activeTheme.value?.key).toBe("ocean");
    expect(api.naiveUiConfig.value.theme).toBeNull();
    expect(api.naiveUiConfig.value.themeOverrides).toMatchObject({
      common: { fontSize: "18px", primaryColor: "#2563eb" },
    });

    // A stored key whose polarity no longer matches falls back to the default.
    preferences.replacePreferences({ themeMode: "dark", themeKey: "ocean" });
    expect(api.activeTheme.value?.key).toBe("midnight");
  });
});

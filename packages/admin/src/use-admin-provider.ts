import { darkTheme } from "naive-ui";
import { storeToRefs } from "pinia";
import type { ProLayoutProps } from "pro-naive-ui";
import { computed, toRef, type ComputedRef, type Ref } from "vue";

import {
  COMPONENT_SIZE_OPTIONS,
  mergeAdminNaiveUiThemeOverrides,
  resolveAdminNaiveUiLocale,
  resolveDefaultNaiveUiTheme,
  resolveThemePreset,
  type AdminNaiveUiConfig,
} from "./runtime/naive-ui-config";
import {
  createDefaultAdminShellPreferences,
  normalizeShellPreferences,
  type AdminShellPreferencesStoreOptions,
} from "./runtime/shell-preferences";
import type {
  AdminFontSize,
  AdminLocaleOption,
  AdminMenuTree,
  AdminShellPreferences,
  AdminThemeMode,
  AdminThemePreset,
} from "./runtime-contract";
import { useAdminShellMenuStore } from "./stores/menu";
import { useAdminShellPreferencesStore } from "./stores/shell-preferences";

/**
 * The single public consumption surface for the admin package's presentational
 * state (theme, locale, font size, sidebar, menu) plus its derived
 * presentation config.
 *
 * State members are reactive refs (`Ref`/`ComputedRef`); actions are bound
 * store methods. Derived config (`preferences`, `naiveUiConfig`,
 * `proLayoutConfig`) is computed here from the minimal store's raw blobs —
 * not stored in the store (see `useAdminShellPreferencesStore`).
 *
 * Consumers (host apps, shell chrome, demo pages) import this type and call
 * {@link useAdminProvider}; they should not import the underlying Pinia
 * stores, which remain an implementation detail.
 */
export interface AdminProviderApi {
  /** Active theme mode (`"system"` | `"light"` | `"dark"`). */
  themeMode: Ref<AdminThemeMode>;
  /** Last-picked theme-preset key (`""` until a preset is chosen). */
  themeKey: Ref<string>;
  /** Host-supplied selectable theme presets (navbar dropdown options). */
  themes: Ref<AdminThemePreset[]>;
  /** The resolved active theme preset, or undefined when no preset matches. */
  activeTheme: ComputedRef<AdminThemePreset | undefined>;
  /** Active font-size tier; scales naive-ui component chrome and text. */
  fontSize: Ref<AdminFontSize>;
  /** Active UI locale key (e.g. `"en"`). */
  locale: Ref<string>;
  /** Host-supplied selectable locale options. */
  availableLocales: Ref<AdminLocaleOption[]>;
  /** Whether the sidebar is collapsed. */
  sidebarCollapsed: Ref<boolean>;
  /** True once preferences have been hydrated from storage. */
  isHydrated: Ref<boolean>;
  /** The full normalized preferences snapshot. */
  preferences: ComputedRef<AdminShellPreferences>;
  /** Derived naive-ui provider config (theme, overrides, locale, sizes). */
  naiveUiConfig: ComputedRef<AdminNaiveUiConfig>;
  /** Derived ProLayout props (sidebar collapse state). */
  proLayoutConfig: ComputedRef<ProLayoutProps>;
  /** Reactive admin sidebar menu options rendered by AdminShell. */
  menu: Ref<AdminMenuTree>;
  /** Sets the theme mode. */
  setThemeMode: (value: AdminThemeMode) => void;
  /** Selects a theme preset by key, pinning mode to its polarity. */
  setTheme: (key: string) => void;
  /** Configures the host-supplied theme presets and polarity defaults. */
  configureThemePresets: (
    themes: AdminThemePreset[],
    defaultTheme: string,
    defaultDarkTheme: string,
  ) => void;
  /** Sets the font-size tier. */
  setFontSize: (value: AdminFontSize) => void;
  /** Sets the active UI locale. */
  setLocale: (value: string) => void;
  /** Updates the runtime-only system dark-mode signal. */
  setSystemUsesDark: (value: boolean) => void;
  /** Collapses or expands the admin sidebar. */
  setSidebarCollapsed: (value: boolean) => void;
  /** Toggles the admin sidebar collapsed state. */
  toggleSidebar: () => void;
  /** Resets preferences to defaults (optionally overridden). */
  reset: (
    options?: Pick<AdminShellPreferencesStoreOptions, "defaults">,
  ) => void;
  /** Merges a partial preferences object into the current preferences. */
  replacePreferences: (value: Partial<AdminShellPreferences>) => void;
  /** Sets the host-supplied selectable locale options. */
  setAvailableLocales: (value: AdminLocaleOption[]) => void;
}

/**
 * Curated read/re-expose API over the admin package's Pinia stores.
 *
 * Consumers (host apps, shell chrome, demo pages) should not import the
 * stores directly: this composable is the single public consumption surface,
 * and the underlying Pinia stores remain an implementation detail. It reads
 * the store's opaque blobs via `toRef`, owns all preference semantics and
 * derivation via `computed`, and re-exposes actions as local functions; it
 * performs no `provide`/`inject` and owns no setup-scope mutable state beyond
 * the derived computeds.
 *
 * @returns The {@link AdminProviderApi} consumption surface.
 */
export function useAdminProvider(): AdminProviderApi {
  const store = useAdminShellPreferencesStore();
  const menu = useAdminShellMenuStore();

  // Persisted fields project into the store's `preferences` blob.
  const themeMode = toRef(store.preferences, "themeMode");
  const themeKey = toRef(store.preferences, "themeKey");
  const fontSize = toRef(store.preferences, "fontSize");
  const locale = toRef(store.preferences, "locale");
  const availableLocales = toRef(store.preferences, "availableLocales");
  const sidebarCollapsed = toRef(store.preferences, "sidebarCollapsed");
  // Non-persisted runtime fields project into the store's `runtime` blob.
  const isHydrated = toRef(store.runtime, "isHydrated");
  const systemUsesDark = toRef(store.runtime, "systemUsesDark");
  const fallbackLocale = toRef(store.runtime, "fallbackLocale");
  const themes = toRef(store.runtime, "themes");
  const defaultTheme = toRef(store.runtime, "defaultTheme");
  const defaultDarkTheme = toRef(store.runtime, "defaultDarkTheme");
  const { options: menuOptions } = storeToRefs(menu);

  const preferencesSnapshot = computed<AdminShellPreferences>(() => ({
    themeMode: store.preferences.themeMode,
    themeKey: store.preferences.themeKey,
    fontSize: store.preferences.fontSize,
    locale: store.preferences.locale,
    availableLocales: store.preferences.availableLocales.map((option) => ({
      ...option,
    })),
    sidebarCollapsed: store.preferences.sidebarCollapsed,
  }));

  /** The resolved active theme preset, driving the base theme and overrides. */
  const activeTheme = computed<AdminThemePreset | undefined>(() =>
    resolveThemePreset(
      themes.value,
      defaultTheme.value,
      defaultDarkTheme.value,
      themeMode.value,
      themeKey.value,
      systemUsesDark.value,
    ),
  );

  const naiveUiConfig = computed<AdminNaiveUiConfig>(() => {
    const preset = activeTheme.value;
    const { nLocale, nDateLocale } =
      resolveAdminNaiveUiLocale(locale.value, fallbackLocale.value) ?? {};
    return {
      theme: preset
        ? preset.isDark
          ? darkTheme
          : null
        : resolveDefaultNaiveUiTheme(themeMode.value, systemUsesDark.value),
      themeOverrides: mergeAdminNaiveUiThemeOverrides(fontSize.value, preset),
      locale: nLocale ?? null,
      dateLocale: nDateLocale ?? null,
      componentOptions: COMPONENT_SIZE_OPTIONS[fontSize.value],
    };
  });

  const proLayoutConfig = computed<ProLayoutProps>(() => ({
    collapsed: sidebarCollapsed.value,
  }));

  /** Sets the theme mode. */
  function setThemeMode(value: AdminThemeMode): void {
    store.preferences.themeMode = value;
  }
  /** Selects a theme preset by key, pinning the mode to its polarity. */
  function setTheme(key: string): void {
    const preset = themes.value.find((candidate) => candidate.key === key);
    if (!preset) return;
    store.preferences.themeKey = key;
    store.preferences.themeMode = preset.isDark ? "dark" : "light";
  }
  /** Writes the host-supplied theme presets + polarity defaults to the runtime blob. */
  function configureThemePresets(
    presetThemes: AdminThemePreset[],
    presetDefaultTheme: string,
    presetDefaultDarkTheme: string,
  ): void {
    store.runtime.themes = presetThemes;
    store.runtime.defaultTheme = presetDefaultTheme;
    store.runtime.defaultDarkTheme = presetDefaultDarkTheme;
  }
  /** Sets the font-size tier. */
  function setFontSize(value: AdminFontSize): void {
    store.preferences.fontSize = value;
  }
  /** Sets the active UI locale. */
  function setLocale(value: string): void {
    store.preferences.locale = value;
  }
  /** Updates the runtime-only system dark-mode signal. */
  function setSystemUsesDark(value: boolean): void {
    store.runtime.systemUsesDark = value;
  }
  /** Collapses or expands the admin sidebar. */
  function setSidebarCollapsed(value: boolean): void {
    store.preferences.sidebarCollapsed = value;
  }
  /** Toggles the admin sidebar collapsed state. */
  function toggleSidebar(): void {
    store.preferences.sidebarCollapsed = !store.preferences.sidebarCollapsed;
  }
  /** Resets preferences to defaults (optionally overridden). */
  function reset(
    options: Pick<AdminShellPreferencesStoreOptions, "defaults"> = {},
  ): void {
    store.reset(createDefaultAdminShellPreferences(options.defaults));
  }
  /** Merges a normalized partial preferences object into the current preferences. */
  function replacePreferences(value: Partial<AdminShellPreferences>): void {
    store.replacePreferences(
      normalizeShellPreferences({ ...store.preferences, ...value }),
    );
  }
  /** Sets the host-supplied selectable locale options. */
  function setAvailableLocales(value: AdminLocaleOption[]): void {
    store.preferences.availableLocales = value.map((option) => ({ ...option }));
    if (
      !store.preferences.availableLocales.some(
        (option) => option.key === store.preferences.locale,
      )
    ) {
      store.preferences.locale =
        store.preferences.availableLocales[0]?.key ?? "en";
    }
  }

  return {
    themeMode,
    themeKey,
    themes,
    activeTheme,
    fontSize,
    locale,
    availableLocales,
    sidebarCollapsed,
    isHydrated,
    preferences: preferencesSnapshot,
    naiveUiConfig,
    proLayoutConfig,
    menu: menuOptions,
    setThemeMode,
    setTheme,
    configureThemePresets,
    setFontSize,
    setLocale,
    setSystemUsesDark,
    setSidebarCollapsed,
    toggleSidebar,
    reset,
    replacePreferences,
    setAvailableLocales,
  };
}

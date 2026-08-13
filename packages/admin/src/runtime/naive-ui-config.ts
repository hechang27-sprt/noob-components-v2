import {
  darkTheme,
  enUS,
  zhCN,
  type GlobalComponentConfig,
  type GlobalTheme,
  type GlobalThemeOverrides,
  type NLocale,
} from "naive-ui";
import { merge } from "es-toolkit";

import type {
  AdminFontSize,
  AdminThemeMode,
  AdminThemePreset,
} from "../runtime-contract";
import type { AdminLocaleName } from "../i18n/admin-locale";

/**
 * NConfigProvider props derived from admin shell preferences.
 *
 * The store exposes this as a computed; hosts bind it directly:
 * `<n-config-provider v-bind="preferences.naiveUiConfig">`. It is derived
 * presentation state, never part of serialized preferences.
 */
export type AdminNaiveUiConfig = {
  /** Naive UI theme object, or null for the light theme. */
  theme: GlobalTheme | null;
  /** Bounded font-size overrides per font-size preference. */
  themeOverrides: GlobalThemeOverrides;
  /** Naive UI locale object, or null to keep the naive-ui default (enUS). */
  locale: NLocale | null;
  /**
   * Per-component size tier applied through `n-config-provider`'s
   * `componentOptions`, derived from the font-size preference. naive-ui has
   * no single global size knob, so each supported component's `size` is set
   * to the matching tier.
   */
  componentOptions: GlobalComponentConfig;
};

/** Maps each supported admin locale name to its naive-ui locale object. */
const NAIVE_UI_LOCALES: Record<AdminLocaleName, NLocale> = {
  en: enUS,
  "zh-CN": zhCN,
};

/**
 * Resolves the naive-ui locale object for an active locale, falling back to
 * the host-owned fallback locale when the active locale is unsupported.
 *
 * @param activeLocale - The current global Composer active locale.
 * @param fallbackLocale - The host-owned global fallback locale.
 * @returns The matching naive-ui locale, or null when neither is supported
 * (naive-ui then keeps its built-in enUS default).
 */
export function resolveAdminNaiveUiLocale(
  activeLocale: string,
  fallbackLocale: string,
): NLocale | null {
  return (
    NAIVE_UI_LOCALES[activeLocale as AdminLocaleName] ??
    NAIVE_UI_LOCALES[fallbackLocale as AdminLocaleName] ??
    null
  );
}

/** Fixed font-size overrides matching each public font-size preference. */
export const FONT_SIZE_OVERRIDES: Record<AdminFontSize, GlobalThemeOverrides> =
  {
    small: {
      common: {
        fontSize: "13px",
        fontSizeMini: "12px",
        fontSizeTiny: "12px",
        fontSizeSmall: "13px",
        fontSizeMedium: "13px",
        fontSizeLarge: "14px",
        fontSizeHuge: "15px",
      },
      Typography: {
        pFontSize: "13px",
        headerFontSize1: "28px",
        headerFontSize2: "22px",
        headerFontSize3: "18px",
        headerFontSize4: "15px",
        headerFontSize5: "13px",
        headerFontSize6: "13px",
      },
      Flex: {
        gapMedium: "4px 8px",
      },
    },
    medium: {
      // Naive UI Defaults
      common: {
        fontSize: "14px",
        fontSizeMini: "12px",
        fontSizeTiny: "13px",
        fontSizeSmall: "14px",
        fontSizeMedium: "14px",
        fontSizeLarge: "15px",
        fontSizeHuge: "16px",
      },
      Typography: {
        pFontSize: "14px",
        headerFontSize1: "32px",
        headerFontSize2: "24px",
        headerFontSize3: "20px",
        headerFontSize4: "16px",
        headerFontSize5: "14px",
        headerFontSize6: "14px",
      },
      Flex: {
        gapMedium: "8px 12px",
      },
    },
    large: {
      common: {
        fontSize: "16px",
        fontSizeMini: "13px",
        fontSizeTiny: "14px",
        fontSizeSmall: "15px",
        fontSizeMedium: "16px",
        fontSizeLarge: "18px",
        fontSizeHuge: "20px",
      },
      Typography: {
        pFontSize: "16px",
        headerFontSize1: "38px",
        headerFontSize2: "28px",
        headerFontSize3: "24px",
        headerFontSize4: "20px",
        headerFontSize5: "16px",
        headerFontSize6: "16px",
      },
      Flex: {
        gapMedium: "12px 16px",
      },
    },
  };

/**
 * Builds the `componentOptions` value applying one naive-ui size tier to every
 * component that accepts a `size` option.
 *
 * @param tier - The naive-ui component-size tier to apply (one of the font-size
 * preference values).
 * @returns A `GlobalComponentConfig` whose supported components all use the
 * given tier.
 */
function buildComponentSizeOptions(tier: AdminFontSize): GlobalComponentConfig {
  return {
    AutoComplete: { size: tier },
    Button: { size: tier },
    Card: { size: tier },
    Cascader: { size: tier },
    Checkbox: { size: tier },
    ColorPicker: { size: tier },
    DataTable: { size: tier },
    DatePicker: { size: tier },
    Descriptions: { size: tier },
    Dropdown: { size: tier },
    DynamicTags: { size: tier },
    Form: { size: tier },
    Input: { size: tier },
    InputNumber: { size: tier },
    InputOtp: { size: tier },
    Mention: { size: tier },
    Pagination: { size: tier },
    Popselect: { size: tier },
    Radio: { size: tier },
    Rate: { size: tier },
    Result: { size: tier },
    Select: { size: tier },
    Skeleton: { size: tier },
    Space: { size: tier },
    // Flex: { size: tier },
    Switch: { size: tier },
    Table: { size: tier },
    Tabs: { size: tier },
    Tag: { size: tier },
    TimePicker: { size: tier },
    Transfer: { size: tier },
    TreeSelect: { size: tier },
  };
}

/**
 * Naive-ui per-component size options matching each public font-size
 * preference, for `n-config-provider`'s `componentOptions` prop.
 */
export const COMPONENT_SIZE_OPTIONS: Record<
  AdminFontSize,
  GlobalComponentConfig
> = {
  small: buildComponentSizeOptions("small"),
  medium: buildComponentSizeOptions("medium"),
  large: buildComponentSizeOptions("large"),
};

/**
 * Resolves the CSS base font size for a font-size preference.
 *
 * naive-ui sets `body { font-size: 14px }` statically (it is not driven by
 * `themeOverrides`), so naive-ui cannot scale plain HTML content itself. Hosts
 * apply this value to their root element (e.g. `document.documentElement`) so
 * `rem`-based content scales with the preference. It mirrors the naive-ui
 * component font from `FONT_SIZE_OVERRIDES` so the 13/14/16px mapping lives in
 * one place.
 *
 * @param size - The active font-size preference tier.
 * @returns The matching CSS font-size, defaulting to 14px when absent.
 */
export function resolveAdminNaiveBaseFontSize(size: AdminFontSize): string {
  return FONT_SIZE_OVERRIDES[size].common?.fontSize ?? "14px";
}

/**
 * Resolves the naive-ui theme object from the theme-mode preference and the
 * current system dark-mode signal.
 *
 * @param themeMode - The stored presentation mode.
 * @param systemUsesDark - Whether the host browser reports dark mode.
 * @returns The theme object for dark mode, or null for light mode.
 */
export function resolveDefaultNaiveUiTheme(
  themeMode: AdminThemeMode,
  systemUsesDark: boolean,
): GlobalTheme | null {
  if (themeMode === "dark") return darkTheme;
  if (themeMode === "system" && systemUsesDark) return darkTheme;
  return null;
}

/**
 * Merges the active theme preset's font-size overrides (or the built-in
 * `FONT_SIZE_OVERRIDES` tier) with the preset's own color overrides, so both
 * the size tier and the preset colors apply together.
 *
 * naive-ui `GlobalThemeOverrides` nests component sections (`common`, per
 * component keys) with plain-object leaves, so a shallow spread would let the
 * preset's `common` block replace the font-size `common` block wholesale and
 * drop `fontSize`; es-toolkit `merge` deep-merges instead. The font-size layer
 * is the *source* so it takes precedence: without a preset `fontSizeOverrides`
 * entry the built-in hardcoded default font size wins over any font-size
 * values the preset sets directly in `naiveUiConfig`.
 *
 * @param size - Active font-size tier.
 * @param preset - The active theme preset, or undefined when none applies.
 * @returns Deep-merged `themeOverrides` for the naive-ui provider.
 */
export function mergeAdminNaiveUiThemeOverrides(
  size: AdminFontSize,
  preset: AdminThemePreset | undefined,
): GlobalThemeOverrides {
  if (!preset) return FONT_SIZE_OVERRIDES[size];
  const fontBase =
    preset.fontSizeOverrides?.[size] ?? FONT_SIZE_OVERRIDES[size];
  return merge(merge({}, preset.naiveUiConfig), fontBase);
}

/**
 * Resolves the active theme preset from the host-supplied presets, the
 * polarity defaults, and the stored mode/key.
 *
 * Precedence: (1) an explicitly picked preset (`themeKey`) matching the
 * effective polarity when the mode is `light`/`dark`; (2) the polarity
 * default (`defaultDarkTheme` when dark, else `defaultTheme`); (3) the first
 * preset of the effective polarity. When the mode is `"system"` the picked
 * `themeKey` is ignored so the OS-driven polarity default wins.
 *
 * @param themes - Host-supplied presets from the preferences store.
 * @param defaultTheme - Default light preset key (`"system"` mode + OS light).
 * @param defaultDarkTheme - Default dark preset key (`"system"` mode + OS dark).
 * @param themeMode - Stored light/dark/system mode.
 * @param themeKey - Stored last-picked preset key (`""` when none).
 * @param systemUsesDark - Whether the host browser reports dark mode.
 * @returns The matching preset, or undefined when no preset matches (the
 * caller then falls back to the theme-mode-driven base resolution).
 */
export function resolveThemePreset(
  themes: AdminThemePreset[],
  defaultTheme: string,
  defaultDarkTheme: string,
  themeMode: AdminThemeMode,
  themeKey: string,
  systemUsesDark: boolean,
): AdminThemePreset | undefined {
  const isDark =
    themeMode === "dark" || (themeMode === "system" && systemUsesDark);

  if (themeMode !== "system") {
    const picked = themes.find(
      (preset) => preset.key === themeKey && preset.isDark === isDark,
    );
    if (picked) return picked;
  }

  const defaultKey = isDark ? defaultDarkTheme : defaultTheme;
  if (defaultKey) {
    const byDefault = themes.find(
      (preset) => preset.key === defaultKey && preset.isDark === isDark,
    );
    if (byDefault) return byDefault;
  }

  return themes.find((preset) => preset.isDark === isDark);
}

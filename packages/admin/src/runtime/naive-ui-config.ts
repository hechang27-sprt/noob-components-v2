import {
  darkTheme,
  enUS,
  zhCN,
  type GlobalComponentConfig,
  type GlobalTheme,
  type GlobalThemeOverrides,
  type NLocale,
} from "naive-ui";

import type { AdminFontSize, AdminThemeMode } from "../runtime-contract";
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
    small: { common: { fontSize: "13px" } },
    medium: { common: { fontSize: "14px" } },
    large: { common: { fontSize: "16px" } },
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
function buildComponentSizeOptions(
  tier: AdminFontSize,
): GlobalComponentConfig {
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
export function resolveAdminNaiveUiTheme(
  themeMode: AdminThemeMode,
  systemUsesDark: boolean,
): GlobalTheme | null {
  if (themeMode === "dark") return darkTheme;
  if (themeMode === "system" && systemUsesDark) return darkTheme;
  return null;
}

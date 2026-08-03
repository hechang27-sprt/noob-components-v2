import {
  darkTheme,
  enUS,
  zhCN,
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
  /** Naive UI component-size tier derived from the font-size preference. */
  size: "small" | "medium" | "large";
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

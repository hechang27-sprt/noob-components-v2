import type { GlobalThemeOverrides, MenuOption } from "naive-ui";
import type { I18nText } from "@noob-naive-ui/i18n";
import type { RegistryThemeOverrides } from "@noob-naive-ui/registry";
import type { AdminLocale, AdminLocaleName } from "./i18n/admin-locale";

// Declare the admin library's FULL locale + themeVar types into the
// framework-wide registry so the derived projections (`RegistryI18nOverrides` /
// `RegistryThemeOverrides`, and via them `AdminPresetThemeOverrides` /
// `AdminProviderProps.i18nOverrides`) carry the admin library's override
// types without hardcoding libraryId elsewhere or pre-partializing here.
declare module "@noob-naive-ui/registry" {
  interface LibraryOverridesRegistry {
    "noob-naive-ui:admin": {
      locale: Record<AdminLocaleName, AdminLocale>;
      theme: AdminThemeComponents;
    };
  }
}

export type AdminAuthStatus =
  | { kind: "loading" }
  | {
      kind: "anonymous";
      reason?: "signed-out" | "expired" | "forbidden" | "unknown";
    }
  | {
      kind: "authenticated";
      userLabel?: string;
      avatarUrl?: string;
      subtitle?: string;
    };
export type AdminAuthIdentity = {
  userLabel?: string;
  avatarUrl?: string;
  subtitle?: string;
};

export type AdminAuthRestoreResult =
  | { kind: "authenticated"; identity: AdminAuthIdentity }
  | { kind: "anonymous" };

export type AdminLoginValues = {
  username: string;
  password: string;
  remember?: boolean;
};

export type AdminRouteKey = string;

export type AdminMenuTree = MenuOption[];

export type AdminThemeMode = "light" | "dark" | "system";
export type AdminFontSize = "small" | "medium" | "large";

/**
 * Open registry of admin package theme components; empty until admin ships
 * components that declare themeVars. Extend as components are added.
 */
export type AdminThemeComponents = {};

/** Admin package themeVar overrides, derived from the registry's declared theme schema. */
export type AdminThemeOverrides = RegistryThemeOverrides["noob-naive-ui:admin"];

/**
 * Per-library themeVar override tree selectable from a theme preset, derived
 * purely from `LibraryOverridesRegistry` (the theme projection). naive-ui and
 * pro-naive-ui are preseeded into the registry (GlobalThemeOverrides —
 * pro-naive-ui forwards them to naive-ui's NConfigProvider, so both merge into
 * the same `naiveUiConfig.themeOverrides`); admin and ui declare their own
 * entries via module augmentation. Theme presets are the sole source of
 * themeVar overrides.
 */
export type AdminPresetThemeOverrides = RegistryThemeOverrides;

/**
 * One named, host-supplied theme preset selectable from the navbar.
 *
 * `isDark` fixes the preset's polarity (base `darkTheme` vs light), while
 * `themeOverrides` carries the preset's per-library themeVar overrides. The
 * naive-ui/pro-naive-ui slices are merged on top of the font-size overrides.
 * `label` is resolved reactively at render time so preset names stay
 * locale-aware.
 */
export type AdminThemePreset = {
  /** Stable, unique preset identity used as the persisted selection and dropdown value. */
  key: string;
  /** Display label, resolved against the nearest Composer at render time. */
  label: I18nText;
  /** Per-library themeVar overrides applied on top of the font-size overrides. */
  themeOverrides: AdminPresetThemeOverrides;
  /**
   * Optional per-font-size override layers replacing the built-in
   * `FONT_SIZE_OVERRIDES` for this preset. When absent, the built-in
   * hardcoded default font size takes precedence over any font-size values
   * set directly in `themeOverrides["naive-ui"]`.
   */
  fontSizeOverrides?: Record<AdminFontSize, GlobalThemeOverrides>;
  /** True renders the preset on the naive-ui dark base theme. */
  isDark: boolean;
};

export type AdminLocaleOption = {
  key: string;
  label: string;
};

export type AdminShellPreferences = {
  /** Light/dark polarity plus optional system (follow-OS) resolution. */
  themeMode: AdminThemeMode;
  /** Last-picked theme-preset key (`""` until a preset is chosen). */
  themeKey: string;
  fontSize: AdminFontSize;
  locale: string;
  availableLocales: AdminLocaleOption[];
  sidebarCollapsed: boolean;
};

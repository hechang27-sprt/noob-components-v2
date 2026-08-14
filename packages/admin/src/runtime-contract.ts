import type { GlobalThemeOverrides, MenuOption } from "naive-ui";
import type { I18nText, LibraryThemeOverrides } from "@noob-naive-ui/i18n";
import type { NoobUiThemeOverrides } from "@noob-naive-ui/ui";

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

/** Admin package themeVar overrides, structurally typed by component. */
export type AdminThemeOverrides = LibraryThemeOverrides<AdminThemeComponents>;

/**
 * Per-library themeVar override tree selectable from a theme preset. Theme
 * presets are the sole source of themeVar overrides: naive-ui and pro-naive-ui
 * slices feed the naive-ui provider's `themeOverrides` (pro-naive-ui forwards
 * GlobalThemeOverrides to naive-ui's NConfigProvider, so both merge into the
 * same `naiveUiConfig.themeOverrides`); the admin and ui slices feed their
 * per-package ConfigProviders; the index signature admits 3rd-party libraries.
 */
export type AdminPresetThemeOverrides = {
  "naive-ui"?: GlobalThemeOverrides;
  "pro-naive-ui"?: GlobalThemeOverrides;
  "noob-naive-ui:admin"?: AdminThemeOverrides;
  "noob-naive-ui:ui"?: NoobUiThemeOverrides;
  [libraryId: string]: unknown;
};

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

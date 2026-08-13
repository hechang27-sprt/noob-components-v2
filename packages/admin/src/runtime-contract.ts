import type { GlobalThemeOverrides, MenuOption } from "naive-ui";
import type { I18nText } from "@noob-naive-ui/i18n";

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
 * One named, host-supplied naive-ui theme preset selectable from the navbar.
 *
 * `isDark` fixes the preset's polarity (base `darkTheme` vs light), while
 * `naiveUiConfig` carries the preset's own color overrides merged on top of
 * the font-size overrides. `label` is resolved reactively at render time so
 * preset names stay locale-aware.
 */
export type AdminThemePreset = {
  /** Stable, unique preset identity used as the persisted selection and dropdown value. */
  key: string;
  /** Display label, resolved against the nearest Composer at render time. */
  label: I18nText;
  /** Preset color overrides applied on top of the font-size overrides. */
  naiveUiConfig: GlobalThemeOverrides;
  /**
   * Optional per-font-size override layers replacing the built-in
   * `FONT_SIZE_OVERRIDES` for this preset. When absent, the built-in
   * hardcoded default font size takes precedence over any font-size values
   * set directly in `naiveUiConfig`.
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

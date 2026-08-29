import type { MenuOption } from "naive-ui";
import type { I18nText } from "@noob-naive-ui/i18n";
import type {
  AdminFontSize,
  RegistryThemeOverrides,
} from "@noob-naive-ui/registry";
import { LIB_ID } from "./registry";

// The font-size tier union lives in the registry so themeVar values can key
// on it (`ThemeVarValue = string | Record<AdminFontSize, string>`); re-export
// under the historical admin name so existing imports keep working.
export type { AdminFontSize } from "@noob-naive-ui/registry";

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

/** Admin package themeVar overrides, derived from the registry's declared theme schema. */
export type AdminThemeOverrides = RegistryThemeOverrides[typeof LIB_ID];

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
 * `isDark` fixes the preset's polarity (base `darkTheme` vs light);
 * `themeOverrides` carries the preset's per-library themeVar overrides and may
 * use size-keyed values (`ThemeVarValue`) in ANY library slice — the
 * naive-ui/pro-naive-ui slices resolve against the active font size in the
 * naive-ui merge (over the built-in `FONT_SIZE_OVERRIDES` default tier), and
 * noob-package slices (ui, admin) resolve in `useTheme` — so font-size
 * configuration is just size-keyed values in `themeOverrides`. `label` is
 * resolved reactively at render time so preset names stay locale-aware.
 */
export type AdminThemePreset = {
  /** Stable, unique preset identity used as the persisted selection and dropdown value. */
  key: string;
  /** Display label, resolved against the nearest Composer at render time. */
  label: I18nText;
  /** Per-library themeVar overrides (may carry size-keyed values). */
  themeOverrides: AdminPresetThemeOverrides;
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

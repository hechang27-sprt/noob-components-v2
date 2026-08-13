import type { GlobalThemeOverrides } from "naive-ui";
import type { AdminThemePreset } from "@noob-naive-ui/admin";

/**
 * Wraps a demo `themes.*` message key as an i18n `I18nText`, resolved
 * reactively against the host global Composer so preset names localize with
 * the active language.
 */
function themeLabel(key: string): AdminThemePreset["label"] {
  return { kind: "i18n", key: `themes.${key}` };
}

/** Builds a light/dark preset from a named accent palette. */
function preset(
  key: string,
  isDark: boolean,
  overrides: GlobalThemeOverrides,
): AdminThemePreset {
  return { key, label: themeLabel(key), naiveUiConfig: overrides, isDark };
}

/** Accent-only light presets (base light theme provides surfaces/typography). */
const LIGHT_ACCENT = (color: string): GlobalThemeOverrides => ({
  common: {
    primaryColor: color,
    primaryColorHover: color,
    primaryColorPressed: color,
    primaryColorSuppl: color,
  },
});

/** Dark presets override the base dark surfaces so each theme reads distinctly. */
const DARK_ACCENT = (
  color: string,
  bodyColor: string,
  cardColor: string,
): GlobalThemeOverrides => ({
  common: {
    primaryColor: color,
    primaryColorHover: color,
    primaryColorPressed: color,
    primaryColorSuppl: color,
    bodyColor,
    cardColor,
    popoverColor: cardColor,
    modalColor: cardColor,
  },
});

/**
 * The demo's selectable naive-ui theme presets (navbar theme dropdown).
 *
 * `default` (light) and `midnight` (dark) are the polarity defaults resolved
 * while the stored theme mode is `"system"` — the browser color scheme picks
 * between them until the user explicitly selects a preset.
 */
export const demoThemePresets: AdminThemePreset[] = [
  // Light
  preset("default", false, LIGHT_ACCENT("#18a058")),
  preset("ocean", false, LIGHT_ACCENT("#2563eb")),
  preset("sunset", false, LIGHT_ACCENT("#f97316")),
  // Dark
  preset("midnight", true, DARK_ACCENT("#6366f1", "#0f1220", "#171a2c")),
  preset("forest", true, DARK_ACCENT("#22c55e", "#0f1a12", "#16231a")),
  preset("crimson", true, DARK_ACCENT("#ef4444", "#1a0f12", "#2a171b")),
];

/** The default light preset key, resolved while theme mode is `"system"` + OS light. */
export const demoDefaultTheme = "default";
/** The default dark preset key, resolved while theme mode is `"system"` + OS dark. */
export const demoDefaultDarkTheme = "midnight";

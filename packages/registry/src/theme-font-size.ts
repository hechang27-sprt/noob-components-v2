import type { InjectionKey, Ref } from "vue";

/**
 * Framework-wide font-size tier union, matching naive-ui's
 * small/medium/large component-size tiers. Historically defined in the admin
 * package (`runtime-contract`), it lives here so the registry can key
 * themeVar values on it (`ThemeVarValue`) and resolve them reactively; the
 * admin package re-exports it under the same name.
 */
export type AdminFontSize = "small" | "medium" | "large";

/**
 * One themeVar's value. A plain `string` applies at every font size; a
 * per-font-size record lets a var scale with the active tier. `useTheme`
 * resolves records against the injected active font size (see
 * {@link themeFontSizeKey}), defaulting to {@link DEFAULT_THEME_FONT_SIZE}
 * when no provider is mounted.
 */
export type ThemeVarValue = string | Record<AdminFontSize, string>;

/**
 * The active font-size tier assumed when no provider supplies one — naive-ui's
 * default tier.
 */
export const DEFAULT_THEME_FONT_SIZE: AdminFontSize = "medium";

/**
 * Injection key for the active font-size tier. The admin package provides the
 * preference-resolved tier (`AdminProvider` → preferences store) so
 * `useTheme` can resolve size-keyed themeVar values without component
 * consumers knowing the tier themselves.
 */
export const themeFontSizeKey: InjectionKey<Ref<AdminFontSize>> = Symbol(
  "noob-naive-ui:theme-font-size",
);

import type { ComputedRef } from "vue";
import { useTheme, type ThemeCssVarsFor } from "@noob-naive-ui/registry";
import { noobUiCssPrefix, type UiThemeComponents } from "./types";

/**
 * The ui package's typed `useTheme` wrapper: reads one ui component's
 * themeVar slice from the shared unified registry and converts it to CSS
 * custom properties (`borderColor` → `--noob-ui-card-border-color`). The
 * reusable machinery lives in `@noob-naive-ui/registry`'s `useTheme`; this
 * wrapper locks the ui libraryId (`noob-naive-ui:ui` — the registry
 * augmentation's key) and the ui CSS prefix (`"noob-ui"`).
 *
 * Provider-less → `undefined` (no throw), unless `defaults` are passed — then
 * the defaults are converted and merged underneath provider overrides, and
 * the result is never `undefined`. Unlike naive-ui's `useTheme`.
 *
 * @typeParam K - One ui component key.
 * @param componentId - The component whose themeVars are requested.
 * @param defaults - Optional declared camelCase defaults for the component
 * (merged under provider overrides; makes the result never `undefined`).
 * @returns A computed of the component's CSS custom-property overrides, or
 * `undefined`.
 */
export function useUiTheme<const K extends keyof UiThemeComponents>(
  componentId: K,
  defaults: Partial<UiThemeComponents[K]>,
): ComputedRef<
  Partial<ThemeCssVarsFor<"noob-ui", K, UiThemeComponents[K] & object>>
>;
export function useUiTheme<const K extends keyof UiThemeComponents>(
  componentId: K,
): ComputedRef<
  | Partial<ThemeCssVarsFor<"noob-ui", K, UiThemeComponents[K] & object>>
  | undefined
>;
export function useUiTheme<const K extends keyof UiThemeComponents>(
  componentId: K,
  defaults?: Partial<UiThemeComponents[K]>,
) {
  return useTheme({
    // The literal is the `noob-naive-ui:ui` registry key declared by the ui
    // augmentation in `theme/types.ts` (also `noobUiTheme.libraryId`).
    libraryId: "noob-naive-ui:ui",
    cssPrefix: noobUiCssPrefix,
    componentId,
    defaults,
  });
}

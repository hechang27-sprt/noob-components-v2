import { useTheme } from "@noob-naive-ui/registry";
import { noobUiCssPrefix, type UiThemeComponents } from "./types";

/**
 * The ui package's typed `useTheme` wrapper: reads one ui component's
 * themeVar override slice from the shared unified registry and converts it to
 * CSS custom properties (`borderColor` → `--ui-card-border-color`). The
 * reusable machinery lives in `@noob-naive-ui/registry`'s `useTheme`; this
 * wrapper locks the ui libraryId (`noob-naive-ui:ui` — the registry
 * augmentation's key) and the ui CSS prefix (`"ui"`).
 *
 * Provider-less → `undefined` → the component falls back to its own defaults
 * (no throw), unlike naive-ui's `useTheme`.
 *
 * @typeParam K - One ui component key.
 * @param componentId - The component whose themeVars are requested.
 * @returns A computed of the component's CSS custom-property overrides, or
 * `undefined`.
 */
export function useUiTheme<const K extends keyof UiThemeComponents>(
  componentId: K,
) {
  return useTheme({
    // The literal is the `noob-naive-ui:ui` registry key declared by the ui
    // augmentation in `theme/types.ts` (also `noobUiTheme.libraryId`).
    libraryId: "noob-naive-ui:ui",
    cssPrefix: noobUiCssPrefix,
    componentId,
  });
}

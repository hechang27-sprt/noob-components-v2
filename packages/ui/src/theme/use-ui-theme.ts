import type { ComputedRef } from "vue";
import { useTheme, type ThemeCssVarsFor } from "@noob-naive-ui/registry";
import { noobUiCssPrefix, type UiThemeComponents } from "./types";

type Defaults<K extends keyof UiThemeComponents> =
  | Partial<UiThemeComponents[K]>
  | (() => Partial<UiThemeComponents[K]>);

export function useUiTheme<const K extends keyof UiThemeComponents>(
  componentId: K,
  defaults: Defaults<K>,
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
  defaults?: Defaults<K>,
) {
  return useTheme({
    libraryId: "noob-naive-ui:ui",
    cssPrefix: noobUiCssPrefix,
    componentId,
    defaults,
  });
}

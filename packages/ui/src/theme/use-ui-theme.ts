import { computed, inject } from "vue";
import { libraryOverridesKey } from "@noob-naive-ui/registry";
import { noobUiTheme, type NoobUiThemeOverrides, type UiThemeComponents } from "./types";

/**
 * Reads one ui component's themeVar override slice from the shared unified
 * registry (ui `libraryId` → `theme` → component). Provider-less → `undefined`
 * → the component falls back to its own defaults (no throw), unlike naive-ui's
 * `useTheme`.
 *
 * The `as … | undefined` cast is the registry read boundary: `.theme` is
 * `unknown` (`LibraryOverridesRegistry` entry) and indexing `unknown` is a TS
 * error. It does NOT weaken exact-`--n-*` typing — that rejection lives at the
 * host boundary (`NoobUiThemeOverrides` prop).
 *
 * @typeParam K - One ui component key.
 * @param componentId - The component whose themeVars are requested.
 * @returns A computed of the component's override slice, or `undefined`.
 */
export function useUiTheme<const K extends keyof UiThemeComponents>(
  componentId: K,
) {
  const registry = inject(libraryOverridesKey, null);
  return computed<Partial<UiThemeComponents[K]> | undefined>(() => {
    // Registry values are loose (unknown) at the provider boundary; cast the
    // ui theme tree once here, then index by component so the exact var names
    // survive for the caller (unknown names were already rejected at the host
    // `NoobUiThemeOverrides` prop boundary).
    const theme = registry?.value?.[noobUiTheme.libraryId]?.theme as
      | NoobUiThemeOverrides
      | undefined;
    return theme?.[componentId];
  });
}

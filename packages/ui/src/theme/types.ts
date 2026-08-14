import type {
  LibraryThemeDescriptor,
  RegistryThemeOverrides,
} from "@noob-naive-ui/registry";
import type { NoobUiLocale, NoobUiLocaleName } from "../i18n/plugin";
import type { UiCardThemeVars } from "../card/ui-card";

// Declare the ui library's FULL locale + themeVar types into the framework-
// wide registry so the derived projections (`RegistryI18nOverrides` /
// `RegistryThemeOverrides`) carry the ui library's override types without
// hardcoding libraryId elsewhere or pre-partializing here.
declare module "@noob-naive-ui/registry" {
  interface LibraryOverridesRegistry {
    "noob-naive-ui:ui": {
      locale: Record<NoobUiLocaleName, NoobUiLocale>;
      theme: UiThemeComponents;
    };
  }
}

/**
 * Component-first themeVar schema for ui package components. Extend per
 * component; each entry declares the component's exact `--n-*` var names so
 * `NoobUiThemeOverrides.Card` autocompletes them and rejects unknown keys.
 */
export interface UiThemeComponents {
  Card: UiCardThemeVars;
}

/** Typed per-component themeVar overrides for the ui package, derived from the registry. */
export type NoobUiThemeOverrides = RegistryThemeOverrides["noob-naive-ui:ui"];

/**
 * The ui package's typed theme descriptor. The runtime value is only the
 * stable `libraryId` under which theme overrides live in the shared registry;
 * the `__theme` brand pins the themeVar schema at type level only.
 */
export const noobUiTheme: LibraryThemeDescriptor<UiThemeComponents> = {
  libraryId: "noob-naive-ui:ui",
};

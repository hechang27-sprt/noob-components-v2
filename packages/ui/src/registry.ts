import { NoobUiThemeComponents } from "@noob-naive-ui/ui";
import { NoobUiLocale, NoobUiLocaleName } from "./i18n";

export const LIB_ID = "noob-naive-ui:ui" as const;

// Declare the ui library's FULL locale + themeVar types into the framework-
// wide registry so the derived projections (`RegistryI18nOverrides` /
// `RegistryThemeOverrides`) carry the ui library's override types without
// hardcoding libraryId elsewhere or pre-partializing here.
declare module "@noob-naive-ui/registry" {
  interface LibraryOverridesRegistry {
    [LIB_ID]: {
      locale: Record<NoobUiLocaleName, NoobUiLocale>;
      theme: NoobUiThemeComponents;
    };
  }
}

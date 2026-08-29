import { AdminLocale, AdminLocaleName } from "./i18n";
import { type AdminThemeComponents } from "./theme";

/**
 * The admin package's stable library key under which hosts provide admin
 * overrides in the shared override registry (via the `AdminProvider`
 * `i18nOverrides` prop). The `LibraryOverridesRegistry` module augmentation
 * declares the FULL admin locale schema, so `createComponentI18n` derives it
 * from this key alone — there is no separate descriptor handle.
 */
export const LIB_ID = "noob-naive-ui:admin" as const;

// Declare the admin library's FULL locale + themeVar types into the
// framework-wide registry so the derived projections (`RegistryI18nOverrides` /
// `RegistryThemeOverrides`, and via them `AdminPresetThemeOverrides` /
// `AdminProviderProps.i18nOverrides`) carry the admin library's override
// types without hardcoding libraryId elsewhere or pre-partializing here.
declare module "@noob-naive-ui/registry" {
  interface LibraryOverridesRegistry {
    [LIB_ID]: {
      locale: Record<AdminLocaleName, AdminLocale>;
      theme: AdminThemeComponents;
    };
  }
}

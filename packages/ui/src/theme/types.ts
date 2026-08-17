import type {
  LibraryThemeDescriptor,
  RegistryThemeOverrides,
} from "@noob-naive-ui/registry";
import type { NoobUiLocale, NoobUiLocaleName } from "../i18n/plugin";

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

/** CSS custom-property prefix for the ui library (`--noob-ui-…`). */
export const noobUiCssPrefix = "noob-ui" as const;

/**
 * Component-first themeVar schema for ui package components — the empty
 * augmentation hook. Each component declares its own camelCase themeVar
 * schema into this interface via module augmentation targeting
 * `@noob-naive-ui/ui`:
 *
 * ```ts
 * // ui-card.tsx
 * declare module "@noob-naive-ui/ui" {
 *   interface UiThemeComponents { Card: UiCardThemeVars; }
 * }
 * ```
 *
 * The merged interface drives `NoobUiThemeOverrides.Card` (autocompletes
 * `borderColor`-style names and rejects raw `--noob-ui-…` names) and
 * `useUiTheme`'s component key. `useUiTheme` (registry `useTheme`) converts
 * overrides to `--noob-ui-<component>-<kebab-case>` CSS custom properties.
 */
export interface UiThemeComponents {}

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

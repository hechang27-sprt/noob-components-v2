import type {
  LibraryThemeDescriptor,
  LibraryThemeOverrides,
} from "@noob-naive-ui/i18n";
import type { UiCardThemeVars } from "../card/ui-card";

/**
 * Component-first themeVar schema for ui package components. Extend per
 * component; each entry declares the component's exact `--n-*` var names so
 * `NoobUiThemeOverrides.Card` autocompletes them and rejects unknown keys.
 */
export interface UiThemeComponents {
  Card: UiCardThemeVars;
}

/** Typed per-component themeVar overrides for the ui package. */
export type NoobUiThemeOverrides = LibraryThemeOverrides<UiThemeComponents>;

/**
 * The ui package's typed theme descriptor. The runtime value is only the
 * stable `libraryId` under which theme overrides live in the shared registry;
 * the `__theme` brand pins the themeVar schema at type level only.
 */
export const noobUiTheme: LibraryThemeDescriptor<UiThemeComponents> = {
  libraryId: "noob-naive-ui:ui",
};

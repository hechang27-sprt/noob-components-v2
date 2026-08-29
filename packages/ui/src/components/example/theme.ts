import { ThemeVarValue } from "@noob-naive-ui/registry";
import { COMPONENT_ID } from "./root";

/**
 * The Card's themeVar schema in camelCase (naive-ui's convention). `useUiTheme`
 * converts each key to its `--noob-ui-card-…` CSS custom property automatically
 * (`borderColor` → `--noob-ui-card-border-color`), so
 * `NoobUiThemeOverrides.Card` autocompletes `borderColor`-style names and
 * rejects raw `--noob-ui-…` names.
 */
export type ExampleThemeVars = {
  background: string;
  borderColor: string;
  /** Scales with the active font-size tier (size-keyed value). */
  padding: ThemeVarValue;
};

/**
 * Registers the Card themeVar schema into the ui package's shared
 * `UiThemeComponents` hook (the empty mergeable interface in
 * `src/theme/types.ts`). This is what makes `NoobUiThemeOverrides.Card`
 * autocomplete `borderColor`-style names and `useUiTheme("Card")` typecheck.
 */
declare module "@noob-naive-ui/ui" {
  interface NoobUiThemeComponents {
    [COMPONENT_ID]: ExampleThemeVars;
  }
}

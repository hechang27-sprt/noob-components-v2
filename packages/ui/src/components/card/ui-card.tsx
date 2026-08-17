import { defineComponent, type CSSProperties } from "vue";
import type { ThemeVarValue } from "@noob-naive-ui/registry";
import { useUiTheme } from "../../theme/use-ui-theme";

/**
 * The Card's themeVar schema in camelCase (naive-ui's convention). `useUiTheme`
 * converts each key to its `--noob-ui-card-…` CSS custom property automatically
 * (`borderColor` → `--noob-ui-card-border-color`), so
 * `NoobUiThemeOverrides.Card` autocompletes `borderColor`-style names and
 * rejects raw `--noob-ui-…` names.
 */
export type UiCardThemeVars = {
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
  interface UiThemeComponents {
    Card: UiCardThemeVars;
  }
}

/**
 * Proof component: reads its own themeVar slice via `useUiTheme("Card")` with
 * its declared defaults, so the root always receives the `--noob-ui-card-…`
 * CSS variables (defaults merged under any provider override). No stylesheet
 * defaults are needed.
 */
export const UiCard = defineComponent({
  name: "UiCard",
  setup(_, { slots }) {
    const overrides = useUiTheme("Card", {
      background: "#ffffff",
      borderColor: "#d0d5dd",
      padding: { small: "0.75rem", medium: "1rem", large: "1.25rem" },
    });
    return () => (
      <div class="ui-card" style={overrides.value as CSSProperties}>
        {slots.default?.()}
      </div>
    );
  },
});

import { computed, defineComponent, type CSSProperties } from "vue";
import { useUiTheme } from "../theme/use-ui-theme";

/**
 * The Card's exact themeVar names, preserved as literal keys in type info so
 * `NoobUiThemeOverrides.Card` autocompletes them and rejects unknown names.
 * Defaults live in `src/style.css` under `.ui-card`.
 */
export type UiCardThemeVars = {
  "--ui-card-bg": string;
  "--ui-card-border-color": string;
  "--ui-card-padding": string;
};

/**
 * Proof component: reads its own themeVar slice via `useUiTheme("Card")` and
 * binds the overrides as inline CSS variables on its root. Provider-less, it
 * renders the `.ui-card` defaults from the package's compiled CSS.
 */
export const UiCard = defineComponent({
  name: "UiCard",
  setup(_, { slots }) {
    const overrides = useUiTheme("Card");
    const style = computed(() => overrides.value ?? {});
    return () => (
      <div class="ui-card" style={style.value as CSSProperties}>
        {slots.default?.()}
      </div>
    );
  },
});

import { defineComponent, type CSSProperties } from "vue";
import { useUiTheme } from "../../theme";
import { createComponentI18n } from "@noob-naive-ui/i18n";
import exampleMessages from "../../locales/Example.json";
import { NH3, NP } from "naive-ui";

export const COMPONENT_ID = "Example" as const;

/**
 * Proof component: reads its own themeVar slice via `useUiTheme("Card")` with
 * its declared defaults, so the root always receives the `--noob-ui-card-…`
 * CSS variables (defaults merged under any provider override). No stylesheet
 * defaults are needed.
 */
export const Root = defineComponent(
  (_, { slots }) => {
    const overrides = useUiTheme("Example", {
      background: "#ffffff",
      borderColor: "#d0d5dd",
      padding: { small: "0.75rem", medium: "1rem", large: "1.25rem" },
    });
    const { t } = createComponentI18n({
      messages: exampleMessages,
      libraryId: "noob-naive-ui:ui",
      componentId: "Example",
    });

    return () => (
      <div class="example" style={overrides.value as CSSProperties}>
        {slots.default ? (
          slots.default()
        ) : (
          <>
            <div>
              <NH3>{t("title")}</NH3>
            </div>
            <div data->
              <NP>{t("description")}</NP>
            </div>
          </>
        )}
      </div>
    );
  },
  {
    name: "ExampleComponentRoot",
  },
);

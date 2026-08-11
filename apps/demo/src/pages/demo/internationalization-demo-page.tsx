import { useAdminProvider } from "@noob-naive-ui/admin";
import { PrototypeCard } from "@noob-naive-ui/prototype-i18n-verification";
import { NH1, NP } from "naive-ui";
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

/**
 * Renders the routed i18n demonstration with the localized prototype card and
 * locale-state diagnostics.
 *
 * Text-bearing content container: Typography's own margins supply the vertical
 * rhythm between the heading, paragraph, and the prototype card, so a plain
 * `<div>` (rather than an NFlex with a component-size gap) avoids
 * double-spacing. The locale data attributes stay on the container for the
 * verification harness.
 */
export const InternationalizationDemoPage = defineComponent(
  /**
   * Composes the internationalization route with the prototype verification card.
   *
   * @returns A render function exposing the preference/global locale data attributes.
   */
  () => {
    /** Reads the host preference locale for the verification harness. */
    const provider = useAdminProvider();
    /** Reads the demo's single global Composer locale and text. */
    const { locale: globalLocale, t } = useI18n({ useScope: "global" });

    return () => (
      <div
        class="p-6"
        data-demo-preference-locale={provider.locale.value}
        data-demo-global-locale={globalLocale.value}>
        <NH1>{t("pages.internationalization.title")}</NH1>
        <NP>{t("pages.internationalization.description")}</NP>
        <PrototypeCard />
      </div>
    );
  },
  { name: "InternationalizationDemoPage" },
);

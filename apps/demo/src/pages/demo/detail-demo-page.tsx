import { NH1, NP } from "naive-ui";
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

/**
 * Renders the non-menu detail route reached through an application-owned button.
 *
 * Text-only content container: Typography's own margins supply the vertical
 * rhythm between the heading and paragraph, so a plain `<div>` (rather than an
 * NFlex with a component-size gap) avoids double-spacing.
 */
export const DetailDemoPage = defineComponent(
  /**
   * Creates detail content from the explicit report route prop.
   *
   * @param props - Contains the report identity projected from the URL path parameter.
   * @returns The report detail page render function.
   */
  (props: { reportId: string }) => {
    /** Reads the demo's single global Composer for page text. */
    const { t } = useI18n({ useScope: "global" });

    return () => (
      <div class="p-6">
        <NH1>{t("pages.detail.title", { id: props.reportId })}</NH1>
        <NP>{t("pages.detail.description", { id: props.reportId })}</NP>
      </div>
    );
  },
  {
    name: "DetailDemoPage",
    props: {
      reportId: { type: String, required: true },
    },
  },
);

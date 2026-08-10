import { NH1, NP } from "naive-ui";
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

/**
 * Renders the non-closable dashboard home page.
 *
 * Text-only content container: Typography's own margins supply the vertical
 * rhythm between the heading and paragraph, so a plain `<div>` (rather than an
 * NFlex with a component-size gap) avoids double-spacing.
 */
export const DashboardDemoPage = defineComponent(
  /** @returns The dashboard page render function. */
  () => {
    /** Reads the demo's single global Composer for page text. */
    const { t } = useI18n({ useScope: "global" });

    return () => (
      <div class="p-6">
        <NH1>{t("pages.dashboard.title")}</NH1>
        <NP>{t("pages.dashboard.description")}</NP>
      </div>
    );
  },
  { name: "DashboardDemoPage" },
);

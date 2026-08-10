import { useAdminShell } from "@noob-naive-ui/admin";
import { NButton, NH1, NP } from "naive-ui";
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

/**
 * Renders the reports page with an application-owned detail navigation trigger.
 *
 * Text-bearing content container: Typography's own margins supply the vertical
 * rhythm between the heading, paragraph, and the action button, so a plain
 * `<div>` (rather than an NFlex with a component-size gap) avoids
 * double-spacing.
 */
export const ReportsDemoPage = defineComponent(
  /** @returns The reports page render function. */
  () => {
    /** Retains the nearest shell's descendant navigation control. */
    const { navigate } = useAdminShell();
    /** Reads the demo's single global Composer for page text. */
    const { t } = useI18n({ useScope: "global" });

    /** Opens a new detail page instance even when the destination is already open. */
    function openDetail(): void {
      const randomYear = Math.round(Math.random() * 40 + 2000);
      navigate(
        { navKey: "detail", payload: { reportId: `quarterly-${randomYear}` } },
        () => ({ kind: "open" }),
      ).catch((error: unknown) => {
        console.error("Navigation failed:", error);
      });
    }

    return () => (
      <div class="p-6">
        <NH1>{t("pages.reports.title")}</NH1>
        <NP>{t("pages.reports.description")}</NP>
        <NButton type="primary" onClick={() => openDetail()}>
          {t("pages.reports.openDetail")}
        </NButton>
      </div>
    );
  },
  { name: "ReportsDemoPage" },
);

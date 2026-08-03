import { useAdminShell } from "@noob-naive-ui/admin";
import { NButton } from "naive-ui";
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

/** Renders the reports page with an application-owned detail navigation trigger. */
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
      <main class="p-6">
        <h1 class="m-0 text-2xl font-semibold">{t("pages.reports.title")}</h1>
        <p class="mt-3 max-w-2xl text-base leading-6">
          {t("pages.reports.description")}
        </p>
        <NButton type="primary" onClick={() => openDetail()}>
          {t("pages.reports.openDetail")}
        </NButton>
      </main>
    );
  },
  { name: "ReportsDemoPage" },
);

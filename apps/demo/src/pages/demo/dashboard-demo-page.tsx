import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

/** Renders the non-closable dashboard home page. */
export const DashboardDemoPage = defineComponent(
  /** @returns The dashboard page render function. */
  () => {
    /** Reads the demo's single global Composer for page text. */
    const { t } = useI18n({ useScope: "global" });

    return () => (
      <main class="p-6">
        <h1 class="m-0 text-2xl font-semibold">{t("pages.dashboard.title")}</h1>
        <p class="mt-3 max-w-2xl text-base leading-6">
          {t("pages.dashboard.description")}
        </p>
      </main>
    );
  },
  { name: "DashboardDemoPage" },
);

import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

/** Renders the non-menu detail route reached through an application-owned button. */
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
      <main class="p-6">
        <h1 class="m-0 text-2xl font-semibold">
          {t("pages.detail.title", { id: props.reportId })}
        </h1>
        <p class="mt-3 max-w-2xl text-base leading-6">
          {t("pages.detail.description", { id: props.reportId })}
        </p>
      </main>
    );
  },
  {
    name: "DetailDemoPage",
    props: {
      reportId: { type: String, required: true },
    },
  },
);

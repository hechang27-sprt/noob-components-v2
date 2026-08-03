import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

/** Renders the persisted frontend-preferences demonstration page. */
export const SettingsDemoPage = defineComponent(
  /** @returns The settings page render function. */
  () => {
    /** Reads the demo's single global Composer for page text. */
    const { t } = useI18n({ useScope: "global" });

    return () => (
      <main class="p-6">
        <h1 class="m-0 text-2xl font-semibold">{t("pages.settings.title")}</h1>
        <p class="mt-3 max-w-2xl text-base leading-6">
          {t("pages.settings.description")}
        </p>
      </main>
    );
  },
  { name: "SettingsDemoPage" },
);

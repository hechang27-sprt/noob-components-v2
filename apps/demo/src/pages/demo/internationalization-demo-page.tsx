import { useAdminShellPreferencesStore } from "@noob-naive-ui/admin";
import { PrototypeCard } from "@noob-naive-ui/prototype-i18n-verification";
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

/**
 * Renders the routed i18n demonstration with the localized prototype card and
 * locale-state diagnostics.
 */
export const InternationalizationDemoPage = defineComponent(
  /**
   * Composes the internationalization route with the prototype verification card.
   *
   * @returns A render function exposing the preference/global locale data attributes.
   */
  () => {
    /** Reads the host preference locale for the verification harness. */
    const preferences = useAdminShellPreferencesStore();
    /** Reads the demo's single global Composer locale for the harness. */
    const { locale: globalLocale } = useI18n({ useScope: "global" });

    return () => (
      <main
        class="p-6"
        data-demo-preference-locale={preferences.locale}
        data-demo-global-locale={globalLocale.value}>
        <h1 class="m-0 text-2xl font-semibold">Internationalization</h1>
        <p class="mt-3 max-w-2xl text-base leading-6">
          This routed page demonstrates the host preference-to-Composer locale
          synchronization and the prototype i18n verification card.
        </p>
        <PrototypeCard />
      </main>
    );
  },
  { name: "InternationalizationDemoPage" },
);

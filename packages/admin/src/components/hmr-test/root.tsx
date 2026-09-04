import { defineComponent } from "vue";
import { NH3, NP } from "naive-ui";
import { createComponentI18n } from "@noob-naive-ui/i18n";
import hmrTestMessages from "../../locales/HMRTest.json";

export const HMR_TEST_TAG = "admin:base" as const;

type Slots = {
  default?: () => unknown;
};

export const HMRTest = defineComponent(
  (_, { slots }: { slots: Slots }) => {
    const { t } = createComponentI18n({
      messages: hmrTestMessages,
      libraryId: "noob-naive-ui:admin",
      componentId: "HMRTest",
    });

    return () => (
      <div
        data-hmr-test="admin"
        class="rounded-lg border border-gray-200 p-4 bg-lime-100">
        <NH3>{t("title")}</NH3>
        <NP>
          status: <span data-hmr-status>{t("status")}</span>
        </NP>
        <NP>
          source tag: <span data-hmr-tag>{HMR_TEST_TAG}</span>
        </NP>
        {slots.default?.()}
      </div>
    );
  },
  {
    name: "AdminHMRTest",
  },
);

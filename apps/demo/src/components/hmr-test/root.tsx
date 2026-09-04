import { defineComponent } from "vue";
import { NH3, NP } from "naive-ui";
import { i18n } from "../../i18n";

export const HMR_TEST_TAG = "demo:base" as const;

type Slots = {
  default?: () => unknown;
};
export const DemoHMRTest = defineComponent(
  (_, { slots }: { slots: Slots }) => {
    return () => (
      <div
        data-hmr-test="demo"
        class="rounded-lg border border-gray-200 p-4 bg-emerald-100">
        <NH3>{i18n.global.t("hmrTest.title")}</NH3>
        <NP>
          status: <span data-hmr-status>{i18n.global.t("hmrTest.status")}</span>
        </NP>
        <NP>
          source tag: <span data-hmr-tag>{HMR_TEST_TAG}</span>
        </NP>
        {slots.default?.()}
      </div>
    );
  },
  {
    name: "DemoHMRTest",
  },
);

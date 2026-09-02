import { defineComponent } from "vue";
import { NButton, NFlex, NH3, NP } from "naive-ui";
import { i18n } from "../../i18n";

export const HMR_TEST_TAG = "demo:base" as const;

export const DemoHMRTest = defineComponent(
  (props) => {
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
        <NFlex justify="space-between">
          <NFlex vertical>
            <NButton size="small" onClick={() => void props.applySource?.()}>
              Edit source
            </NButton>
            <NButton size="small" onClick={() => void props.restoreSource?.()}>
              Restore source
            </NButton>
          </NFlex>
          <NFlex vertical>
            <NButton size="small" onClick={() => void props.applyLocale?.()}>
              Edit locale
            </NButton>
            <NButton size="small" onClick={() => void props.restoreLocale?.()}>
              Restore locale
            </NButton>
          </NFlex>
        </NFlex>
      </div>
    );
  },
  {
    name: "DemoHMRTest",
    props: {
      applySource: { type: Function, default: undefined },
      restoreSource: { type: Function, default: undefined },
      applyLocale: { type: Function, default: undefined },
      restoreLocale: { type: Function, default: undefined },
    },
  },
);

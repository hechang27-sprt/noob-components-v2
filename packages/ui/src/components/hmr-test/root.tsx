import { defineComponent } from "vue";
import { NButton, NFlex, NH3, NP } from "naive-ui";
import { createComponentI18n } from "@noob-naive-ui/i18n";
import hmrTestMessages from "../../locales/HMRTest.json";

/**
 * Ui-package HMR showcase card. Buttons call the optional
 * host-provided handlers (ui: apply/restore source + locale), wired by
 * the demo page to the `virtual:noob-hmr-patch` client (default import).
 */
export const HMR_TEST_TAG = "ui:base" as const;

/** The component's locale resource file stem (registry slice key). */
export const COMPONENT_ID = "HMRTest" as const;

export const HMRTest = defineComponent(
  (props) => {
    const { t } = createComponentI18n({
      messages: hmrTestMessages,
      libraryId: "noob-naive-ui:ui",
      componentId: "HMRTest",
    });

    return () => (
      <div
        data-hmr-test="ui"
        class="rounded-lg border border-gray-200 p-4 bg-amber-100">
        <NH3>{t("title")}</NH3>
        <NP>
          status: <span data-hmr-status>{t("status")}</span>
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
    name: "UiHMRTest",
    props: {
      applySource: { type: Function, default: undefined },
      restoreSource: { type: Function, default: undefined },
      applyLocale: { type: Function, default: undefined },
      restoreLocale: { type: Function, default: undefined },
    },
  },
);

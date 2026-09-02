import { defineComponent } from "vue";
import { NButton } from "naive-ui";
import { createComponentI18n } from "@noob-naive-ui/i18n";
import hmrTestMessages from "../../locales/HMRTest.json";


/**
 * Ui-package HMR showcase card. Buttons call the optional
 * host-provided handlers (ui: apply/restore source + locale), wired by
 * the demo page to the `virtual:noob-hmr-patch` client.
 */
/** Display binding patched in-memory together with the locale JSON. */
export const HMR_TEST_STATUS = "base" as const;

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
        <h3 class="font-bold">{t("title")}</h3>
        <p>
          status: <span data-hmr-status>{HMR_TEST_STATUS}</span>
        </p>
        <p>
          source tag: <span data-hmr-tag>{HMR_TEST_TAG}</span>
        </p>
        <div class="mt-2 flex flex-wrap gap-2">
          <NButton size="small" onClick={() => void props.applySource?.()}>
            Edit source
          </NButton>
          <NButton size="small" onClick={() => void props.restoreSource?.()}>
            Restore source
          </NButton>
          <NButton size="small" onClick={() => void props.applyLocale?.()}>
            Edit locale
          </NButton>
          <NButton size="small" onClick={() => void props.restoreLocale?.()}>
            Restore locale
          </NButton>
        </div>
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

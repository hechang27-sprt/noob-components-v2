import { defineComponent } from "vue";
import { HMRTest as UiHMRTest, HMRController } from "@noob-naive-ui/ui";
import { HMRTest as AdminHMRTest } from "@noob-naive-ui/admin";
import { HMR_ENDPOINT, PatchId } from "virtual:noob-hmr-patch";

import { DemoHMRTest } from "../../components/hmr-test";
import { i18n } from "../../i18n";
import { NH1 } from "naive-ui";
import { I18nText } from "@noob-naive-ui/i18n";

/**
 * HMR showcase page. Each card renders one package-owned HMRTest component;
 * the buttons toggle in-memory patches (via the `virtual:noob-hmr-patch`
 * client, which wraps the dev-server endpoint) on that component's own
 * source file and locale JSON. Vite must hot-update — code, tailwind
 * classes, and locale resources — without a full reload.
 */
export const HmrTestPage = defineComponent(
  () => {
    const t = i18n.global.t;
    const labels = [
      { kind: "i18n", key: "hmrTest.sourceFile" },
      { kind: "i18n", key: "hmrTest.i18nFile" },
    ] satisfies I18nText[];

    return () => (
      <div class="p-6 space-y-4">
        <NH1>{t("hmrTest.pageTitle")}</NH1>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <UiHMRTest>
            <HMRController
              endpoint={HMR_ENDPOINT}
              patchIds={["uiSource", "uiLocale"] satisfies PatchId[]}
              labels={labels}
            />
          </UiHMRTest>
          <AdminHMRTest>
            <HMRController
              endpoint={HMR_ENDPOINT}
              patchIds={["adminSource", "adminLocale"] satisfies PatchId[]}
              labels={labels}
            />
          </AdminHMRTest>
          <DemoHMRTest>
            <HMRController
              endpoint={HMR_ENDPOINT}
              patchIds={["demoSource", "demoLocale"] satisfies PatchId[]}
              labels={labels}
            />
          </DemoHMRTest>
        </div>
      </div>
    );
  },
  { name: "HmrTestPage" },
);

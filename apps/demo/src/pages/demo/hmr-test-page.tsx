import { defineComponent } from "vue";
import { HMRTest as UiHMRTest } from "@noob-naive-ui/ui";
import { HMRTest as AdminHMRTest } from "@noob-naive-ui/admin";
import { client } from "virtual:noob-hmr-patch";

import { DemoHMRTest } from "../../components/hmr-test";
import { i18n } from "../../i18n";
import { NH1 } from "naive-ui";

/**
 * HMR showcase page. Each card renders one package-owned HMRTest component;
 * the buttons toggle in-memory patches (via the `virtual:noob-hmr-patch`
 * client, which wraps the dev-server endpoint) on that component's own
 * source file and locale JSON. Vite must hot-update — code, tailwind
 * classes, and locale resources — without a full reload.
 */
export const HmrTestPage = defineComponent(
  () => () => (
    <div class="p-6 space-y-4">
      <NH1>{i18n.global.t("hmrTest.pageTitle")}</NH1>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <UiHMRTest
          applySource={() => void client.runPatch("uiSource", "apply")}
          restoreSource={() => void client.runPatch("uiSource", "restore")}
          applyLocale={() => void client.runPatch("uiLocale", "apply")}
          restoreLocale={() => void client.runPatch("uiLocale", "restore")}
        />
        <AdminHMRTest
          applySource={() => void client.runPatch("adminSource", "apply")}
          restoreSource={() => void client.runPatch("adminSource", "restore")}
          applyLocale={() => void client.runPatch("adminLocale", "apply")}
          restoreLocale={() => void client.runPatch("adminLocale", "restore")}
        />
        <DemoHMRTest
          applySource={() => void client.runPatch("demoSource", "apply")}
          restoreSource={() => void client.runPatch("demoSource", "restore")}
          applyLocale={() => void client.runPatch("demoLocale", "apply")}
          restoreLocale={() => void client.runPatch("demoLocale", "restore")}
        />
      </div>
    </div>
  ),
  { name: "HmrTestPage" },
);

import { defineComponent } from "vue";
import { HMRTest as UiHMRTest } from "@noob-naive-ui/ui";
import { HMRTest as AdminHMRTest } from "@noob-naive-ui/admin";
import { DemoHMRTest } from "../../components/hmr-test";
import { i18n } from "../../i18n";

/**
 * HMR showcase page. Each card renders one package-owned HMRTest component;
 * the buttons rewrite that component's own source file and locale JSON
 * through the demo dev server (`POST /__hmr-test`), which must hot-update
 * without a full reload.
 */
export const HmrTestPage = defineComponent(
  () => () => (
    <div class="p-6 space-y-4">
      <h1 class="text-lg font-bold">{i18n.global.t("hmrTest.pageTitle")}</h1>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <UiHMRTest />
        <AdminHMRTest />
        <DemoHMRTest />
      </div>
    </div>
  ),
  { name: "HmrTestPage" },
);

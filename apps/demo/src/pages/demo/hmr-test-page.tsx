import { defineComponent } from "vue";
import { HMRTest as UiHMRTest } from "@noob-naive-ui/ui";
import { HMRTest as AdminHMRTest } from "@noob-naive-ui/admin";
import {
  applyUiSource,
  restoreUiSource,
  applyUiLocale,
  restoreUiLocale,
  applyAdminSource,
  restoreAdminSource,
  applyAdminLocale,
  restoreAdminLocale,
  applyDemoSource,
  restoreDemoSource,
  applyDemoLocale,
  restoreDemoLocale,
} from "virtual:noob-hmr-patch";

import { DemoHMRTest } from "../../components/hmr-test";
import { i18n } from "../../i18n";

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
      <h1 class="text-lg font-bold">{i18n.global.t("hmrTest.pageTitle")}</h1>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <UiHMRTest
          applySource={applyUiSource}
          restoreSource={restoreUiSource}
          applyLocale={applyUiLocale}
          restoreLocale={restoreUiLocale}
        />
        <AdminHMRTest
          applySource={applyAdminSource}
          restoreSource={restoreAdminSource}
          applyLocale={applyAdminLocale}
          restoreLocale={restoreAdminLocale}
        />
        <DemoHMRTest
          applySource={applyDemoSource}
          restoreSource={restoreDemoSource}
          applyLocale={applyDemoLocale}
          restoreLocale={restoreDemoLocale}
        />
      </div>
    </div>
  ),
  { name: "HmrTestPage" },
);

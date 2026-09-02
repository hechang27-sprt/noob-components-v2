import { defineComponent } from "vue";
import { NButton } from "naive-ui";
import { i18n } from "../../i18n";

export const HMR_TEST_TAG = "demo:base" as const;

/**
 * Demo-host counterpart of the HMR showcase (see ui/hmr-test). The demo is
 * the host: its messages live in the app-level demo.json and render through
 * the global Composer.
 */
export const DemoHMRTest = defineComponent(
  () => {
    async function post(slot: "source" | "locale", action: "edit" | "restore") {
      await fetch("/__hmr-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pkg: "demo", slot, action }),
      });
    }

    return () => (
      <div
        data-hmr-test="demo"
        class="rounded-lg border border-gray-200 p-4 bg-emerald-100">
        <h3 class="font-bold">{i18n.global.t("hmrTest.title")}</h3>
        <p>
          status: <span data-hmr-status>{i18n.global.t("hmrTest.status")}</span>
        </p>
        <p>
          source tag: <span data-hmr-tag>{HMR_TEST_TAG}</span>
        </p>
        <div class="mt-2 flex flex-wrap gap-2">
          <NButton size="small" onClick={() => void post("source", "edit")}>
            Edit source
          </NButton>
          <NButton size="small" onClick={() => void post("source", "restore")}>
            Restore source
          </NButton>
          <NButton size="small" onClick={() => void post("locale", "edit")}>
            Edit locale
          </NButton>
          <NButton size="small" onClick={() => void post("locale", "restore")}>
            Restore locale
          </NButton>
        </div>
      </div>
    );
  },
  { name: "DemoHMRTest" },
);

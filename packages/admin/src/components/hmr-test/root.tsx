import { defineComponent } from "vue";
import { NButton } from "naive-ui";
import { createComponentI18n } from "@noob-naive-ui/i18n";
import hmrTestMessages from "../../locales/HMRTest.json";

export const HMR_TEST_TAG = "admin:base" as const;

/**
 * Admin-package counterpart of the demo HMR showcase (see ui/hmr-test).
 * `POST /__hmr-test` with pkg `admin` rewrites this file or its locale
 * resource on the dev server.
 */
export const HMRTest = defineComponent(
  () => {
    const { t } = createComponentI18n({
      messages: hmrTestMessages,
      libraryId: "noob-naive-ui:admin",
      componentId: "HMRTest",
    });

    async function post(slot: "source" | "locale", action: "edit" | "restore") {
      await fetch("/__hmr-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pkg: "admin", slot, action }),
      });
    }

    return () => (
      <div
        data-hmr-test="admin"
        class="rounded-lg border border-gray-200 p-4 bg-lime-100">
        <h3 class="font-bold">{t("title")}</h3>
        <p>
          status: <span data-hmr-status>{t("status")}</span>
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
  { name: "AdminHMRTest" },
);

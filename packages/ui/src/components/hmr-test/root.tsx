import { defineComponent } from "vue";
import { NButton } from "naive-ui";
import { createComponentI18n } from "@noob-naive-ui/i18n";
import hmrTestMessages from "../../locales/HMRTest.json";

/** Tag rendered from module scope — a source edit must hot-swap this value. */
export const HMR_TEST_TAG = "ui:base" as const;

/** The component's locale resource file stem (registry slice key). */
export const COMPONENT_ID = "HMRTest" as const;

/**
 * Dev showcase component: proves workspace-source HMR. The buttons ask the
 * demo dev server (`POST /__hmr-test`, demo-only middleware) to rewrite this
 * file (tag + tailwind class) or its locale resource; Vite then hot-updates
 * the module. If HMR degrades to a full reload, the e2e's shell-state
 * assertions fail.
 */
export const HMRTest = defineComponent(
  () => {
    const { t } = createComponentI18n({
      messages: hmrTestMessages,
      libraryId: "noob-naive-ui:ui",
      componentId: "HMRTest",
    });

    async function post(slot: "source" | "locale", action: "edit" | "restore") {
      await fetch("/__hmr-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pkg: "ui", slot, action }),
      });
    }

    return () => (
      <div
        data-hmr-test="ui"
        class="rounded-lg border border-gray-200 p-4 bg-amber-100">
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
  { name: "UiHMRTest" },
);

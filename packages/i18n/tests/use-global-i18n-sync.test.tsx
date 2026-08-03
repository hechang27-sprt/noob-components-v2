// @vitest-environment happy-dom

import { createApp, defineComponent, ref, type App, type Ref } from "vue";
import { createI18n } from "vue-i18n";
import { afterEach, describe, expect, it } from "vitest";

import { useGlobalI18nSync } from "../src/use-global-i18n-sync";

/** Retains mounted test applications so each test releases Vue resources. */
const mountedApps: App[] = [];

/** Unmounts test applications and clears the synthetic document after each test. */
afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

/**
 * Mounts a component that syncs the given locale source into the host global
 * Composer. Returns the host global Composer to assert against.
 */
const mountSyncHarness = (
  source: Ref<string>,
  options?: { immediate?: boolean },
) => {
  const SyncProbe = defineComponent(() => {
    useGlobalI18nSync(source, options);
    return () => null;
  });
  const i18n = createI18n({
    legacy: false,
    locale: "en",
    fallbackLocale: "en",
    messages: {},
  });
  const app = createApp(SyncProbe);
  app.use(i18n);
  app.mount(document.createElement("div"));
  mountedApps.push(app);
  return i18n;
};

describe("useGlobalI18nSync", () => {
  it("pushes the source value into the global Composer immediately by default", () => {
    const source = ref("zh-CN");
    const i18n = mountSyncHarness(source);
    expect(i18n.global.locale.value).toBe("zh-CN");
  });

  it("propagates later source changes one way", async () => {
    const source = ref("en");
    const i18n = mountSyncHarness(source);
    source.value = "zh-CN";
    await Promise.resolve();
    expect(i18n.global.locale.value).toBe("zh-CN");
  });

  it("defers the initial write when immediate is false", () => {
    const source = ref("zh-CN");
    const i18n = mountSyncHarness(source, { immediate: false });
    expect(i18n.global.locale.value).toBe("en");
    source.value = "en";
    expect(i18n.global.locale.value).toBe("en");
  });
});

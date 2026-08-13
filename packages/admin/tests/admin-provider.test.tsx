// @vitest-environment happy-dom

import { createPinia, setActivePinia, type Pinia } from "pinia";
import {
  createApp,
  defineComponent,
  inject,
  nextTick,
  ref,
  type App,
} from "vue";
import { afterEach, describe, expect, it } from "vitest";
import { createI18n, type I18n } from "vue-i18n";

import {
  AdminProvider,
  type AdminProviderProps,
} from "../src/components/admin-provider";
import {
  libraryI18nOverridesKey,
  type LibraryI18nOverridesRegistry,
} from "@noob-naive-ui/i18n";
import { type AdminI18nSnapshot } from "../src/i18n/plugin";
import { useAdminShellMenuStore } from "../src/stores/menu";
import { useAdminShellPreferencesStore } from "../src/stores/shell-preferences";

/** Retains mounted apps until cleanup prevents DOM and Pinia state leakage. */
const mountedApps: App[] = [];

/** Unmounts every mounted application and clears the synthetic document. */
afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

/** Base per-locale messages seeded into the global Composer. */
const baseMessages = {
  en: { nav: { demo: "Demo" } },
  "zh-CN": { nav: { demo: "演示" } },
};

/** Menu options configured into the menu store via the `menu` prop. */
const menu = [{ key: "demo", label: () => "Demo" }];

/** Host shell-preferences store options passed via the `preferences` prop. */
const preferences = {
  defaults: { availableLocales: [{ key: "en", label: "English" }] },
  fallbackLocale: "en",
};

/**
 * Mounts AdminProvider under a real Pinia and a real global vue-i18n Composer,
 * re-rendering the provider from `renderProps` on every Vue tick so reactive
 * prop changes (e.g. a changed `messages` ref) propagate.
 */
function mountProvider(
  pinia: Pinia,
  i18n: I18n,
  renderProps: () => Partial<AdminProviderProps>,
): HTMLElement {
  const target = document.createElement("div");
  document.body.append(target);
  const app = createApp({
    setup: () => () => {
      const props = renderProps();
      return (
        <AdminProvider
          messages={props.messages ?? {}}
          menu={props.menu ?? []}
          storeOptions={props.storeOptions}
          theme={props.theme}>
          <div data-slot="child" />
        </AdminProvider>
      );
    },
  });
  app.use(pinia);
  app.use(i18n);
  app.mount(target);
  mountedApps.push(app);
  return target;
}

describe("AdminProvider", () => {
  it("seeds the host global Composer with per-locale messages on mount", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const i18n = createI18n({
      legacy: false,
      locale: "en",
      fallbackLocale: "en",
      messages: {},
    });

    mountProvider(pinia, i18n, () => ({
      messages: baseMessages,
      menu,
      storeOptions: preferences,
    }));

    expect(i18n.global.t("nav.demo")).toBe("Demo");
  });

  it("re-seeds the global Composer when the messages prop changes", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const i18n = createI18n({
      legacy: false,
      locale: "en",
      fallbackLocale: "en",
      messages: {},
    });
    const messages = ref<Record<string, Record<string, unknown>>>({
      ...baseMessages,
    });

    mountProvider(pinia, i18n, () => ({
      messages: messages.value,
      menu,
      storeOptions: preferences,
    }));
    expect(i18n.global.t("nav.demo")).toBe("Demo");

    messages.value = {
      en: { nav: { demo: "Demo v2" } },
      "zh-CN": { nav: { demo: "演示v2" } },
    };
    await nextTick();

    expect(i18n.global.t("nav.demo")).toBe("Demo v2");
  });

  it("initializes the preferences store from the preferences prop", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const i18n = createI18n({
      legacy: false,
      locale: "en",
      fallbackLocale: "en",
      messages: {},
    });

    mountProvider(pinia, i18n, () => ({
      messages: baseMessages,
      menu,
      storeOptions: preferences,
    }));

    const store = useAdminShellPreferencesStore(pinia);
    expect(store.runtime.isHydrated).toBe(true);
    expect(store.preferences.availableLocales).toEqual([
      { key: "en", label: "English" },
    ]);
  });

  it("configures the menu store from the menu prop", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const i18n = createI18n({
      legacy: false,
      locale: "en",
      fallbackLocale: "en",
      messages: {},
    });

    mountProvider(pinia, i18n, () => ({
      messages: baseMessages,
      menu,
      storeOptions: preferences,
    }));

    const store = useAdminShellMenuStore(pinia);
    expect(store.options).toEqual(menu);
  });

  it("renders an NConfigProvider wrapping the default slot", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const i18n = createI18n({
      legacy: false,
      locale: "en",
      fallbackLocale: "en",
      messages: {},
    });

    const container = mountProvider(pinia, i18n, () => ({
      messages: baseMessages,
      menu,
      storeOptions: preferences,
    }));

    expect(container.querySelector(".n-config-provider")).not.toBeNull();
    expect(container.querySelector('[data-slot="child"]')).not.toBeNull();
  });

  it("provides the admin text-override snapshot to descendants via the overrides key", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const i18n = createI18n({
      legacy: false,
      locale: "en",
      fallbackLocale: "en",
      messages: {},
    });
    const overrides: LibraryI18nOverridesRegistry = {
      "noob-naive-ui:admin": {
        en: { AdminShell: { account: { signOut: "Log out" } } },
      },
    };
    const OverrideProbe = defineComponent({
      name: "OverrideProbe",
      setup() {
        const snapshot = inject(libraryI18nOverridesKey, {})[
          "noob-naive-ui:admin"
        ] as AdminI18nSnapshot | undefined;
        const signOut = snapshot?.en?.AdminShell?.account?.signOut ?? "";
        return () => <div data-probe={signOut} />;
      },
    });
    const target = document.createElement("div");
    document.body.append(target);
    const app = createApp({
      setup: () => () => (
        <AdminProvider
          messages={baseMessages}
          menu={menu}
          storeOptions={preferences}
          overrides={overrides}>
          <OverrideProbe />
        </AdminProvider>
      ),
    });
    app.use(pinia);
    app.use(i18n);
    app.mount(target);
    mountedApps.push(app);
    expect(
      target.querySelector("[data-probe]")?.getAttribute("data-probe"),
    ).toBe("Log out");
  });
});

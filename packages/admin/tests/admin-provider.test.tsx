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
  libraryOverridesKey,
  type LibraryI18nOverridesRegistry,
  type LibraryOverridesRegistry,
} from "@noob-naive-ui/i18n";
import {
  AdminConfigProvider,
  type AdminConfigProviderProps,
} from "../src/components/admin-config-provider";
import { type AdminI18nSnapshot } from "../src/i18n/plugin";
import { useAdminShellMenuStore } from "../src/stores/menu";
import { useAdminShellPreferencesStore } from "../src/stores/shell-preferences";
import type { AdminThemePreset } from "../src/runtime-contract";

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
          themes={props.themes}
          defaultTheme={props.defaultTheme}
          defaultDarkTheme={props.defaultDarkTheme}>
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

  it("configures the theme presets and polarity defaults from props", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const i18n = createI18n({
      legacy: false,
      locale: "en",
      fallbackLocale: "en",
      messages: {},
    });
    const themes: AdminThemePreset[] = [
      {
        key: "default",
        label: { kind: "string", value: "Default" },
        themeOverrides: { "naive-ui": { common: { primaryColor: "#18a058" } } },
        isDark: false,
      },
      {
        key: "midnight",
        label: { kind: "string", value: "Midnight" },
        themeOverrides: { "naive-ui": { common: { primaryColor: "#6366f1" } } },
        isDark: true,
      },
    ];

    mountProvider(pinia, i18n, () => ({
      messages: baseMessages,
      menu,
      storeOptions: preferences,
      themes,
      defaultTheme: "default",
      defaultDarkTheme: "midnight",
    }));

    const store = useAdminShellPreferencesStore(pinia);
    expect(store.runtime.themes).toEqual(themes);
    expect(store.runtime.defaultTheme).toBe("default");
    expect(store.runtime.defaultDarkTheme).toBe("midnight");
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
    const i18nOverrides: LibraryI18nOverridesRegistry = {
      "noob-naive-ui:admin": {
        en: { AdminShell: { account: { signOut: "Log out" } } },
      },
    };
    const OverrideProbe = defineComponent({
      name: "OverrideProbe",
      setup() {
        const registry = inject(libraryOverridesKey, null);
        const snapshot = registry?.value?.["noob-naive-ui:admin"]
          ?.i18n as AdminI18nSnapshot | undefined;
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
          i18nOverrides={i18nOverrides}>
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

  it("merges a preset ui theme entry + admin i18n into the registry seen by descendants", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const i18n = createI18n({
      legacy: false,
      locale: "en",
      fallbackLocale: "en",
      messages: {},
    });
    const themes: AdminThemePreset[] = [
      {
        key: "default",
        label: { kind: "string", value: "Default" },
        themeOverrides: {
          "naive-ui": { common: { primaryColor: "#18a058" } },
          "noob-naive-ui:ui": {
            Card: { "--ui-card-bg": "#0f172a" },
          },
        },
        isDark: false,
      },
    ];
    const RegistryProbe = defineComponent({
      name: "RegistryProbe",
      setup() {
        const registry = inject(libraryOverridesKey, null);
        const value = registry?.value;
        const admin = value?.["noob-naive-ui:admin"];
        const uiEntry = value?.["noob-naive-ui:ui"];
        // Registry values are loose (unknown) at the provider boundary; narrow
        // the ui theme entry to the known Card var shape for the assertion.
        const uiTheme = uiEntry?.theme as
          | { Card?: { "--ui-card-bg"?: string } }
          | undefined;
        return () => (
          <div
            data-admin-has-i18n={admin?.i18n !== undefined}
            data-ui-bg={uiTheme?.Card?.["--ui-card-bg"] ?? ""}
          />
        );
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
          themes={themes}
          defaultTheme="default"
          i18nOverrides={{
            "noob-naive-ui:admin": {
              en: { AdminShell: { account: { signOut: "Log out" } } },
            },
          }}>
          <RegistryProbe />
        </AdminProvider>
      ),
    });
    app.use(pinia);
    app.use(i18n);
    app.mount(target);
    mountedApps.push(app);
    expect(
      target.querySelector("[data-admin-has-i18n]")?.getAttribute(
        "data-admin-has-i18n",
      ),
    ).toBe("true");
    expect(
      target.querySelector("[data-ui-bg]")?.getAttribute("data-ui-bg"),
    ).toBe("#0f172a");
  });

  it("provides only its own slice when AdminConfigProvider is used standalone", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const i18n = createI18n({
      legacy: false,
      locale: "en",
      fallbackLocale: "en",
      messages: {},
    });
    const props: AdminConfigProviderProps = {
      i18n: { en: { AdminShell: { account: { signOut: "Standalone out" } } } },
    };
    const StandaloneProbe = defineComponent({
      name: "StandaloneProbe",
      setup() {
        const registry = inject(libraryOverridesKey, null);
        const value: LibraryOverridesRegistry = registry?.value ?? {};
        return () => (
          <div data-keys={Object.keys(value).join(",")} />
        );
      },
    });
    const target = document.createElement("div");
    document.body.append(target);
    const app = createApp({
      setup: () => () => (
        <AdminConfigProvider {...props}>
          <StandaloneProbe />
        </AdminConfigProvider>
      ),
    });
    app.use(pinia);
    app.use(i18n);
    app.mount(target);
    mountedApps.push(app);
    expect(
      target.querySelector("[data-keys]")?.getAttribute("data-keys"),
    ).toBe("noob-naive-ui:admin");
  });
});

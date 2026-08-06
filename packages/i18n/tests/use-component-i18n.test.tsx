// @vitest-environment happy-dom

import { createApp, defineComponent, type App, type Component } from "vue";
import { createI18n } from "vue-i18n";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createComponentI18n,
  createLibraryI18nPlugin,
  getComponentI18n,
  type LibraryI18nOverrides,
} from "../src/index";

/**
 * Minimal component-first locale schema for the harness library, shaped
 * like a package's `Locale` factory type parameter.
 */
interface TestComponentMessages {
  greeting: string;
  farewell: string;
}

interface TestLocale {
  Greeter: TestComponentMessages;
}

type TestLocaleName = "en" | "zh-CN";

type TestOverrides = LibraryI18nOverrides<TestLocaleName, TestLocale>;

/** The harness library's plugin descriptor built by the shared factory. */
const testPlugin = createLibraryI18nPlugin<TestLocaleName, TestLocale>({
  libraryId: "test-library",
});

/** Packaged defaults a library component ships with. */
const packagedDefaults: Readonly<Record<TestLocaleName, unknown>> = {
  en: { greeting: "Hello", farewell: "Bye" },
  "zh-CN": { greeting: "你好", farewell: "再见" },
};

/** Renders the composer's outputs into data attributes for assertions. */
const Probe = defineComponent({
  setup() {
    const composer = createComponentI18n({
      messages: packagedDefaults,
      plugin: testPlugin,
      componentId: "Greeter",
    });
    return () => (
      <div
        data-greeting={composer.t("greeting")}
        data-farewell={composer.t("farewell")}
        data-fallback={String(composer.fallbackRoot)}
        data-locale={composer.locale.value}
      />
    );
  },
});

/** Renders a host-authored key resolved through the component Composer. */
const HostKeyProbe = defineComponent({
  setup() {
    const composer = createComponentI18n({
      messages: packagedDefaults,
      plugin: testPlugin,
      componentId: "Greeter",
    });
    return () => <div data-host-key={composer.t("hostOnly.title")} />;
  },
});

/** Consumes the nearest ancestor composer through getComponentI18n. */
const ComposerConsumer = defineComponent({
  setup() {
    const composer = getComponentI18n();
    return () => (
      <div
        data-consumer-greeting={composer.t("greeting")}
        data-consumer-fallback={String(composer.fallbackRoot)}
      />
    );
  },
});

/** Overrides the greeting at the inner provider so the nearest one is provable. */
const innerDefaults: Readonly<Record<TestLocaleName, unknown>> = {
  en: { greeting: "Inner hello", farewell: "Inner bye" },
  "zh-CN": { greeting: "内部你好", farewell: "内部再见" },
};

/** Provides an innermost composer whose messages differ from the outer default. */
const InnerProvider = defineComponent({
  setup() {
    createComponentI18n({
      messages: innerDefaults,
      plugin: testPlugin,
      componentId: "Greeter",
    });
    return () => <ComposerConsumer />;
  },
});

/** Nests two providers so the consumer resolves the innermost composer. */
const NestedProviders = defineComponent({
  setup() {
    createComponentI18n({
      messages: packagedDefaults,
      plugin: testPlugin,
      componentId: "Greeter",
    });
    return () => <InnerProvider />;
  },
});

/** Retains mounted test applications so each test releases Vue resources. */
const mountedApps: App[] = [];

/** Unmounts test applications and clears the synthetic document after each test. */
afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

/**
 * Mounts a component under a host-owned global Composer, optionally installing
 * the factory-built library plugin with override messages.
 *
 * @param component - The root component to mount.
 * @param options - Host locale and optional plugin override tree.
 * @returns The mounted container and the host global Composer.
 */
function mount(
  component: Component,
  options: { locale?: string; overrides?: TestOverrides } = {},
) {
  const target = document.createElement("div");
  document.body.append(target);
  const i18n = createI18n({
    legacy: false,
    locale: options.locale ?? "en",
    fallbackLocale: "en",
    messages: {},
  });
  const app = createApp(component);
  app.use(i18n);
  if (options.overrides) {
    app.use(testPlugin.plugin, { messages: options.overrides });
  }
  app.mount(target);
  mountedApps.push(app);
  return { container: target, i18n };
}

describe("createComponentI18n", () => {
  it("renders packaged defaults when the plugin is not installed", () => {
    const { container } = mount(Probe);
    const el = container.firstElementChild as HTMLElement;
    expect(el.dataset.greeting).toBe("Hello");
    expect(el.dataset.farewell).toBe("Bye");
  });

  it("merges the override slice after defaults: overrides win at the leaf, siblings survive", () => {
    const { container } = mount(Probe, {
      overrides: {
        en: { Greeter: { greeting: "Hello overridden" } },
        "zh-CN": { Greeter: { greeting: "你好覆盖" } },
      },
    });
    const el = container.firstElementChild as HTMLElement;
    expect(el.dataset.greeting).toBe("Hello overridden");
    expect(el.dataset.farewell).toBe("Bye");
  });

  it("keeps fallbackRoot true so host-global keys resolve through the local Composer", () => {
    // Host-global messages are NOT seeded into the package Composer; the
    // root-message fallback must stay enabled for host-authored keys (tab
    // labels) to resolve through getComponentI18n().t.
    const { container } = mount(Probe, {
      overrides: {
        en: { Greeter: { greeting: "Hello overridden" } },
        "zh-CN": { Greeter: { greeting: "你好覆盖" } },
      },
    });
    const el = container.firstElementChild as HTMLElement;
    expect(el.dataset.fallback).toBe("true");
    expect(el.dataset.greeting).toBe("Hello overridden");
  });

  it("resolves a host-authored key absent from the package registry", () => {
    // `hostOnly.title` lives only in the host global Composer; root fallback
    // lets the local package Composer resolve it (host tab labels rely on
    // this). With fallbackRoot true the package Composer reaches the root and
    // renders the host value.
    const target = document.createElement("div");
    document.body.append(target);
    const i18n = createI18n({
      legacy: false,
      locale: "en",
      fallbackLocale: "en",
      messages: { en: { hostOnly: { title: "Host title" } } },
    });
    const app = createApp(HostKeyProbe);
    app.use(i18n);
    app.mount(target);
    mountedApps.push(app);
    const el = target.firstElementChild as HTMLElement;
    expect(el.dataset.hostKey).toBe("Host title");
  });

  it("exposes a locale ref that follows the root locale", async () => {
    const { container, i18n } = mount(Probe, {
      overrides: {
        en: { Greeter: { greeting: "Hello overridden" } },
        "zh-CN": { Greeter: { greeting: "你好覆盖" } },
      },
    });
    const el = container.firstElementChild as HTMLElement;
    i18n.global.locale.value = "zh-CN";
    await Promise.resolve();
    expect(el.dataset.locale).toBe("zh-CN");
    expect(el.dataset.greeting).toBe("你好覆盖");
  });
});

describe("getComponentI18n", () => {
  it("resolves the nearest ancestor composer", () => {
    const { container } = mount(NestedProviders);
    const el = container.querySelector(
      "[data-consumer-greeting]",
    ) as HTMLElement;
    expect(el.dataset.consumerGreeting).toBe("Inner hello");
    expect(el.dataset.consumerFallback).toBe("true");
  });

  it("throws without an ancestor composer", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const target = document.createElement("div");
    document.body.append(target);
    const i18n = createI18n({
      legacy: false,
      locale: "en",
      fallbackLocale: "en",
      messages: {},
    });
    const app = createApp(ComposerConsumer);
    app.use(i18n);
    expect(() => app.mount(target)).toThrow(/getComponentI18n/);
    consoleError.mockRestore();
    target.remove();
  });
});

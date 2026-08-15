// @vitest-environment happy-dom

import { computed, createApp, defineComponent, type App, type Component } from "vue";
import { createI18n } from "vue-i18n";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createComponentI18n,
  getComponentI18n,
  type CreateComponentI18nOptions,
} from "../src/index";
import {
  libraryOverridesKey,
  type RegistryI18nOverrides,
} from "@noob-naive-ui/registry";

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

/**
 * The harness library declares its locale schema into the framework-wide
 * registry exactly like a component package (module augmentation); the
 * composable derives the schema from the registry entry, so no separate
 * descriptor handle exists.
 */
declare module "@noob-naive-ui/registry" {
  interface LibraryOverridesRegistry {
    "test-library": {
      locale: Record<TestLocaleName, TestLocale>;
      theme: {};
    };
  }
}

type TestOverrides = NonNullable<RegistryI18nOverrides["test-library"]>;

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
      libraryId: "test-library",
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
      libraryId: "test-library",
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
      libraryId: "test-library",
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
      libraryId: "test-library",
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
 * Mounts a component under a host-owned global Composer, optionally providing
 * the factory-built descriptor's override snapshot via its injection key.
 *
 * @param component - The root component to mount.
 * @param options - Host locale and optional descriptor override tree.
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
    app.provide(
      libraryOverridesKey,
      computed(() => ({ "test-library": { i18n: options.overrides } })),
    );
  }
  app.mount(target);
  mountedApps.push(app);
  return { container: target, i18n };
}

describe("createComponentI18n type-level contract", () => {
  it("rejects an unknown component id at compile time", () => {
    // Type-checked only (a const assignment never invokes the composable):
    // @ts-expect-error unknown component id must be rejected
    const _bad: CreateComponentI18nOptions<"test-library", TestLocaleName, TestLocale> = { messages: packagedDefaults, libraryId: "test-library", componentId: "Nope" };
  });

  it("requires every packaged locale in messages (no silent narrowing)", () => {
    // @ts-expect-error a partial messages object must not narrow the locale union
    const _bad: CreateComponentI18nOptions<"test-library", TestLocaleName, TestLocale> = { messages: { en: {} }, libraryId: "test-library", componentId: "Greeter" };
  });

  it("rejects a naive-ui call with an invalid component id and incomplete messages", () => {
    // The preseeded naive-ui entry now declares a typed locale schema
    // (NaiveUiLocale), so it IS an admissible library key — but its derived
    // schema makes a real createComponentI18n call meaningless (naive-ui texts
    // are consumed by naive-ui's own locale context, not vue-i18n). The
    // assignment below is still rejected: componentId must be a key of the
    // derived schema and messages must carry every derived locale.
    // @ts-expect-error naive-ui's derived schema rejects an arbitrary component id / partial messages
    const _bad: CreateComponentI18nOptions<"naive-ui"> = { messages: {}, libraryId: "naive-ui", componentId: "Button" };
  });
});

describe("createComponentI18n", () => {
  it("renders packaged defaults when no overrides are provided", () => {
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

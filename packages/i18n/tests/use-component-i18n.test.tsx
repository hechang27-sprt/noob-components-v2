// @vitest-environment happy-dom

import { createApp, defineComponent, type App, type InjectionKey } from "vue";
import { createI18n } from "vue-i18n";
import { afterEach, describe, expect, it } from "vitest";

import { useComponentI18n } from "../src/use-component-i18n";

/**
 * Minimal plugin-style override snapshot shaped like a library plugin's
 * app-scoped tree: a `messages` field the selector slices from.
 */
interface TestSnapshot {
  messages: {
    en?: { greeting?: string; farewell?: string };
    "zh-CN"?: { greeting?: string; farewell?: string };
  };
}

/** Packaged defaults a library component ships with. */
const packagedDefaults: Readonly<Record<string, unknown>> = {
  en: { greeting: "Hello", farewell: "Bye" },
  "zh-CN": { greeting: "你好", farewell: "再见" },
};

/** The injection key the harness provides under. */
const testOverridesKey: InjectionKey<TestSnapshot> = Symbol("test-overrides");

/** Frozen empty snapshot for the absent-plugin path. */
const emptySnapshot: TestSnapshot = Object.freeze({ messages: {} });

/** Renders the composable's outputs into data attributes for assertions. */
const Probe = defineComponent({
  setup() {
    const { composer, t, locale } = useComponentI18n({
      messages: packagedDefaults,
      overridesKey: testOverridesKey,
      emptySnapshot,
      selectOverrides: (messages) => messages,
    });
    return () => (
      <div
        data-greeting={t("greeting")}
        data-farewell={t("farewell")}
        data-fallback={String(composer.fallbackRoot)}
        data-locale={locale.value}
      />
    );
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
 * Mounts the probe under a host-owned global Composer, optionally providing
 * an override snapshot.
 *
 * @param options - Host locale and optional plugin-style override tree.
 * @returns The mounted container and the host global Composer.
 */
function mountProbe(
  options: { locale?: string; overrides?: TestSnapshot } = {},
) {
  const target = document.createElement("div");
  document.body.append(target);
  const i18n = createI18n({
    legacy: false,
    locale: options.locale ?? "en",
    fallbackLocale: "en",
    messages: {},
  });
  const app = createApp(Probe);
  app.use(i18n);
  if (options.overrides) {
    app.provide(testOverridesKey, options.overrides);
  }
  app.mount(target);
  mountedApps.push(app);
  return { container: target, i18n };
}

describe("useComponentI18n", () => {
  it("renders packaged defaults when no plugin installed the overrides key", () => {
    const { container } = mountProbe();
    const el = container.firstElementChild as HTMLElement;
    expect(el.dataset.greeting).toBe("Hello");
    expect(el.dataset.farewell).toBe("Bye");
  });

  it("merges the override slice after defaults: overrides win at the leaf, siblings survive", () => {
    const { container } = mountProbe({
      overrides: {
        messages: {
          en: { greeting: "Hello overridden" },
          "zh-CN": { greeting: "你好覆盖" },
        },
      },
    });
    const el = container.firstElementChild as HTMLElement;
    expect(el.dataset.greeting).toBe("Hello overridden");
    expect(el.dataset.farewell).toBe("Bye");
  });

  it("corrects fallbackRoot to false after creation", () => {
    const { container } = mountProbe();
    const el = container.firstElementChild as HTMLElement;
    expect(el.dataset.fallback).toBe("false");
  });

  it("exposes a locale ref that follows the root locale", async () => {
    const { container, i18n } = mountProbe({
      overrides: {
        messages: {
          en: { greeting: "Hello overridden" },
          "zh-CN": { greeting: "你好覆盖" },
        },
      },
    });
    const el = container.firstElementChild as HTMLElement;
    i18n.global.locale.value = "zh-CN";
    await Promise.resolve();
    expect(el.dataset.locale).toBe("zh-CN");
    expect(el.dataset.greeting).toBe("你好覆盖");
  });
});

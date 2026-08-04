// @vitest-environment happy-dom

import { createApp, defineComponent, type App } from "vue";
import { createI18n } from "vue-i18n";
import { afterEach, describe, expect, it } from "vitest";

import {
  createLibraryI18nPlugin,
  useComponentI18n,
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

/** Renders the composable's outputs into data attributes for assertions. */
const Probe = defineComponent({
  setup() {
    const { composer, t, locale } = useComponentI18n({
      messages: packagedDefaults,
      plugin: testPlugin,
      componentId: "Greeter",
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
 * Mounts the probe under a host-owned global Composer, optionally installing
 * the factory-built library plugin with override messages.
 *
 * @param options - Host locale and optional plugin override tree.
 * @returns The mounted container and the host global Composer.
 */
function mountProbe(
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
  const app = createApp(Probe);
  app.use(i18n);
  if (options.overrides) {
    app.use(testPlugin.plugin, { messages: options.overrides });
  }
  app.mount(target);
  mountedApps.push(app);
  return { container: target, i18n };
}

describe("useComponentI18n", () => {
  it("renders packaged defaults when the plugin is not installed", () => {
    const { container } = mountProbe();
    const el = container.firstElementChild as HTMLElement;
    expect(el.dataset.greeting).toBe("Hello");
    expect(el.dataset.farewell).toBe("Bye");
  });

  it("merges the override slice after defaults: overrides win at the leaf, siblings survive", () => {
    const { container } = mountProbe({
      overrides: {
        en: { Greeter: { greeting: "Hello overridden" } },
        "zh-CN": { Greeter: { greeting: "你好覆盖" } },
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

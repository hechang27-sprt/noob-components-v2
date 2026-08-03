// @vitest-environment happy-dom

import { createApp, h, nextTick, type App, type Plugin } from "vue";
import { createI18n } from "vue-i18n";
import { afterEach, describe, expect, it } from "vitest";

import PrototypeCard from "../src/prototype-card";
import {
  prototypeI18nOverridesKey,
  prototypeI18nPlugin,
  selectComponentOverrides,
  type PrototypeI18nSnapshot,
  type PrototypeLocaleOverrides,
} from "../src/plugin";

/** Retains mounted test applications so each test releases Vue resources. */
const mountedApps: App[] = [];

/** Unmounts test applications and clears the synthetic document after each test. */
afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

/**
 * Mounts PrototypeCard under a host-owned global Composer.
 *
 * @param options - Host locale/fallback settings and optional package overrides.
 * @returns The mounted card container and the global Composer used by the host.
 */
function mountPrototypeCard(
  options: {
    locale?: string;
    fallbackLocale?: string;
    overrides?: PrototypeLocaleOverrides;
  } = {},
) {
  const target = document.createElement("div");
  document.body.append(target);
  const i18n = createI18n({
    legacy: false,
    locale: options.locale ?? "en",
    fallbackLocale: options.fallbackLocale ?? "en",
    messages: {},
  });
  const app = createApp({ render: () => h(PrototypeCard) });
  app.use(i18n);
  if (options.overrides) {
    app.use(prototypeI18nPlugin, { messages: options.overrides });
  }
  app.mount(target);
  mountedApps.push(app);
  return { target, i18n };
}

/**
 * Captures the application-scoped snapshot supplied by the package plugin.
 *
 * @param overrides - Caller-owned override tree passed during installation.
 * @returns The snapshot observed through Vue's application provider map.
 */
function capturePluginSnapshot(
  overrides: PrototypeLocaleOverrides,
): PrototypeI18nSnapshot {
  let captured: PrototypeI18nSnapshot | undefined;
  const capture: Plugin = {
    install(app) {
      captured = app._context.provides[
        prototypeI18nOverridesKey as symbol
      ] as PrototypeI18nSnapshot;
    },
  };
  createApp({ render: () => null })
    .use(prototypeI18nPlugin, { messages: overrides })
    .use(capture);
  if (!captured) throw new Error("Prototype i18n snapshot was not provided");
  return captured;
}

describe("prototype i18n plugin", () => {
  it("snapshots caller overrides during installation", () => {
    const overrides: PrototypeLocaleOverrides = {
      en: { PrototypeCard: { title: "Installed title" } },
    };

    const snapshot = capturePluginSnapshot(overrides);
    overrides.en!.PrototypeCard!.title = "Mutated title";

    expect(snapshot.messages.en?.PrototypeCard?.title).toBe("Installed title");
  });

  it("selects only the requested component slices by locale", () => {
    const overrides: PrototypeLocaleOverrides = {
      en: { PrototypeCard: { title: "English title" } },
      "zh-CN": { PrototypeCard: { description: "中文描述" } },
    };

    expect(selectComponentOverrides(overrides, "PrototypeCard")).toEqual({
      en: { title: "English title" },
      "zh-CN": { description: "中文描述" },
    });
  });
});

describe("PrototypeCard locale ownership", () => {
  it("merges a partial override after defaults without losing siblings", () => {
    const { target } = mountPrototypeCard({
      overrides: { en: { PrototypeCard: { title: "Overridden title" } } },
    });

    expect(
      target.querySelector("[data-prototype-i18n-title]")?.textContent,
    ).toBe("Overridden title");
    expect(
      target.querySelector("[data-prototype-i18n-description]")?.textContent,
    ).toContain("component-local Vue I18n Composer");
  });

  it("inherits the host fallback without changing its unsupported active locale", async () => {
    const { target, i18n } = mountPrototypeCard({
      locale: "fr",
      fallbackLocale: "zh-CN",
    });
    await nextTick();

    expect(
      target.querySelector("[data-prototype-i18n-title]")?.textContent,
    ).toBe("原型 i18n 验证卡片");
    expect(i18n.global.locale.value).toBe("fr");
  });
});

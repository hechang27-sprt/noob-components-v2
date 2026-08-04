import { createApp } from "vue";
import { describe, expect, it } from "vitest";

import {
  createLibraryI18nPlugin,
  type LibraryI18nOverrides,
} from "../src/index";

/** Minimal component-first locale schema for the harness library. */
interface TestComponentMessages {
  greeting: string;
  farewell: string;
}

interface TestLocale {
  Greeter: TestComponentMessages;
}

type TestLocaleName = "en" | "zh-CN";

type TestOverrides = LibraryI18nOverrides<TestLocaleName, TestLocale>;

const testPlugin = createLibraryI18nPlugin<TestLocaleName, TestLocale>({
  libraryId: "test-library",
});

describe("createLibraryI18nPlugin", () => {
  it("ships a frozen empty snapshot for the absent-plugin path", () => {
    expect(testPlugin.emptySnapshot).toEqual({ messages: {} });
    expect(Object.isFrozen(testPlugin.emptySnapshot)).toBe(true);
  });

  it("selects one component's override slice per locale, skipping absent locales", () => {
    const messages: TestOverrides = {
      en: { Greeter: { greeting: "Hi" } },
      "zh-CN": {},
    };
    expect(testPlugin.selectComponentOverrides(messages, "Greeter")).toEqual({
      en: { greeting: "Hi" },
    });
  });

  it("selects an empty tree when the component carries no overrides", () => {
    const messages: TestOverrides = { en: {} };
    expect(testPlugin.selectComponentOverrides(messages, "Greeter")).toEqual(
      {},
    );
  });

  it("defensively copies caller overrides at installation", () => {
    const overrides: TestOverrides = {
      en: { Greeter: { greeting: "Original" } },
    };
    const app = createApp({ render: () => null });
    app.use(testPlugin.plugin, { messages: overrides });
    const captured = app._context.provides[
      testPlugin.overridesKey as symbol
    ] as { messages: TestOverrides };
    overrides.en!.Greeter!.greeting = "Mutated";
    expect(captured.messages.en!.Greeter!.greeting).toBe("Original");
  });

  it("supports a library with an empty component schema", () => {
    const emptyPlugin = createLibraryI18nPlugin<
      "en" | "zh-CN",
      Record<never, never>
    >({ libraryId: "empty-library" });
    expect(emptyPlugin.emptySnapshot).toEqual({ messages: {} });
    const emptyOverrides: LibraryI18nOverrides<
      "en" | "zh-CN",
      Record<never, never>
    > = { en: {} };
    expect(emptyOverrides).toEqual({ en: {} });
  });
});

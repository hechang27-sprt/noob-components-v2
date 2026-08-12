import { describe, expect, it } from "vitest";

import {
  createLibraryI18nDescriptor,
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

const testDescriptor = createLibraryI18nDescriptor<TestLocaleName, TestLocale>({
  libraryId: "test-library",
});

describe("createLibraryI18nDescriptor", () => {
  it("ships a frozen empty snapshot for the absent-override path", () => {
    expect(testDescriptor.emptySnapshot).toEqual({ messages: {} });
    expect(Object.isFrozen(testDescriptor.emptySnapshot)).toBe(true);
  });

  it("selects one component's override slice per locale, skipping absent locales", () => {
    const messages: TestOverrides = {
      en: { Greeter: { greeting: "Hi" } },
      "zh-CN": {},
    };
    expect(
      testDescriptor.selectComponentOverrides(messages, "Greeter"),
    ).toEqual({ en: { greeting: "Hi" } });
  });

  it("selects an empty tree when the component carries no overrides", () => {
    const messages: TestOverrides = { en: {} };
    expect(
      testDescriptor.selectComponentOverrides(messages, "Greeter"),
    ).toEqual({});
  });

  it("supports a library with an empty component schema", () => {
    const emptyDescriptor = createLibraryI18nDescriptor<
      "en" | "zh-CN",
      Record<never, never>
    >({ libraryId: "empty-library" });
    expect(emptyDescriptor.emptySnapshot).toEqual({ messages: {} });
    const emptyOverrides: LibraryI18nOverrides<
      "en" | "zh-CN",
      Record<never, never>
    > = { en: {} };
    expect(emptyOverrides).toEqual({ en: {} });
  });
});

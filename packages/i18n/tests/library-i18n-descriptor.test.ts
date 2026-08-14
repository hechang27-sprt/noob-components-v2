import { describe, expect, it } from "vitest";

import {
  emptySnapshot,
  selectComponentOverrides,
  type LibraryI18nDescriptor,
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

const testDescriptor: LibraryI18nDescriptor<TestLocaleName, TestLocale> = {
  libraryId: "test-library",
};

describe("shared i18n registry + descriptor primitives", () => {
  it("ships a frozen empty snapshot for the absent-override path", () => {
    expect(emptySnapshot).toEqual({});
    expect(Object.isFrozen(emptySnapshot)).toBe(true);
  });

  it("selects one component's override slice per locale, skipping absent locales", () => {
    const messages: TestOverrides = {
      en: { Greeter: { greeting: "Hi" } },
      "zh-CN": {},
    };
    expect(selectComponentOverrides(messages, "Greeter")).toEqual({
      en: { greeting: "Hi" },
    });
  });

  it("selects an empty tree when the component carries no overrides", () => {
    const messages: TestOverrides = { en: {} };
    expect(selectComponentOverrides(messages, "Greeter")).toEqual({});
  });

  it("types a descriptor from just a libraryId (no factory)", () => {
    expect(testDescriptor.libraryId).toBe("test-library");
    expect("emptySnapshot" in testDescriptor).toBe(false);
    expect("selectComponentOverrides" in testDescriptor).toBe(false);
  });
});

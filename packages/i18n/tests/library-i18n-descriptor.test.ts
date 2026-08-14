import { describe, expect, it } from "vitest";

import {
  emptySnapshot,
  libraryOverridesKey,
  selectComponentOverrides,
  selectComponentThemeOverrides,
  type LibraryI18nDescriptor,
  type LibraryI18nOverrides,
  type LibraryThemeDescriptor,
  type LibraryThemeOverrides,
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

  it("exposes one shared registry key", () => {
    expect(typeof libraryOverridesKey).toBe("symbol");
    // Overrides resolve through the shared registry by libraryId; there is no
    // per-descriptor injection key.
    expect("overridesKey" in testDescriptor).toBe(false);
  });

  it("types and selects a theme descriptor's component slice", () => {
    interface CardThemeVars {
      "--test-bg": string;
      "--test-pad": string;
    }
    interface TestThemeComponents {
      Card: CardThemeVars;
    }
    const themeDescriptor: LibraryThemeDescriptor<TestThemeComponents> = {
      libraryId: "test-theme-library",
    };
    const overrides: LibraryThemeOverrides<TestThemeComponents> = {
      Card: { "--test-bg": "blue" },
    };
    expect(themeDescriptor.libraryId).toBe("test-theme-library");
    expect("__theme" in themeDescriptor).toBe(false);
    expect(selectComponentThemeOverrides(overrides, "Card")).toEqual({
      "--test-bg": "blue",
    });
  });
});

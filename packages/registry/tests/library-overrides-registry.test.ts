import { describe, expect, it } from "vitest";

import {
  libraryOverridesKey,
  type LibraryThemeDescriptor,
} from "../src/index";
import {
  selectComponentThemeOverrides,
  type LibraryThemeOverrides,
} from "../src/library-theme-overrides";

describe("shared override registry", () => {
  it("exposes one shared injection key", () => {
    expect(typeof libraryOverridesKey).toBe("symbol");
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

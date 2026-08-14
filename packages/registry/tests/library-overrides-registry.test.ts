import { describe, expect, it } from "vitest";

import {
  libraryOverridesKey,
  type LibraryThemeDescriptor,
} from "../src/index";

describe("shared override registry", () => {
  it("exposes one shared injection key", () => {
    expect(typeof libraryOverridesKey).toBe("symbol");
  });

  it("types a theme descriptor with a stable libraryId and no runtime brand", () => {
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
    expect(themeDescriptor.libraryId).toBe("test-theme-library");
    expect("__theme" in themeDescriptor).toBe(false);
  });
});

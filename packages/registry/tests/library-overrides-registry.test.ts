import { describe, expect, it } from "vitest";

import {
  libraryOverridesKey,
  type LibraryThemeDescriptor,
  type RegistryI18nLibraryKey,
} from "../src/index";

describe("shared override registry", () => {
  it("exposes one shared injection key", () => {
    expect(typeof libraryOverridesKey).toBe("symbol");
  });

  it("preseeds naive-ui / pro-naive-ui with a typed locale override schema", () => {
    // The preseeded entries declare `locale: NaiveUiLocale` (pack in
    // `createLocale`'s NPartialLocale override form + full NDateLocale), so
    // `RegistryI18nOverrides["naive-ui"]` is the typed host override tree and
    // both preseeded keys are admissible i18n library keys (a documented
    // over-permissiveness: createComponentI18n compiles for them but is
    // semantically meaningless — naive-ui texts are consumed by naive-ui's own
    // locale context, not vue-i18n).
    const naiveKey: RegistryI18nLibraryKey = "naive-ui";
    const proKey: RegistryI18nLibraryKey = "pro-naive-ui";
    expect(typeof naiveKey).toBe("string");
    expect(typeof proKey).toBe("string");
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

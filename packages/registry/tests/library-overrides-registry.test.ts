import { describe, expect, it } from "vitest";

import {
  libraryOverridesKey,
  type AdminFontSize,
  type LibraryThemeDescriptor,
  type RegistryI18nLibraryKey,
  type RegistryThemeOverrides,
  type ThemeCssVarsFor,
  type ThemeVarValue,
} from "../src/index";

describe("shared override registry", () => {
  it("exposes one shared injection key", () => {
    expect(typeof libraryOverridesKey).toBe("symbol");
  });

  it("converts a declared camelCase themeVar schema to CSS custom properties", () => {
    interface CardVars {
      background: string;
      borderColor: string;
      padding: ThemeVarValue;
    }
    type CssVars = ThemeCssVarsFor<"noob-ui", "Card", CardVars>;
    type Background = CssVars["--noob-ui-card-background"];
    type BorderColor = CssVars["--noob-ui-card-border-color"];
    type Padding = CssVars["--noob-ui-card-padding"];
    // Size-keyed declarations still resolve to plain string CSS values.
    const p: string = null as unknown as Padding;
    void p;
    // @ts-expect-error the converted record has no camelCase keys
    type _Bad = CssVars["borderColor"];
    void (null as unknown as Background);
    void (null as unknown as BorderColor);
    const tier: AdminFontSize = "large";
    void tier;
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

    // The preseeded naive-ui theme slice accepts size-keyed values, so a
    // preset can express per-font-size naive-ui config in themeOverrides.
    const naiveTheme: RegistryThemeOverrides["naive-ui"] = {
      common: { fontSize: { small: "13px", medium: "14px", large: "16px" } },
    };
    expect(naiveTheme?.common?.fontSize).toEqual({
      small: "13px",
      medium: "14px",
      large: "16px",
    });
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

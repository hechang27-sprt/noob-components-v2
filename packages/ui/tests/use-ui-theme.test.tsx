// @vitest-environment happy-dom

import { createApp, provide, ref, type App } from "vue";
import { afterEach, describe, expect, it } from "vitest";

import { themeFontSizeKey } from "@noob-naive-ui/registry";
import { AdminUiConfigProvider } from "../src/config-provider";
import { useUiCssVarsFor, type NoobUiThemeOverrides } from "../src/theme";
import { useUiTheme } from "../src/theme";
import { CssVarsOf } from "@noob-naive-ui/registry";
import { LIB_ID, Example, CSS_PREFIX } from "@noob-naive-ui/ui";

// Type-level: a Card override declares camelCase themeVars (naive-ui
// convention); raw `--ui-…` names and unknown camelCase names are rejected at
// the host boundary.
const valid: NoobUiThemeOverrides = { Example: { borderColor: "red" } };
const invalid: NoobUiThemeOverrides = {
  // @ts-expect-error -- raw CSS var names are not part of the declared schema
  Example: { "--noob-ui-example-border-color": "x" },
};
const invalid2: NoobUiThemeOverrides = {
  // @ts-expect-error -- unknown camelCase var name is rejected
  Example: { backgroundColor: "x" },
};
void invalid;
void invalid2;

// Type-level: useUiTheme's output carries the converted `--noob-ui-example-…` names.
type CardOverride = ReturnType<typeof useUiTheme<"Example">>["value"];
const output = undefined as unknown as CardOverride;
const convertedKey: string | undefined =
  output?.["--noob-ui-example-border-color"];
void convertedKey;
// The converted record has no camelCase keys.
// @ts-expect-error -- converted output carries CSS var names, not camelCase
const _bad: CardOverride = { borderColor: "red" };
// Sanity: the conversion is the declared schema mapped to `--noob-ui-example-…`,
// via the registry's reusable ThemeCssVarsFor.
type CardCssVars = Partial<
  CssVarsOf<typeof LIB_ID, "Example", typeof CSS_PREFIX>
>;
const _same: CardCssVars | undefined = output;
void _same;

// Type-level: passing defaults makes the output never `undefined`.
const withDefaults = useUiTheme("Example", { background: "#fff" });
const _badDefaults: (typeof withDefaults)["value"] = undefined;
void _badDefaults;

/** Retains mounted apps until cleanup prevents DOM leakage. */
const mountedApps: App[] = [];

/** Unmounts mounted apps and clears the synthetic document after each test. */
afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

/**
 * Mounts a UiCard, optionally under an AdminUiConfigProvider carrying a ui
 * themeOverride slice and/or an injected font-size tier.
 *
 * @param themeOverride - Optional ui themeVar override slice (camelCase).
 * @param fontSize - Optional active font-size tier (size-keyed resolution).
 * @returns The mounted container.
 */
function mountCard(
  themeOverride?: NoobUiThemeOverrides,
  fontSize?: "small" | "medium" | "large",
): HTMLElement {
  const target = document.createElement("div");
  document.body.append(target);
  const app = createApp({
    setup: () => {
      if (fontSize) provide(themeFontSizeKey, ref(fontSize));
      return () =>
        themeOverride ? (
          <AdminUiConfigProvider themeOverride={themeOverride}>
            <Example />
          </AdminUiConfigProvider>
        ) : (
          <Example />
        );
    },
  });
  app.mount(target);
  mountedApps.push(app);
  return target;
}

const { $css } = useUiCssVarsFor("Example");

describe("useUiTheme + AdminUiConfigProvider", () => {
  it("binds a camelCase Card override as the converted `--noob-ui-example-…` CSS var, merged over defaults", () => {
    const target = mountCard({
      Example: { borderColor: "red" },
    });
    const el = target.querySelector<HTMLElement>(".example");
    expect(
      el?.style.getPropertyValue($css("--noob-ui-example-border-color")),
    ).toBe("red");
    // defaults still present underneath the override
    expect(
      el?.style.getPropertyValue($css("--noob-ui-example-background")),
    ).toBe("#ffffff");
  });

  it("renders provider-less defaults as inline CSS vars", () => {
    const target = mountCard();
    const el = target.querySelector<HTMLElement>(".example");
    expect(
      el?.style.getPropertyValue($css("--noob-ui-example-background")),
    ).toBe("#ffffff");
    expect(
      el?.style.getPropertyValue($css("--noob-ui-example-border-color")),
    ).toBe("#d0d5dd");
    expect(el?.style.getPropertyValue($css("--noob-ui-example-padding"))).toBe(
      "1rem",
    );
  });

  it("resolves size-keyed vars against the injected font-size tier", () => {
    // No provider -> the default (medium) tier applies.
    const medium = mountCard();
    const mediumEl = medium.querySelector<HTMLElement>(".example");
    expect(
      mediumEl?.style.getPropertyValue($css("--noob-ui-example-padding")),
    ).toBe("1rem");

    // An injected large tier picks the large value.
    const large = mountCard(undefined, "large");
    const largeEl = large.querySelector<HTMLElement>(".example");
    expect(
      largeEl?.style.getPropertyValue($css("--noob-ui-example-padding")),
    ).toBe("1.25rem");

    // Size-keyed overrides also resolve (large tier).
    const overridden = mountCard(
      {
        Example: {
          padding: { small: "2rem", medium: "2.5rem", large: "3rem" },
        },
      },
      "large",
    );
    const overriddenEl = overridden.querySelector<HTMLElement>(".example");
    expect(
      overriddenEl?.style.getPropertyValue($css("--noob-ui-example-padding")),
    ).toBe("3rem");
  });

  it("keeps camelCase names in the typed override surface", () => {
    expect(valid.Example?.borderColor).toBe("red");
  });
});

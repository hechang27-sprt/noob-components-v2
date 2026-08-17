// @vitest-environment happy-dom

import { createApp, provide, ref, type App } from "vue";
import { afterEach, describe, expect, it } from "vitest";

import { themeFontSizeKey } from "@noob-naive-ui/registry";
import { AdminUiConfigProvider } from "../src/theme/admin-ui-config-provider";
import { UiCard, type UiCardThemeVars } from "../src/components/card/ui-card";
import type { ThemeCssVarsFor } from "@noob-naive-ui/registry";
import type { NoobUiThemeOverrides } from "../src/theme/types";
import { useUiTheme } from "../src/theme/use-ui-theme";

// Type-level: a Card override declares camelCase themeVars (naive-ui
// convention); raw `--ui-…` names and unknown camelCase names are rejected at
// the host boundary.
const valid: NoobUiThemeOverrides = { Card: { borderColor: "red" } };
const invalid: NoobUiThemeOverrides = {
  // @ts-expect-error -- raw CSS var names are not part of the declared schema
  Card: { "--noob-ui-card-border-color": "x" },
};
const invalid2: NoobUiThemeOverrides = {
  // @ts-expect-error -- unknown camelCase var name is rejected
  Card: { backgroundColor: "x" },
};
void invalid;
void invalid2;

// Type-level: useUiTheme's output carries the converted `--noob-ui-card-…` names.
type CardOverride = ReturnType<typeof useUiTheme<"Card">>["value"];
const output = undefined as unknown as CardOverride;
const convertedKey: string | undefined =
  output?.["--noob-ui-card-border-color"];
void convertedKey;
// The converted record has no camelCase keys.
// @ts-expect-error -- converted output carries CSS var names, not camelCase
const _bad: CardOverride = { borderColor: "red" };
// Sanity: the conversion is the declared schema mapped to `--noob-ui-card-…`,
// via the registry's reusable ThemeCssVarsFor.
type CardCssVars = Partial<ThemeCssVarsFor<"noob-ui", "Card", UiCardThemeVars>>;
const _same: CardCssVars | undefined = output;
void _same;

// Type-level: passing defaults makes the output never `undefined`.
const withDefaults = useUiTheme("Card", { background: "#fff" });
// @ts-expect-error defaults make the output never undefined
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
            <UiCard />
          </AdminUiConfigProvider>
        ) : (
          <UiCard />
        );
    },
  });
  app.mount(target);
  mountedApps.push(app);
  return target;
}

describe("useUiTheme + AdminUiConfigProvider", () => {
  it("binds a camelCase Card override as the converted `--noob-ui-card-…` CSS var, merged over defaults", () => {
    const target = mountCard({ Card: { borderColor: "red" } });
    const el = target.querySelector<HTMLElement>(".ui-card");
    expect(el?.style.getPropertyValue("--noob-ui-card-border-color")).toBe(
      "red",
    );
    // defaults still present underneath the override
    expect(el?.style.getPropertyValue("--noob-ui-card-background")).toBe(
      "#ffffff",
    );
  });

  it("renders provider-less defaults as inline CSS vars", () => {
    const target = mountCard();
    const el = target.querySelector<HTMLElement>(".ui-card");
    expect(el?.style.getPropertyValue("--noob-ui-card-background")).toBe(
      "#ffffff",
    );
    expect(el?.style.getPropertyValue("--noob-ui-card-border-color")).toBe(
      "#d0d5dd",
    );
    expect(el?.style.getPropertyValue("--noob-ui-card-padding")).toBe("1rem");
  });

  it("resolves size-keyed vars against the injected font-size tier", () => {
    // No provider -> the default (medium) tier applies.
    const medium = mountCard();
    const mediumEl = medium.querySelector<HTMLElement>(".ui-card");
    expect(mediumEl?.style.getPropertyValue("--noob-ui-card-padding")).toBe(
      "1rem",
    );

    // An injected large tier picks the large value.
    const large = mountCard(undefined, "large");
    const largeEl = large.querySelector<HTMLElement>(".ui-card");
    expect(largeEl?.style.getPropertyValue("--noob-ui-card-padding")).toBe(
      "1.25rem",
    );

    // Size-keyed overrides also resolve (large tier).
    const overridden = mountCard(
      { Card: { padding: { small: "2rem", medium: "2.5rem", large: "3rem" } } },
      "large",
    );
    const overriddenEl = overridden.querySelector<HTMLElement>(".ui-card");
    expect(overriddenEl?.style.getPropertyValue("--noob-ui-card-padding")).toBe(
      "3rem",
    );
  });

  it("keeps camelCase names in the typed override surface", () => {
    expect(valid.Card?.borderColor).toBe("red");
  });
});

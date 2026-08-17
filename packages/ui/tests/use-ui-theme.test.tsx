// @vitest-environment happy-dom

import { createApp, type App } from "vue";
import { afterEach, describe, expect, it } from "vitest";

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
  Card: { "--ui-card-border-color": "x" },
};
const invalid2: NoobUiThemeOverrides = {
  // @ts-expect-error -- unknown camelCase var name is rejected
  Card: { backgroundColor: "x" },
};
void invalid;
void invalid2;

// Type-level: useUiTheme's output carries the converted `--ui-card-…` names.
type CardOverride = ReturnType<typeof useUiTheme<"Card">>["value"];
const output = undefined as unknown as CardOverride;
const convertedKey: string | undefined = output?.["--ui-card-border-color"];
void convertedKey;
// The converted record has no camelCase keys.
// @ts-expect-error -- converted output carries CSS var names, not camelCase
const _bad: CardOverride = { borderColor: "red" };
// Sanity: the conversion is the declared schema mapped to `--ui-card-…`,
// via the registry's reusable ThemeCssVarsFor.
type CardCssVars = Partial<ThemeCssVarsFor<"ui", "Card", UiCardThemeVars>>;
const _same: CardCssVars | undefined = output;
void _same;

/** Retains mounted apps until cleanup prevents DOM leakage. */
const mountedApps: App[] = [];

/** Unmounts mounted apps and clears the synthetic document after each test. */
afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

/**
 * Mounts a UiCard, optionally under an AdminUiConfigProvider carrying a ui
 * themeOverride slice.
 *
 * @param themeOverride - Optional ui themeVar override slice (camelCase).
 * @returns The mounted container.
 */
function mountCard(themeOverride?: NoobUiThemeOverrides): HTMLElement {
  const target = document.createElement("div");
  document.body.append(target);
  const app = createApp({
    setup: () => () =>
      themeOverride ? (
        <AdminUiConfigProvider themeOverride={themeOverride}>
          <UiCard />
        </AdminUiConfigProvider>
      ) : (
        <UiCard />
      ),
  });
  app.mount(target);
  mountedApps.push(app);
  return target;
}

describe("useUiTheme + AdminUiConfigProvider", () => {
  it("binds a camelCase Card override as the converted `--ui-card-…` CSS var", () => {
    const target = mountCard({ Card: { borderColor: "red" } });
    const el = target.querySelector<HTMLElement>(".ui-card");
    expect(el?.style.getPropertyValue("--ui-card-border-color")).toBe("red");
  });

  it("renders no inline style vars without a provider", () => {
    const target = mountCard();
    const el = target.querySelector<HTMLElement>(".ui-card");
    expect(el?.style.getPropertyValue("--ui-card-border-color")).toBe("");
  });

  it("keeps camelCase names in the typed override surface", () => {
    expect(valid.Card?.borderColor).toBe("red");
  });
});

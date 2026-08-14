// @vitest-environment happy-dom

import { createApp, type App } from "vue";
import { afterEach, describe, expect, it } from "vitest";

import { AdminUiConfigProvider } from "../src/theme/admin-ui-config-provider";
import { UiCard } from "../src/card/ui-card";
import type { NoobUiThemeOverrides } from "../src/theme/types";

// Type-level: a Card override autocompletes the exact `--ui-card-*` names.
const valid: NoobUiThemeOverrides = { Card: { "--ui-card-bg": "red" } };
// @ts-expect-error -- unknown var name is rejected at the host boundary
const invalid: NoobUiThemeOverrides = { Card: { "--ui-card-nope": "x" } };
void invalid;

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
 * @param themeOverride - Optional ui themeVar override slice.
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
  it("binds the themeOverride Card slice as inline CSS vars", () => {
    const target = mountCard({ Card: { "--ui-card-bg": "red" } });
    const el = target.querySelector<HTMLElement>(".ui-card");
    expect(el?.style.getPropertyValue("--ui-card-bg")).toBe("red");
  });

  it("renders no inline style vars without a provider", () => {
    const target = mountCard();
    const el = target.querySelector<HTMLElement>(".ui-card");
    expect(el?.style.getPropertyValue("--ui-card-bg")).toBe("");
  });

  it("keeps exact var names in the typed override surface", () => {
    expect(valid.Card?.["--ui-card-bg"]).toBe("red");
  });
});

import { describe, expect, it } from "vitest";

import {
  emptySnapshot,
  selectComponentOverrides,
} from "../src/index";
import type { RegistryI18nOverrides } from "@noob-naive-ui/registry";

/**
 * The harness library's registry-declared override tree. The locale schema
 * itself lives in the `use-component-i18n.test.tsx` module augmentation of
 * `LibraryOverridesRegistry` (module augmentation is program-wide); this
 * selector test only exercises the shared selector against the projection.
 */
type TestOverrides = NonNullable<RegistryI18nOverrides["test-library"]>;

describe("shared i18n registry + selector primitives", () => {
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
});

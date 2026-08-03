import { describe, expect, it, vi } from "vitest";

import {
  i18nTextSchema,
  resolveI18nText,
  type I18nText,
} from "../src/i18n-text";

describe("i18nTextSchema", () => {
  it("accepts a verbatim string text", () => {
    expect(
      i18nTextSchema.parse({ kind: "string", value: "Dashboard" }),
    ).toEqual({ kind: "string", value: "Dashboard" });
  });

  it("accepts an i18n key without named values", () => {
    expect(
      i18nTextSchema.parse({ kind: "i18n", key: "tabs.dashboard" }),
    ).toEqual({ kind: "i18n", key: "tabs.dashboard" });
  });

  it("accepts an i18n key with primitive named values", () => {
    expect(
      i18nTextSchema.parse({
        kind: "i18n",
        key: "tabs.detail",
        named: { id: "quarterly-2011", page: 3, pinned: true },
      }),
    ).toEqual({
      kind: "i18n",
      key: "tabs.detail",
      named: { id: "quarterly-2011", page: 3, pinned: true },
    });
  });

  it("rejects an unknown kind", () => {
    expect(
      i18nTextSchema.safeParse({ kind: "literal", value: "x" }).success,
    ).toBe(false);
  });

  it("rejects non-primitive named values (persisted with history state)", () => {
    expect(
      i18nTextSchema.safeParse({
        kind: "i18n",
        key: "tabs.detail",
        named: { nested: { id: "x" } },
      }).success,
    ).toBe(false);
  });
});

describe("resolveI18nText", () => {
  it("returns string text verbatim without calling the translator", () => {
    const translate = vi.fn();
    const text: I18nText = { kind: "string", value: "Dashboard" };
    expect(resolveI18nText(text, translate)).toBe("Dashboard");
    expect(translate).not.toHaveBeenCalled();
  });

  it("translates an i18n key without named values", () => {
    const translate = vi.fn().mockReturnValue("仪表盘");
    const text: I18nText = { kind: "i18n", key: "tabs.dashboard" };
    expect(resolveI18nText(text, translate)).toBe("仪表盘");
    expect(translate).toHaveBeenCalledWith("tabs.dashboard", undefined);
  });

  it("passes named values to the translator", () => {
    const translate = vi.fn().mockReturnValue("Report quarterly-2011");
    const text: I18nText = {
      kind: "i18n",
      key: "tabs.detail",
      named: { id: "quarterly-2011" },
    };
    expect(resolveI18nText(text, translate)).toBe("Report quarterly-2011");
    expect(translate).toHaveBeenCalledWith("tabs.detail", {
      id: "quarterly-2011",
    });
  });
});

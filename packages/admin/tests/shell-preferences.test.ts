import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { resolveAdminNaiveBaseFontSize } from "../src";
import type { AdminThemePreset } from "../src/runtime-contract";
import { useAdminShellPreferencesStore } from "../src/stores/shell-preferences";

const STORAGE_KEY = "@noob-naive-ui/admin:shell-preferences";
const DEFAULT_PREFERENCES = {
  themeMode: "system",
  themeKey: "",
  fontSize: "medium",
  locale: "en",
  availableLocales: [],
  sidebarCollapsed: false,
} as const;

/** The persisted preference fields the store holds in its `preferences` blob. */
interface RawPreferenceState {
  themeMode: string;
  themeKey: string;
  fontSize: string;
  locale: string;
  availableLocales: { key: string; label: string }[];
  sidebarCollapsed: boolean;
}

/** Snapshots the store's persisted `preferences` blob (all fields are stored). */
function preferencesOf(store: {
  preferences: RawPreferenceState;
}): RawPreferenceState {
  return { ...store.preferences };
}

type MemoryStorageAdapter = Pick<Storage, "getItem" | "setItem" | "removeItem">;

class MemoryStorage implements MemoryStorageAdapter {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

class ThrowingStorage implements MemoryStorageAdapter {
  getItem(): string | null {
    throw new Error("storage blocked");
  }

  setItem(): void {
    throw new Error("storage blocked");
  }

  removeItem(): void {
    throw new Error("storage blocked");
  }
}

describe("useAdminShellPreferencesStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("hydrates defaults without browser storage", () => {
    const store = useAdminShellPreferencesStore();

    store.initialize({
      defaults: {
        availableLocales: [
          { key: "en", label: "English" },
          { key: "fr", label: "Français" },
        ],
        locale: "fr",
        themeMode: "dark",
      },
      storage: null,
    });

    expect(store.runtime.isHydrated).toBe(true);
    expect(preferencesOf(store)).toEqual({
      ...DEFAULT_PREFERENCES,
      availableLocales: [
        { key: "en", label: "English" },
        { key: "fr", label: "Français" },
      ],
      locale: "fr",
      themeMode: "dark",
    });
  });

  it("rehydrates persisted preferences and keeps locale options from defaults", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        themeMode: "light",
        fontSize: "large",
        locale: "zh-CN",
        sidebarCollapsed: true,
      }),
    );

    const store = useAdminShellPreferencesStore();
    store.initialize({
      storage,
      defaults: {
        availableLocales: [{ key: "zh-CN", label: "简体中文" }],
      },
    });

    expect(preferencesOf(store)).toEqual({
      themeMode: "light",
      themeKey: "",
      fontSize: "large",
      locale: "zh-CN",
      availableLocales: [{ key: "zh-CN", label: "简体中文" }],
      sidebarCollapsed: true,
    });
  });

  it("writes only persisted fields back to storage on mutation", () => {
    const storage = new MemoryStorage();
    const store = useAdminShellPreferencesStore();

    store.initialize({
      storage,
      defaults: {
        availableLocales: [
          { key: "en", label: "English" },
          { key: "zh-CN", label: "简体中文" },
        ],
      },
    });
    store.preferences.themeMode = "dark";
    store.preferences.themeKey = "ocean";
    store.preferences.fontSize = "large";
    store.preferences.locale = "zh-CN";
    store.preferences.sidebarCollapsed = true;

    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "null")).toEqual({
      themeMode: "dark",
      themeKey: "ocean",
      fontSize: "large",
      locale: "zh-CN",
      sidebarCollapsed: true,
    });
    expect(store.preferences.availableLocales).toEqual([
      { key: "en", label: "English" },
      { key: "zh-CN", label: "简体中文" },
    ]);
  });

  it("drops malformed persisted payloads and falls back to defaults", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{bad json");

    const store = useAdminShellPreferencesStore();
    store.initialize({ storage });

    expect(preferencesOf(store)).toEqual(DEFAULT_PREFERENCES);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("maps each font-size preference to its CSS base font size", () => {
    expect(resolveAdminNaiveBaseFontSize("small")).toBe("13px");
    expect(resolveAdminNaiveBaseFontSize("medium")).toBe("14px");
    expect(resolveAdminNaiveBaseFontSize("large")).toBe("16px");
  });

  it("lets the active preset's font config override the default base font", () => {
    // A font-only preset: size-keyed values in themeOverrides, no colors.
    const fontOnlyPreset: AdminThemePreset = {
      key: "large-text",
      label: { kind: "string", value: "Large text" },
      isDark: false,
      themeOverrides: {
        "naive-ui": {
          common: {
            fontSize: { small: "13px", medium: "14px", large: "20px" },
          },
        },
      },
    };
    expect(resolveAdminNaiveBaseFontSize("large", fontOnlyPreset)).toBe("20px");
    // Other tiers resolve their own size-keyed value (falling back to the
    // built-in default when the preset does not set one).
    expect(resolveAdminNaiveBaseFontSize("medium", fontOnlyPreset)).toBe(
      "14px",
    );
    // Plain font values in themeOverrides also beat the default.
    const direct: AdminThemePreset = {
      key: "direct",
      label: { kind: "string", value: "Direct" },
      isDark: false,
      themeOverrides: { "naive-ui": { common: { fontSize: "18px" } } },
    };
    expect(resolveAdminNaiveBaseFontSize("medium", direct)).toBe("18px");
  });

  it("treats storage adapter failures as no persistence", () => {
    const store = useAdminShellPreferencesStore();

    expect(() => {
      store.initialize({
        storage: new ThrowingStorage(),
        defaults: {
          availableLocales: [{ key: "en", label: "English" }],
          locale: "en",
        },
      });
      store.preferences.themeMode = "dark";
      store.preferences.sidebarCollapsed = true;
    }).not.toThrow();

    expect(preferencesOf(store)).toEqual({
      ...DEFAULT_PREFERENCES,
      availableLocales: [{ key: "en", label: "English" }],
      locale: "en",
      themeMode: "dark",
      sidebarCollapsed: true,
    });
  });
});

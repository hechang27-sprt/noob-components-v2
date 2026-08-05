import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import {
  resolveAdminNaiveBaseFontSize,
  useAdminShellPreferencesStore,
} from "../src";

const STORAGE_KEY = "@noob-naive-ui/admin:shell-preferences";
const DEFAULT_PREFERENCES = {
  themeMode: "system",
  fontSize: "medium",
  locale: "en",
  availableLocales: [],
  sidebarCollapsed: false,
} as const;

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

    expect(store.isHydrated).toBe(true);
    expect(store.preferences).toEqual({
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

    expect(store.preferences).toEqual({
      themeMode: "light",
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
    store.setThemeMode("dark");
    store.setFontSize("large");
    store.setLocale("zh-CN");
    store.toggleSidebar();

    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "null")).toEqual({
      themeMode: "dark",
      fontSize: "large",
      locale: "zh-CN",
      sidebarCollapsed: true,
    });
    expect(store.availableLocales).toEqual([
      { key: "en", label: "English" },
      { key: "zh-CN", label: "简体中文" },
    ]);
  });

  it("drops malformed persisted payloads and falls back to defaults", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{bad json");

    const store = useAdminShellPreferencesStore();
    store.initialize({ storage });

    expect(store.preferences).toEqual(DEFAULT_PREFERENCES);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("derives naiveUiConfig runtime-only props from preferences", () => {
    const store = useAdminShellPreferencesStore();
    store.initialize({
      storage: null,
      defaults: {
        availableLocales: [
          { key: "en", label: "English" },
          { key: "zh-CN", label: "简体中文" },
        ],
        themeMode: "light",
        fontSize: "small",
        locale: "en",
      },
    });

    const config = store.naiveUiConfig;

    // Light mode resolves to the light theme (null), and the font-size
    // preference maps to the per-component size tier, not a global size prop.
    expect(config.theme).toBeNull();
    expect(config.themeOverrides).toEqual({ common: { fontSize: "13px" } });
    expect(config.componentOptions.Button?.size).toBe("small");
    expect(config.componentOptions.Input?.size).toBe("small");
    expect(config.componentOptions.Tabs?.size).toBe("small");
    expect("size" in config).toBe(false);

    // Changing the font-size preference re-sizes every component together.
    store.setFontSize("large");
    expect(store.naiveUiConfig.themeOverrides).toEqual({
      common: { fontSize: "16px" },
    });
    expect(store.naiveUiConfig.componentOptions.Button?.size).toBe("large");

    // System mode follows the runtime-only dark signal.
    store.setThemeMode("system");
    expect(store.naiveUiConfig.theme).toBeNull();
    store.setSystemUsesDark(true);
    expect(store.naiveUiConfig.theme).not.toBeNull();

    // An unsupported locale resolves through the host fallback (en).
    store.setLocale("fr");
    expect(store.naiveUiConfig.locale).not.toBeNull();
  });

  it("maps each font-size preference to its CSS base font size", () => {
    expect(resolveAdminNaiveBaseFontSize("small")).toBe("13px");
    expect(resolveAdminNaiveBaseFontSize("medium")).toBe("14px");
    expect(resolveAdminNaiveBaseFontSize("large")).toBe("16px");
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
      store.setThemeMode("dark");
      store.toggleSidebar();
    }).not.toThrow();

    expect(store.preferences).toEqual({
      ...DEFAULT_PREFERENCES,
      availableLocales: [{ key: "en", label: "English" }],
      locale: "en",
      themeMode: "dark",
      sidebarCollapsed: true,
    });
  });
});

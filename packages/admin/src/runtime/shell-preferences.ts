import { z } from "zod";

import type {
  AdminFontSize,
  AdminLocaleOption,
  AdminShellPreferences,
  AdminThemeMode,
} from "../runtime-contract";

export type AdminShellPreferencesStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type AdminShellPreferencesStoreOptions = {
  defaults?: Partial<AdminShellPreferences>;
  storage?: AdminShellPreferencesStorage | null;
  /** Host-owned naive-ui fallback locale; runtime-only, never persisted. */
  fallbackLocale?: string;
};

const STORAGE_KEY = "@noob-naive-ui/admin:shell-preferences";
const DEFAULT_THEME_MODE: AdminThemeMode = "system";
const DEFAULT_FONT_SIZE: AdminFontSize = "medium";
const DEFAULT_LOCALE = "en";
/** Host-owned naive-ui fallback locale applied when the active locale is unsupported. */
export const DEFAULT_FALLBACK_LOCALE = "en";

const themeModeValues = [
  "light",
  "dark",
  "system",
] as const satisfies readonly AdminThemeMode[];
const fontSizeValues = [
  "small",
  "medium",
  "large",
] as const satisfies readonly AdminFontSize[];

const themeModeSchema = z.enum(themeModeValues);
const fontSizeSchema = z.enum(fontSizeValues);
const trimmedStringSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string(),
);
const nonEmptyStringSchema = trimmedStringSchema.pipe(z.string().min(1));
const localeOptionSchema = z.object({
  key: nonEmptyStringSchema,
  label: nonEmptyStringSchema,
});
const localeOptionsSchema = z
  .array(z.unknown())
  .catch([])
  .transform((items) =>
    items.flatMap((item) => {
      const parsed = localeOptionSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }),
  );
const themeModeInputSchema = themeModeSchema
  .catch(DEFAULT_THEME_MODE)
  .default(DEFAULT_THEME_MODE);
const fontSizeInputSchema = fontSizeSchema
  .catch(DEFAULT_FONT_SIZE)
  .default(DEFAULT_FONT_SIZE);
const localeInputSchema = z
  .union([nonEmptyStringSchema, z.undefined()])
  .catch(undefined);
const sidebarCollapsedInputSchema = z.boolean().catch(false).default(false);
const normalizedShellPreferencesSchema = z
  .object({
    themeMode: themeModeInputSchema,
    fontSize: fontSizeInputSchema,
    locale: localeInputSchema,
    availableLocales: localeOptionsSchema.default([]),
    sidebarCollapsed: sidebarCollapsedInputSchema,
  })
  .transform(
    ({
      themeMode,
      fontSize,
      locale,
      availableLocales,
      sidebarCollapsed,
    }): AdminShellPreferences => ({
      themeMode,
      fontSize,
      locale: locale ?? availableLocales[0]?.key ?? DEFAULT_LOCALE,
      availableLocales,
      sidebarCollapsed,
    }),
  );
const persistedShellPreferencesSchema = z.object({
  themeMode: themeModeInputSchema,
  fontSize: fontSizeInputSchema,
  locale: nonEmptyStringSchema,
  sidebarCollapsed: z.boolean(),
});

type PersistedShellPreferences = z.infer<
  typeof persistedShellPreferencesSchema
>;

export function createDefaultAdminShellPreferences(
  defaults?: Partial<AdminShellPreferences>,
): AdminShellPreferences {
  return normalizeShellPreferences({
    themeMode: DEFAULT_THEME_MODE,
    fontSize: DEFAULT_FONT_SIZE,
    locale: DEFAULT_LOCALE,
    availableLocales: [],
    sidebarCollapsed: false,
    ...defaults,
  });
}

export function resolveAdminShellPreferencesStorage(
  storage?: AdminShellPreferencesStorage | null,
): AdminShellPreferencesStorage | null {
  if (storage !== undefined) {
    return storage;
  }

  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return null;
  }

  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function loadAdminShellPreferences(
  storage: AdminShellPreferencesStorage | null,
  defaults: AdminShellPreferences,
): AdminShellPreferences {
  const serialized = safeGetItem(storage, STORAGE_KEY);

  if (!serialized) {
    return cloneShellPreferences(defaults);
  }

  try {
    const persisted = parsePersistedShellPreferences(
      JSON.parse(serialized) as unknown,
    );

    if (!persisted) {
      safeRemoveItem(storage, STORAGE_KEY);
      return cloneShellPreferences(defaults);
    }

    return normalizeShellPreferences({
      ...defaults,
      ...persisted,
    });
  } catch {
    safeRemoveItem(storage, STORAGE_KEY);
    return cloneShellPreferences(defaults);
  }
}

export function persistAdminShellPreferences(
  storage: AdminShellPreferencesStorage | null,
  preferences: AdminShellPreferences,
): void {
  if (!storage) {
    return;
  }

  const persisted: PersistedShellPreferences = {
    themeMode: preferences.themeMode,
    fontSize: preferences.fontSize,
    locale: preferences.locale,
    sidebarCollapsed: preferences.sidebarCollapsed,
  };

  safeSetItem(storage, STORAGE_KEY, JSON.stringify(persisted));
}

export function normalizeShellPreferences(
  input: Partial<AdminShellPreferences>,
): AdminShellPreferences {
  return normalizedShellPreferencesSchema.parse(input);
}

function parsePersistedShellPreferences(
  input: unknown,
): PersistedShellPreferences | null {
  const parsed = persistedShellPreferencesSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

function cloneShellPreferences(
  preferences: AdminShellPreferences,
): AdminShellPreferences {
  return {
    ...preferences,
    availableLocales: cloneLocaleOptions(preferences.availableLocales),
  };
}

function cloneLocaleOptions(options: AdminLocaleOption[]): AdminLocaleOption[] {
  return options.map((option) => ({ ...option }));
}

function safeGetItem(
  storage: AdminShellPreferencesStorage | null,
  key: string,
): string | null {
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(
  storage: AdminShellPreferencesStorage | null,
  key: string,
  value: string,
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, value);
  } catch {
    return;
  }
}

function safeRemoveItem(
  storage: AdminShellPreferencesStorage | null,
  key: string,
): void {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    return;
  }
}

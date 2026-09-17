import { z } from "@zod/mini";

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
/** `""` means "no preset picked yet" — resolution falls back to the polarity default. */
const DEFAULT_THEME_KEY = "";
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

/**
 * Mini-schema surface for normalization. Persisted values are `unknown`;
 * each field normalizes tolerantly (matching the previous
 * `catch(...).default(...)` pipeline) so one corrupt field never discards the
 * rest of the stored preferences.
 */
const themeModeSchema = z.enum(themeModeValues);
const fontSizeSchema = z.enum(fontSizeValues);
/**
 * Trims first, then requires a non-empty result — the mini equivalent of the
 * previous `preprocess(trim).pipe(z.string().min(1))`: `"  "` fails while
 * `" x "` becomes `"x"`.
 */
const trimmedNonEmptyStringSchema = z.string().check(z.trim(), z.minLength(1));
const localeOptionSchema = z.object({
  key: trimmedNonEmptyStringSchema,
  label: trimmedNonEmptyStringSchema,
});

/** The persisted field inventory (must match {@link persistAdminShellPreferences}). */
type PersistedShellPreferences = {
  themeMode: AdminThemeMode;
  themeKey: string;
  fontSize: AdminFontSize;
  locale: string;
  sidebarCollapsed: boolean;
};

/** Normalizes an unknown enum input to the documented polarity default. */
function parseThemeMode(input: unknown): AdminThemeMode {
  const parsed = themeModeSchema.safeParse(input);
  return parsed.success ? parsed.data : DEFAULT_THEME_MODE;
}

/** Normalizes an unknown enum input to the default size tier. */
function parseFontSize(input: unknown): AdminFontSize {
  const parsed = fontSizeSchema.safeParse(input);
  return parsed.success ? parsed.data : DEFAULT_FONT_SIZE;
}

/** Missing/corrupt themeKey collapses to `""` (no preset picked yet). */
function parseThemeKey(input: unknown): string {
  return typeof input === "string" ? input : DEFAULT_THEME_KEY;
}

/** Tolerant locale normalization: undefined and invalid values become undefined. */
function parseLocale(input: unknown): string | undefined {
  if (input === undefined) return undefined;
  const parsed = trimmedNonEmptyStringSchema.safeParse(input);
  return parsed.success ? parsed.data : undefined;
}

/** Filters storage locale options down to valid entries; non-arrays become `[]`. */
function parseLocaleOptions(input: unknown): AdminLocaleOption[] {
  if (!Array.isArray(input)) return [];
  const valid: AdminLocaleOption[] = [];
  for (const item of input) {
    const parsed = localeOptionSchema.safeParse(item);
    if (parsed.success) valid.push(parsed.data);
  }
  return valid;
}

/** Boolean preference values collapse to `false` unless exactly `true`/`false`. */
function parseBoolean(input: unknown): boolean {
  return typeof input === "boolean" ? input : false;
}

/** Restored locale must be a non-empty string (the strict persisted field). */
function parsePersistedLocale(input: unknown): string | null {
  const parsed = trimmedNonEmptyStringSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function createDefaultAdminShellPreferences(
  defaults?: Partial<AdminShellPreferences>,
): AdminShellPreferences {
  return normalizeShellPreferences({
    themeMode: DEFAULT_THEME_MODE,
    themeKey: DEFAULT_THEME_KEY,
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
    themeKey: preferences.themeKey,
    fontSize: preferences.fontSize,
    locale: preferences.locale,
    sidebarCollapsed: preferences.sidebarCollapsed,
  };

  safeSetItem(storage, STORAGE_KEY, JSON.stringify(persisted));
}

export function normalizeShellPreferences(
  input: Partial<AdminShellPreferences>,
): AdminShellPreferences {
  const themeMode = parseThemeMode(input.themeMode);
  const themeKey = parseThemeKey(input.themeKey);
  const fontSize = parseFontSize(input.fontSize);
  const availableLocales = parseLocaleOptions(input.availableLocales);
  const locale =
    parseLocale(input.locale) ?? availableLocales[0]?.key ?? DEFAULT_LOCALE;
  const sidebarCollapsed = parseBoolean(input.sidebarCollapsed);
  return {
    themeMode,
    themeKey,
    fontSize,
    locale,
    availableLocales,
    sidebarCollapsed,
  };
}

function parsePersistedShellPreferences(
  input: unknown,
): PersistedShellPreferences | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  const locale = parsePersistedLocale(record.locale);
  if (locale === null) {
    return null;
  }
  if (typeof record.sidebarCollapsed !== "boolean") {
    return null;
  }
  return {
    themeMode: parseThemeMode(record.themeMode),
    themeKey: parseThemeKey(record.themeKey),
    fontSize: parseFontSize(record.fontSize),
    locale,
    sidebarCollapsed: record.sidebarCollapsed,
  };
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

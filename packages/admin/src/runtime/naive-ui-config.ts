import {
  createLocale,
  darkTheme,
  dateEnUS,
  dateZhCN,
  enUS,
  type NDateLocale,
  zhCN,
  type GlobalComponentConfig,
  type GlobalTheme,
  type GlobalThemeOverrides,
  type NLocale,
} from "naive-ui";
import { toMerged } from "es-toolkit";
import {
  resolveThemeVarValue,
  type RegistryI18nOverrides,
} from "@noob-naive-ui/registry";

import type {
  AdminFontSize,
  AdminThemeMode,
  AdminThemePreset,
} from "../runtime-contract";
import type { AdminLocaleName } from "../i18n/admin-locale";

/**
 * NConfigProvider props derived from admin shell preferences.
 *
 * The store exposes this as a computed; hosts bind it directly:
 * `<n-config-provider v-bind="preferences.naiveUiConfig">`. It is derived
 * presentation state, never part of serialized preferences.
 */
export type AdminNaiveUiConfig = {
  /** Naive UI theme object, or null for the light theme. */
  theme: GlobalTheme | null;
  /** Bounded font-size overrides per font-size preference. */
  themeOverrides: GlobalThemeOverrides;
  /** Naive UI locale object, or null to keep the naive-ui default (enUS). */
  locale: NLocale | null;

  /** Naive UI date locale object, or null to keep the default */
  dateLocale: NDateLocale | null;

  /**
   * Per-component size tier applied through `n-config-provider`'s
   * `componentOptions`, derived from the font-size preference. naive-ui has
   * no single global size knob, so each supported component's `size` is set
   * to the matching tier.
   */
  componentOptions: GlobalComponentConfig;
};

type NaiveUiLocale = { nLocale: NLocale; nDateLocale: NDateLocale };

/** Maps each supported admin locale name to its naive-ui locale object. */
const NAIVE_UI_LOCALES: Record<AdminLocaleName, NaiveUiLocale> = {
  en: { nLocale: enUS, nDateLocale: dateEnUS },
  "zh-CN": { nLocale: zhCN, nDateLocale: dateZhCN },
};

/**
 * Host-supplied naive-ui locale override tree, derived from the registry's
 * `NaiveUiLocale` preseed (`locale` in `createLocale`'s `NPartialLocale`
 * override form, `dateLocale` the full `NDateLocale` pack). Hosts write it
 * under `AdminProvider.i18nOverrides["naive-ui"]`.
 */
export type NaiveUiLocaleOverrides = NonNullable<
  RegistryI18nOverrides["naive-ui"]
>;

/**
 * Merges host naive-ui locale overrides over the preference-resolved base
 * pack. The pack half uses naive-ui's own `createLocale` (lodash deep merge
 * of `NPartialLocale` over the base `NLocale` — naive-ui's official
 * partial-over-base seam); the date half has no naive-ui helper, so it is
 * deep-merged with es-toolkit `merge` (naive-ui accepts full packs only).
 *
 * @param base - The preference-resolved base packs.
 * @param overrides - The host's registry-supplied naive-ui locale override
 * tree, or undefined to keep the base packs untouched.
 * @returns The merged packs (complete, naive-ui-assignable).
 */
export function mergeAdminNaiveUiLocaleOverrides(
  base: { nLocale: NLocale; nDateLocale: NDateLocale },
  overrides: NaiveUiLocaleOverrides | undefined,
): { nLocale: NLocale; nDateLocale: NDateLocale } {
  return {
    nLocale: overrides?.locale
      ? createLocale(overrides.locale, base.nLocale)
      : base.nLocale,
    nDateLocale: overrides?.dateLocale
      ? toMerged(base.nDateLocale ?? {}, overrides.dateLocale ?? {})
      : base.nDateLocale,
  };
}

/**
 * Resolves the naive-ui locale object for an active locale, falling back to
 * the host-owned fallback locale when the active locale is unsupported.
 *
 * @param activeLocale - The current global Composer active locale.
 * @param fallbackLocale - The host-owned global fallback locale.
 * @returns The matching naive-ui locale, or null when neither is supported
 * (naive-ui then keeps its built-in enUS default).
 */
export function resolveAdminNaiveUiLocale(
  activeLocale: string,
  fallbackLocale: string,
): NaiveUiLocale | null {
  return (
    NAIVE_UI_LOCALES[activeLocale as AdminLocaleName] ??
    NAIVE_UI_LOCALES[fallbackLocale as AdminLocaleName] ??
    null
  );
}

/** Fixed font-size overrides matching each public font-size preference. */
export const FONT_SIZE_OVERRIDES: Record<AdminFontSize, GlobalThemeOverrides> =
  {
    small: {
      common: {
        fontSize: "13px",
        fontSizeMini: "12px",
        fontSizeTiny: "12px",
        fontSizeSmall: "13px",
        fontSizeMedium: "13px",
        fontSizeLarge: "14px",
        fontSizeHuge: "15px",
      },
      Typography: {
        pFontSize: "13px",
        headerFontSize1: "28px",
        headerFontSize2: "22px",
        headerFontSize3: "18px",
        headerFontSize4: "15px",
        headerFontSize5: "13px",
        headerFontSize6: "13px",
      },
      Flex: {
        gapMedium: "4px 8px",
      },
    },
    medium: {
      // Naive UI Defaults
      common: {
        fontSize: "14px",
        fontSizeMini: "12px",
        fontSizeTiny: "13px",
        fontSizeSmall: "14px",
        fontSizeMedium: "14px",
        fontSizeLarge: "15px",
        fontSizeHuge: "16px",
      },
      Typography: {
        pFontSize: "14px",
        headerFontSize1: "32px",
        headerFontSize2: "24px",
        headerFontSize3: "20px",
        headerFontSize4: "16px",
        headerFontSize5: "14px",
        headerFontSize6: "14px",
      },
      Flex: {
        gapMedium: "8px 12px",
      },
    },
    large: {
      common: {
        fontSize: "16px",
        fontSizeMini: "13px",
        fontSizeTiny: "14px",
        fontSizeSmall: "15px",
        fontSizeMedium: "16px",
        fontSizeLarge: "18px",
        fontSizeHuge: "20px",
      },
      Typography: {
        pFontSize: "16px",
        headerFontSize1: "38px",
        headerFontSize2: "28px",
        headerFontSize3: "24px",
        headerFontSize4: "20px",
        headerFontSize5: "16px",
        headerFontSize6: "16px",
      },
      Flex: {
        gapMedium: "12px 16px",
      },
    },
  };

/**
 * Builds the `componentOptions` value applying one naive-ui size tier to every
 * component that accepts a `size` option.
 *
 * @param tier - The naive-ui component-size tier to apply (one of the font-size
 * preference values).
 * @returns A `GlobalComponentConfig` whose supported components all use the
 * given tier.
 */
function buildComponentSizeOptions(tier: AdminFontSize): GlobalComponentConfig {
  return {
    AutoComplete: { size: tier },
    Button: { size: tier },
    Card: { size: tier },
    Cascader: { size: tier },
    Checkbox: { size: tier },
    ColorPicker: { size: tier },
    DataTable: { size: tier },
    DatePicker: { size: tier },
    Descriptions: { size: tier },
    Dropdown: { size: tier },
    DynamicTags: { size: tier },
    Form: { size: tier },
    Input: { size: tier },
    InputNumber: { size: tier },
    InputOtp: { size: tier },
    Mention: { size: tier },
    Pagination: { size: tier },
    Popselect: { size: tier },
    Radio: { size: tier },
    Rate: { size: tier },
    Result: { size: tier },
    Select: { size: tier },
    Skeleton: { size: tier },
    Space: { size: tier },
    // Flex: { size: tier },
    Switch: { size: tier },
    Table: { size: tier },
    Tabs: { size: tier },
    Tag: { size: tier },
    TimePicker: { size: tier },
    Transfer: { size: tier },
    TreeSelect: { size: tier },
  };
}

/**
 * Naive-ui per-component size options matching each public font-size
 * preference, for `n-config-provider`'s `componentOptions` prop.
 */
export const COMPONENT_SIZE_OPTIONS: Record<
  AdminFontSize,
  GlobalComponentConfig
> = {
  small: buildComponentSizeOptions("small"),
  medium: buildComponentSizeOptions("medium"),
  large: buildComponentSizeOptions("large"),
};

/**
 * Resolves the CSS base font size for a font-size preference.
 *
 * naive-ui sets `body { font-size: 14px }` statically (it is not driven by
 * `themeOverrides`), so naive-ui cannot scale plain HTML content itself. Hosts
 * apply this value to their root element (e.g. `document.documentElement`) so
 * `rem`-based content scales with the preference. It derives from the same
 * merged override tree as the naive-ui provider (see
 * {@link mergeAdminNaiveUiThemeOverrides}), so the preset's font config
 * (`fontSizeOverrides`, or font values set directly in `themeOverrides`)
 * overrides the built-in `FONT_SIZE_OVERRIDES` default tier; the 13/14/16px
 * mapping lives in one place.
 *
 * @param size - The active font-size preference tier.
 * @param preset - The active theme preset, or undefined when none applies.
 * @returns The matching CSS font-size, defaulting to 14px when absent.
 */
export function resolveAdminNaiveBaseFontSize(
  size: AdminFontSize,
  preset?: AdminThemePreset,
): string {
  return (
    mergeAdminNaiveUiThemeOverrides(size, preset).common?.fontSize ?? "14px"
  );
}

/**
 * Resolves the naive-ui theme object from the theme-mode preference and the
 * current system dark-mode signal.
 *
 * @param themeMode - The stored presentation mode.
 * @param systemUsesDark - Whether the host browser reports dark mode.
 * @returns The theme object for dark mode, or null for light mode.
 */
export function resolveDefaultNaiveUiTheme(
  themeMode: AdminThemeMode,
  systemUsesDark: boolean,
): GlobalTheme | null {
  if (themeMode === "dark") return darkTheme;
  if (themeMode === "system" && systemUsesDark) return darkTheme;
  return null;
}

/**
 * Recursively resolves size-keyed leaves (`ThemeVarValue`) in a naive-ui
 * override tree against the active font size, reusing the registry's leaf
 * resolver. Plain objects are walked; other values pass through untouched.
 * naivue-ui override sections nest plain objects, so a size-keyed value is
 * only ever a leaf (a `{ small, medium, large }` record).
 *
 * @param value - A naive-ui override tree (any depth).
 * @param size - The active font-size tier.
 * @returns The resolved tree with concrete string leaves.
 */
function resolveSizeKeyedThemeOverrides(
  value: unknown,
  size: AdminFontSize,
): unknown {
  const resolvedLeaf = resolveThemeVarValue(value, size);
  if (resolvedLeaf !== undefined) return resolvedLeaf;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const resolved: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      resolved[key] = resolveSizeKeyedThemeOverrides(child, size);
    }
    return resolved;
  }
  return value;
}

/**
 * Merges the active theme preset's overrides over the built-in font-size
 * default tier, so the preset's font config and colors apply together.
 *
 * naive-ui `GlobalThemeOverrides` nests component sections (`common`, per
 * component keys) with plain-object leaves, so a shallow spread would let the
 * preset's `common` block replace the font-size `common` block wholesale and
 * drop `fontSize`; es-toolkit `merge` deep-merges instead.
 *
 * `FONT_SIZE_OVERRIDES` is only the DEFAULT tier: the preset's own
 * `themeOverrides` slices — including size-keyed values
 * (`ThemeVarValue`, e.g. `common.fontSize: { small: "13px", medium: "14px",
 * large: "16px" }`) — are merged over it and then resolved against the active
 * size, so per-font-size naive-ui configuration lives in `themeOverrides`
 * like every other library's. The naive-ui and pro-naive-ui slices both carry
 * naive-ui override trees (pro-naive-ui forwards its themeOverrides to
 * naive-ui's NConfigProvider, so the two merge into the same naive-ui
 * provider's themeOverrides).
 *
 * @param size - Active font-size tier.
 * @param preset - The active theme preset, or undefined when none applies.
 * @returns Deep-merged, size-resolved `themeOverrides` for the naive-ui provider.
 */
export function mergeAdminNaiveUiThemeOverrides(
  size: AdminFontSize,
  preset: AdminThemePreset | undefined,
): GlobalThemeOverrides {
  if (!preset) return FONT_SIZE_OVERRIDES[size];
  const presetTheme = toMerged(
    preset.themeOverrides["naive-ui"] ?? {},
    preset.themeOverrides["pro-naive-ui"] ?? {},
  );
  const merged = toMerged(FONT_SIZE_OVERRIDES[size], presetTheme);
  return resolveSizeKeyedThemeOverrides(merged, size) as GlobalThemeOverrides;
}

/**
 * Resolves the active theme preset from the host-supplied presets, the
 * polarity defaults, and the stored mode/key.
 *
 * Precedence: (1) an explicitly picked preset (`themeKey`) matching the
 * effective polarity when the mode is `light`/`dark`; (2) the polarity
 * default (`defaultDarkTheme` when dark, else `defaultTheme`); (3) the first
 * preset of the effective polarity. When the mode is `"system"` the picked
 * `themeKey` is ignored so the OS-driven polarity default wins.
 *
 * @param themes - Host-supplied presets from the preferences store.
 * @param defaultTheme - Default light preset key (`"system"` mode + OS light).
 * @param defaultDarkTheme - Default dark preset key (`"system"` mode + OS dark).
 * @param themeMode - Stored light/dark/system mode.
 * @param themeKey - Stored last-picked preset key (`""` when none).
 * @param systemUsesDark - Whether the host browser reports dark mode.
 * @returns The matching preset, or undefined when no preset matches (the
 * caller then falls back to the theme-mode-driven base resolution).
 */
export function resolveThemePreset(
  themes: AdminThemePreset[],
  defaultTheme: string,
  defaultDarkTheme: string,
  themeMode: AdminThemeMode,
  themeKey: string,
  systemUsesDark: boolean,
): AdminThemePreset | undefined {
  const isDark =
    themeMode === "dark" || (themeMode === "system" && systemUsesDark);

  if (themeMode !== "system") {
    const picked = themes.find(
      (preset) => preset.key === themeKey && preset.isDark === isDark,
    );
    if (picked) return picked;
  }

  const defaultKey = isDark ? defaultDarkTheme : defaultTheme;
  if (defaultKey) {
    const byDefault = themes.find(
      (preset) => preset.key === defaultKey && preset.isDark === isDark,
    );
    if (byDefault) return byDefault;
  }

  return themes.find((preset) => preset.isDark === isDark);
}

import { computed, inject, type ComputedRef } from "vue";
import { libraryOverridesKey } from "./library-overrides-registry";
import type { LibraryOverridesRegistry } from "./library-overrides-registry";
import {
  DEFAULT_THEME_FONT_SIZE,
  themeFontSizeKey,
  type AdminFontSize,
} from "./theme-font-size";

/**
 * camelCase → kebab-case at the type level. Non-letter characters (digits,
 * hyphens) pass through without a separator.
 *
 * @example `"borderColor"` → `"border-color"`
 */
export type KebabCase<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Head extends Uppercase<Head>
    ? Head extends Lowercase<Head>
      ? `${Head}${KebabCase<Tail>}`
      : `-${Lowercase<Head>}${KebabCase<Tail>}`
    : `${Head}${KebabCase<Tail>}`
  : S;

/** Drops a leading hyphen produced for an uppercase initial (e.g. `"Card"`). */
type StripHyphen<S extends string> = S extends `-${infer Rest}` ? Rest : S;

/**
 * Converts one component's declared camelCase themeVar schema into its CSS
 * custom-property record: each key becomes
 * `--<library-prefix>-<component>-<kebab-case key>`. Components bind this
 * record directly (Vue style props accept CSS custom properties), and
 * {@link useTheme} returns the same converted shape — so declarations stay
 * ergonomic camelCase (the naive-ui convention, e.g. `{ borderColor: string }`)
 * while the emitted variables carry the library + component prefix.
 *
 * Every emitted value is a `string`: declared values may be size-keyed
 * (`ThemeVarValue`), but `useTheme` resolves them against the active font
 * size before binding.
 *
 * @typeParam LibraryPrefix - The library's CSS prefix segment (ui: `"noob-ui"`).
 * @typeParam Component - The component key (the theme schema's member).
 * @typeParam Vars - The declared camelCase themeVar schema.
 *
 * @example
 * `ThemeCssVarsFor<"noob-ui", "Card", { borderColor: string }>` →
 * `{ "--noob-ui-card-border-color": string }`
 */
export type ThemeCssVarsFor<
  LibraryPrefix extends string,
  Component extends string,
  Vars extends object,
> = {
  [K in keyof Vars as `--${LibraryPrefix}-${StripHyphen<KebabCase<Component>>}-${KebabCase<K & string>}`]: string;
};

/** The component-first themeVar schema declared by one registry library. */
type ThemeOf<LibraryId extends keyof LibraryOverridesRegistry> =
  LibraryOverridesRegistry[LibraryId]["theme"];

/** The converted `--…` record shape emitted by {@link useTheme}. */
type CssVarsOf<
  LibraryId extends keyof LibraryOverridesRegistry,
  ComponentId extends keyof ThemeOf<LibraryId> & string,
  CssPrefix extends string,
> = Partial<
  ThemeCssVarsFor<
    CssPrefix,
    ComponentId,
    ThemeOf<LibraryId>[ComponentId] & object
  >
>;

/**
 * camelCase → kebab-case at runtime, mirroring the type-level `KebabCase` +
 * `StripHyphen` (`"borderColor"` → `"border-color"`; `"Card"` → `"card"`).
 * Non-letter characters pass through, and an uppercase initial produces no
 * leading hyphen (matching the type's `StripHyphen` step).
 */
function kebabCase(value: string): string {
  return value
    .replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)
    .replace(/^-/, "");
}

/**
 * Resolves one themeVar value to its CSS string: plain strings pass through;
 * per-font-size records pick the active tier (falling back to the default
 * tier when the active one is absent). Malformed values are skipped.
 *
 * Exported so other resolvers (e.g. the admin's naive-ui theme merge) reuse
 * the same size-keyed semantics.
 *
 * @param value - The declared value (`ThemeVarValue` shape; runtime is loose).
 * @param fontSize - The active font-size tier, or undefined for the default.
 * @returns The resolved CSS value, or undefined when unresolvable.
 */
export function resolveThemeVarValue(
  value: unknown,
  fontSize: AdminFontSize | undefined,
): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Partial<Record<AdminFontSize, string>>;
    const tier = fontSize ?? DEFAULT_THEME_FONT_SIZE;
    const resolved =
      record[tier] ??
      (tier === DEFAULT_THEME_FONT_SIZE
        ? undefined
        : record[DEFAULT_THEME_FONT_SIZE]);
    return typeof resolved === "string" ? resolved : undefined;
  }
  return undefined;
}

/**
 * Options for {@link useTheme}.
 *
 * @typeParam LibraryId - The library's registry key; its declared `theme`
 * schema (component-first, camelCase vars) is derived from the registry
 * augmentation, so no per-library typing is needed here.
 * @typeParam ComponentId - One component key of the library's theme schema.
 * @typeParam CssPrefix - The library's CSS prefix segment used in the emitted
 * `--<prefix>-<component>-<var>` custom-property names.
 */
export interface UseThemeOptions<
  LibraryId extends keyof LibraryOverridesRegistry,
  ComponentId extends keyof ThemeOf<LibraryId> & string,
  CssPrefix extends string,
> {
  /** The library's registry key under which its theme slice lives. */
  libraryId: LibraryId;
  /** The library's CSS prefix segment (e.g. `"noob-ui"` → `--noob-ui-card-…`). */
  cssPrefix: CssPrefix;
  /** The component whose themeVars are requested. */
  componentId: ComponentId;
  /**
   * The component's declared camelCase defaults. They are converted alongside
   * overrides and merged underneath them (override wins per key), so a
   * provider-less consumer still receives its own defaults as CSS variables
   * (the return is then never `undefined`). Values may be size-keyed
   * (`ThemeVarValue`), resolved against the active font size.
   */
  defaults?: Partial<ThemeOf<LibraryId>[ComponentId] & object>;
}

/**
 * Reads one component's themeVar slice from the shared unified registry
 * (`libraryId` → `theme` → component) and converts it to CSS custom
 * properties: each declared camelCase key becomes
 * `--<cssPrefix>-<component-kebab>-<key-kebab>` (e.g. `borderColor` with
 * `cssPrefix: "noob-ui"` and `componentId: "Card"` →
 * `--noob-ui-card-border-color`).
 *
 * Size-keyed values (`string | Record<AdminFontSize, string>`) resolve against
 * the injected active font size (`themeFontSizeKey`, provided by the admin
 * package; default tier medium), so one override tree scales across font-size
 * preferences.
 *
 * Provider-less → `undefined` (the component falls back to its own defaults,
 * no throw), unless `defaults` is provided — then the defaults are converted
 * and merged first, with provider overrides layered on top, and the result is
 * never `undefined`. Unlike naive-ui's `useTheme`.
 *
 * The `as … | undefined` cast is the registry read boundary: `.theme` is
 * `unknown` (`LibraryOverridesRegistry` entry) and indexing `unknown` is a TS
 * error. It does NOT weaken camelCase typing — rejection of unknown names
 * lives at the host boundary (the library's `theme` override prop), and the
 * converted `--…` output type is derived from the declared schema.
 *
 * Reusable across every component package: ui wraps it as `useUiTheme`
 * (locked `libraryId` + `cssPrefix`); other packages wrap it the same way.
 *
 * @returns A computed of the component's CSS custom-property overrides, or
 * `undefined`.
 */
export function useTheme<
  LibraryId extends keyof LibraryOverridesRegistry,
  ComponentId extends keyof ThemeOf<LibraryId> & string,
  CssPrefix extends string,
>(
  options: UseThemeOptions<LibraryId, ComponentId, CssPrefix> & {
    defaults: Partial<ThemeOf<LibraryId>[ComponentId] & object>;
  },
): ComputedRef<CssVarsOf<LibraryId, ComponentId, CssPrefix>>;
export function useTheme<
  LibraryId extends keyof LibraryOverridesRegistry,
  ComponentId extends keyof ThemeOf<LibraryId> & string,
  CssPrefix extends string,
>(
  options: UseThemeOptions<LibraryId, ComponentId, CssPrefix>,
): ComputedRef<CssVarsOf<LibraryId, ComponentId, CssPrefix> | undefined>;
export function useTheme<
  LibraryId extends keyof LibraryOverridesRegistry,
  ComponentId extends keyof ThemeOf<LibraryId> & string,
  CssPrefix extends string,
>(
  options: UseThemeOptions<LibraryId, ComponentId, CssPrefix>,
): ComputedRef<CssVarsOf<LibraryId, ComponentId, CssPrefix> | undefined> {
  const registry = inject(libraryOverridesKey, null);
  // The active font-size tier (admin provides it); size-keyed values resolve
  // against it, defaulting to the medium tier when no provider is mounted.
  const fontSize = inject(themeFontSizeKey, null);
  return computed(() => {
    const cssVars: Record<string, string> = {};
    // Registry values are loose (unknown) at the provider boundary; cast the
    // library's theme tree once here, then index by component so the exact
    // camelCase var names survive for the conversion below (unknown names
    // were already rejected at the host override prop boundary). Defaults
    // (also camelCase) are merged first so provider overrides win per key.
    // Both may carry size-keyed values, resolved against the active tier.
    const add = (values: object | undefined) => {
      if (!values) return;
      for (const [name, value] of Object.entries(values)) {
        const resolved = resolveThemeVarValue(value, fontSize?.value);
        if (resolved !== undefined) {
          cssVars[
            `--${options.cssPrefix}-${kebabCase(options.componentId)}-${kebabCase(name)}`
          ] = resolved;
        }
      }
    };
    add(options.defaults);
    const theme = registry?.value?.[options.libraryId]?.theme as
      | Record<string, Record<string, unknown>>
      | undefined;
    add(theme?.[options.componentId]);
    if (Object.keys(cssVars).length === 0 && options.defaults === undefined) {
      return undefined;
    }
    // The runtime key build mirrors the type-level conversion exactly, so the
    // cast to the derived `--…` record is a boundary cast.
    return cssVars as CssVarsOf<LibraryId, ComponentId, CssPrefix>;
  });
}

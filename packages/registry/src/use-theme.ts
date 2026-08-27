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

export type ThemeCssVarsFor<
  LibraryPrefix extends string,
  Component extends string,
  Vars extends object,
> = {
  [K in keyof Vars as `--${LibraryPrefix}-${StripHyphen<KebabCase<Component>>}-${KebabCase<K & string>}`]: string;
};

export type ThemeOf<LibraryId extends keyof LibraryOverridesRegistry> =
  LibraryOverridesRegistry[LibraryId]["theme"];

export type CssVarsOf<
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

export function useCssVarsFor<
  const LibraryId extends keyof LibraryOverridesRegistry,
  const ComponentId extends keyof ThemeOf<LibraryId> & string,
  const CssPrefix extends string,
>(_libraryId: LibraryId, _componentId: ComponentId, _cssPrefix: CssPrefix) {
  type CssVars = CssVarsOf<LibraryId, ComponentId, CssPrefix>;
  return {
    $css: (key: keyof CssVars) => key,
    $var: (key: keyof CssVars) => `var(${String(key)})` as const,
    $tw: <
      const Tw extends string,
      const Hint extends string = "",
      const Suffix extends "" | "!" = "",
    >(
      class_: `${Tw}-(${Hint extends "" ? "" : `${Hint}:`}${keyof CssVars})${Suffix}`,
    ) => class_,
  };
}

function kebabCase(value: string): string {
  return value
    .replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)
    .replace(/^-/, "");
}

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

type DefaultsArg<LibraryId extends keyof LibraryOverridesRegistry, ComponentId extends keyof ThemeOf<LibraryId> & string> =
  | Partial<ThemeOf<LibraryId>[ComponentId] & object>
  | (() => Partial<ThemeOf<LibraryId>[ComponentId] & object>);

export interface UseThemeOptions<
  LibraryId extends keyof LibraryOverridesRegistry,
  ComponentId extends keyof ThemeOf<LibraryId> & string,
  CssPrefix extends string,
> {
  libraryId: LibraryId;
  cssPrefix: CssPrefix;
  componentId: ComponentId;
  /**
   * The component's declared camelCase defaults. May be a plain object or a
   * getter function — the getter is called inside the computed so reactive
   * sources read inside it (e.g. naive-ui `useThemeVars()`) trigger
   * re-evaluation when the theme changes.
   */
  defaults?: DefaultsArg<LibraryId, ComponentId>;
}

export function useTheme<
  LibraryId extends keyof LibraryOverridesRegistry,
  ComponentId extends keyof ThemeOf<LibraryId> & string,
  CssPrefix extends string,
>(
  options: UseThemeOptions<LibraryId, ComponentId, CssPrefix> & {
    defaults: DefaultsArg<LibraryId, ComponentId>;
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
  const fontSize = inject(themeFontSizeKey, null);
  return computed(() => {
    const cssVars: Record<string, string> = {};
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
    // Resolve defaults: call getter inside computed so reactive sources
    // (e.g. naive-ui useThemeVars()) trigger re-evaluation.
    const defaults = typeof options.defaults === "function"
      ? options.defaults()
      : options.defaults;
    add(defaults);
    const theme = registry?.value?.[options.libraryId]?.theme as
      | Record<string, Record<string, unknown>>
      | undefined;
    add(theme?.[options.componentId]);
    if (Object.keys(cssVars).length === 0 && defaults === undefined) {
      return undefined;
    }
    return cssVars as CssVarsOf<LibraryId, ComponentId, CssPrefix>;
  });
}

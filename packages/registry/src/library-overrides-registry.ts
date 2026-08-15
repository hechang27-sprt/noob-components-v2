import type { ComputedRef, InjectionKey } from "vue";
import type { GlobalThemeOverrides } from "naive-ui";
import type { NaiveUiLocale } from "./naive-ui-locale";
import type { LibraryThemeOverrides } from "./library-theme-overrides";

/**
 * Framework-wide override registry schema, shared by every component package
 * and unified across kinds (i18n messages, themeVars, …). Each `libraryId`
 * maps to an entry declaring that library's FULL locale and themeVar types;
 * the registry converts them to per-kind override types internally via the
 * derived projections (`RegistryI18nOverrides` = DeepPartial of `locale`,
 * `RegistryThemeOverrides` = per-component partial of `theme`).
 *
 * Known external libraries are preseeded here; a noob package declares its own
 * entry via module augmentation:
 * ```ts
 * declare module "@noob-naive-ui/registry" {
 *   interface LibraryOverridesRegistry {
 *     "noob-naive-ui:admin": {
 *       locale: Record<AdminLocaleName, AdminLocale>;
 *       theme: AdminThemeComponents;
 *     };
 *   }
 * }
 * ```
 *
 * naive-ui / pro-naive-ui declare their theme as `GlobalThemeOverrides` (the
 * override form, not a component-keyed schema): their theme does not convert
 * through `LibraryThemeOverrides` (naive-ui's override shape differs from a
 * per-component var map), so the preseed carries the already-override type and
 * the uniform conversion is a structural no-op for them. Their `locale` is the
 * composed `NaiveUiLocale` ({@link ./naive-ui-locale}) — the pack half in
 * `createLocale`'s `NPartialLocale` override form (same structural no-op
 * story), the date half the full `NDateLocale` pack. The derived
 * `RegistryI18nOverrides` projection is therefore the host's naive-ui locale
 * override tree, consumed by the admin's `naiveUiConfig` (`createLocale` for
 * the pack, `merge` for the date pack).
 *
 * Deliberately has NO string index signature: `keyof LibraryOverridesRegistry`
 * is exactly the known libraryIds, so the derived projections stay per-library
 * typed. Undeclared/3rd-party libraries are admitted at runtime via
 * {@link LibraryOverridesRegistryValue}'s loose index.
 */
export interface LibraryOverridesRegistry {
  "naive-ui": { locale: NaiveUiLocale; theme: GlobalThemeOverrides };
  "pro-naive-ui": { locale: NaiveUiLocale; theme: GlobalThemeOverrides };
}

/**
 * Recursively makes every leaf optional. Used internally to derive the i18n
 * override projection from a declared full locale type.
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * i18n projection of the registry: per-library locale override types. For a
 * declared `locale: Record<LocaleName, Locale>`, this is
 * `Partial<Record<LocaleName, DeepPartial<Locale>>>` — the library's i18n
 * override tree. Per-library derivation helpers (locale names, full schema,
 * admissible keys, the `NonNullable` tree) live in
 * `library-i18n-overrides.ts`.
 */
export type RegistryI18nOverrides = {
  [K in keyof LibraryOverridesRegistry]?: LibraryOverridesRegistry[K] extends {
    locale: infer Locale;
  }
    ? DeepPartial<Locale>
    : never;
};

/**
 * theme projection of the registry: per-library themeVar override types. For a
 * declared `theme: Components` (component-first schema), this is the
 * per-component partial override tree.
 */
export type RegistryThemeOverrides = {
  [K in keyof LibraryOverridesRegistry]?: LibraryOverridesRegistry[K] extends {
    theme: infer Theme;
  }
    ? LibraryThemeOverrides<Theme>
    : never;
};

/**
 * Runtime registry value under `libraryOverridesKey`: per-library
 * `{ i18n?, theme? }`, deliberately loose — per-package entry types are
 * re-validated at consumption (boundary casts) against the derived
 * projections, and undeclared libraries stay open via the string index.
 */
export type LibraryOverridesRegistryValue = {
  [libraryId: string]: { i18n?: unknown; theme?: unknown };
};

/**
 * The single injection key under which the override registry is provided.
 * Shared across all component packages; consumers look up their own
 * `libraryId` rather than injecting a per-package key. Providers supply a
 * `ComputedRef` (naive-ui's merged-overrides-ref pattern); consumers
 * `inject(key, null)` and read `.value` with optional chaining.
 */
export const libraryOverridesKey: InjectionKey<
  ComputedRef<LibraryOverridesRegistryValue>
> = Symbol("noob-naive-ui:overrides-registry");

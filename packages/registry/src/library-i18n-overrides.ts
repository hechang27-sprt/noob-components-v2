import type { LibraryOverridesRegistry } from "./library-overrides-registry";

/**
 * i18n-side derivations of the framework-wide override registry, mirroring
 * `library-theme-overrides.ts` for the theme side. A component package
 * declares its FULL locale schema via module augmentation
 * (`locale: Record<LocaleName, Locale>` in `LibraryOverridesRegistry`); these
 * helpers derive the per-library locale names, the component-first full
 * locale schema, and the set of libraries with a usable locale schema from
 * that one declaration — so the schema is
 * never declared a second time in a descriptor or an override alias.
 */

/**
 * Locale-name union declared by one library's registry entry
 * (e.g. `"en" | "zh-CN"`).
 *
 * @typeParam K - One declared library key of `LibraryOverridesRegistry`.
 */
export type RegistryLocaleName<K extends keyof LibraryOverridesRegistry> =
  keyof LibraryOverridesRegistry[K]["locale"];

/**
 * The library's component-first full locale schema — the value type of the
 * declared `locale` record (`Record<LocaleName, Locale>` → `Locale`).
 *
 * @typeParam K - One declared library key of `LibraryOverridesRegistry`.
 */
export type RegistryLocale<K extends keyof LibraryOverridesRegistry> =
  LibraryOverridesRegistry[K]["locale"][RegistryLocaleName<K>];

/**
 * LibraryIds that declare a usable (non-empty) locale schema. Preseeded
 * `naive-ui` / `pro-naive-ui` (`locale: unknown` → `keyof unknown` is `never`)
 * are excluded, so `createComponentI18n`-style consumers only admit libraries
 * whose augmentation carries a real locale record.
 */
export type RegistryI18nLibraryKey = {
  [K in keyof LibraryOverridesRegistry]: RegistryLocaleName<K> extends never
    ? never
    : K;
}[keyof LibraryOverridesRegistry];

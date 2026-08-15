import type { RegistryI18nOverrides } from "@noob-naive-ui/registry";

/** Supported packaged locale identifiers for ui package components. */
export type NoobUiLocaleName = "en" | "zh-CN";

/**
 * Stable component identifiers addressable by ui package overrides.
 *
 * Empty today: the ui package ships no translatable text yet. Extend this
 * union when the first translating component lands; the locale-first
 * resources then live under `src/locales/<ComponentName>.json` and are
 * precompiled by the shared workspace preset.
 */
export type NoobUiComponentId = never;

/**
 * The ui package's stable library key under which hosts provide ui overrides
 * in the shared override registry. The `LibraryOverridesRegistry` module
 * augmentation declares the FULL ui locale schema, so `createComponentI18n`
 * derives it from this key alone — there is no separate descriptor handle.
 */
export const noobUiI18n = "noob-naive-ui:ui" as const;

/** The ui package's immutable, application-scoped override snapshot. */
export type NoobUiI18nSnapshot = NonNullable<
  RegistryI18nOverrides["noob-naive-ui:ui"]
>;

/**
 * The ui library's full per-locale message schema. No components translate
 * yet, so the schema is empty; extend it as translating components land.
 */
export type NoobUiLocale = Record<never, never>;

/**
 * Locale-keyed, component-addressable partial override tree accepted by the
 * ui package. With no components registered yet, hosts can only supply empty
 * per-locale slices; the seam ships ahead of the first translating component.
 * Derived from the framework-wide registry (the ui augmentation), so the
 * partial-tree machinery lives in exactly one place.
 */
export type NoobUiLocaleOverrides = NonNullable<
  RegistryI18nOverrides["noob-naive-ui:ui"]
>;

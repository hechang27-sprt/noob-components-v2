import type {
  LibraryI18nDescriptor,
  LibraryI18nOverrides,
  LibraryI18nSnapshot,
} from "@noob-naive-ui/i18n";

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
 * The ui package's i18n descriptor, produced by the shared factory. The
 * factory owns the injection key, the empty snapshot, and the generic
 * component slice selector; this module only pins the ui locale schema
 * (empty component set today).
 */
export const noobUiI18n: LibraryI18nDescriptor<
  NoobUiLocaleName,
  Record<never, never>
> = {
  libraryId: "noob-naive-ui:ui",
};

/** The ui package's immutable, application-scoped override snapshot. */
export type NoobUiI18nSnapshot = LibraryI18nSnapshot<
  NoobUiLocaleName,
  Record<never, never>
>;

/**
 * The ui library's full per-locale message schema. No components translate
 * yet, so the schema is empty; extend it as translating components land.
 */
export type NoobUiLocale = Record<never, never>;

/**
 * Locale-keyed, component-addressable partial override tree accepted by the
 * ui package descriptor. With no components registered yet, hosts can only
 * supply empty per-locale slices; the seam ships ahead of the first
 * translating component.
 */
export type NoobUiLocaleOverrides = LibraryI18nOverrides<
  NoobUiLocaleName,
  NoobUiLocale
>;

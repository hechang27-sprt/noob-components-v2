import {
  createLibraryI18nPlugin,
  type LibraryI18nOverrides,
  type LibraryI18nPluginOptions,
  type LibraryI18nSnapshot,
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
 * The ui package's i18n plugin descriptor, produced by the shared factory.
 * The factory owns the plugin transport, the injection key, the empty
 * snapshot, and the generic component slice selector; this module only pins
 * the ui locale schema (empty component set today).
 */
export const noobUiI18n = createLibraryI18nPlugin<
  NoobUiLocaleName,
  Record<never, never>
>({
  libraryId: "noob-naive-ui:ui",
});

/**
 * Provides an immutable, application-scoped startup snapshot of ui package
 * i18n message overrides. It never creates an i18n instance and never
 * registers global messages. Caller options are defensively copied at
 * installation time, so mutating the caller's objects after `app.use` cannot
 * affect current or future mounts.
 *
 * @param app - The Vue application receiving the override snapshot.
 * @param options - Message override configuration; locale and fallback locale
 * are owned by the host global Composer and are not accepted here.
 */
export const noobUiI18nPlugin = noobUiI18n.plugin;

/** The ui package's immutable, application-scoped override snapshot. */
export type NoobUiI18nSnapshot = LibraryI18nSnapshot<
  NoobUiLocaleName,
  Record<never, never>
>;

/** Plugin options; only message overrides are configurable. */
export type NoobUiI18nPluginOptions = LibraryI18nPluginOptions<
  NoobUiLocaleName,
  Record<never, never>
>;

/**
 * Locale-keyed, component-addressable partial override tree accepted by the
 * ui package plugin. With no components registered yet, hosts can only supply
 * empty per-locale slices; the transport ships ahead of the first component.
 */
export type NoobUiLocaleOverrides = LibraryI18nOverrides<
  NoobUiLocaleName,
  Record<never, never>
>;

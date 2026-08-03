import type { App, InjectionKey } from "vue";

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
 * Locale-keyed, component-addressable partial override tree accepted by the
 * ui package plugin. With no components registered yet, hosts can only supply
 * empty per-locale slices; the transport ships ahead of the first component.
 */
export type NoobUiLocaleOverrides = Partial<
  Record<NoobUiLocaleName, Partial<Record<NoobUiComponentId, never>>>
>;

/**
 * Plugin options. Only message overrides are configurable; the host global
 * Composer remains the sole locale and fallback-locale authority.
 */
export interface NoobUiI18nPluginOptions {
  /** Per-locale, per-component message overrides captured as a startup snapshot. */
  messages?: NoobUiLocaleOverrides;
}

/**
 * Immutable, application-scoped startup snapshot provided by the plugin.
 * Carries only message overrides; locale and fallback authority stay with the
 * host global Composer.
 */
export type NoobUiI18nSnapshot = {
  messages: NoobUiLocaleOverrides;
};

export const noobUiI18nOverridesKey: InjectionKey<NoobUiI18nSnapshot> = Symbol(
  "noob-naive-ui:ui-i18n-overrides",
);

export const DEFAULT_SNAPSHOT: Readonly<NoobUiI18nSnapshot> = Object.freeze({
  messages: {},
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
export function noobUiI18nPlugin(
  app: App,
  options: NoobUiI18nPluginOptions = {},
): void {
  const messages =
    options.messages === undefined ? {} : structuredClone(options.messages);
  app.provide(noobUiI18nOverridesKey, { messages });
}

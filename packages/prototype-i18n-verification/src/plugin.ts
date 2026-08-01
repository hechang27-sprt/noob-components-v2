import type { App, InjectionKey } from "vue";

/** Locales with packaged PrototypeCard defaults. */
export type PrototypeLocale = "en" | "zh-CN";

/** Stable component identifiers addressable by prototype overrides. */
export type PrototypeComponentId = "PrototypeCard";

/** The complete PrototypeCard message schema retained in self-contained declarations. */
export type PrototypeCardMessages = {
  title: string;
  description: string;
};

/** A partial, per-locale override slice for PrototypeCard messages. */
export type PrototypeCardLocaleOverrides = DeepPartial<PrototypeCardMessages>;

/**
 * Locale-keyed, component-addressable override tree accepted by the plugin.
 *
 * Example: `{ en: { PrototypeCard: { title: "..." } } }`.
 */
export type PrototypeLocaleOverrides = Partial<
  Record<
    PrototypeLocale,
    Partial<Record<PrototypeComponentId, PrototypeCardLocaleOverrides>>
  >
>;

/** Plugin options. All fields optional; the fallback locale defaults to `en`. */
export interface PrototypeI18nPluginOptions {
  /** Locale used when the active locale has no packaged messages. */
  fallbackLocale?: string;
  /** Per-locale, per-component message overrides captured as a startup snapshot. */
  messages?: PrototypeLocaleOverrides;
}

/** Immutable, application-scoped startup snapshot provided by the plugin. */
export type PrototypeI18nSnapshot = {
  fallbackLocale: string;
  messages: PrototypeLocaleOverrides;
};

export const DEFAULT_FALLBACK_LOCALE = "en";

export const prototypeI18nOverridesKey: InjectionKey<PrototypeI18nSnapshot> =
  Symbol("noob-naive-ui:prototype-i18n-overrides");

export const DEFAULT_SNAPSHOT: Readonly<PrototypeI18nSnapshot> = Object.freeze({
  fallbackLocale: DEFAULT_FALLBACK_LOCALE,
  messages: {},
});

/**
 * Provides an immutable, application-scoped startup snapshot of prototype
 * i18n configuration. It never creates an i18n instance and never registers
 * global messages. Caller options are defensively copied at installation time,
 * so mutating the caller's objects after `app.use` cannot affect current or
 * future mounts.
 */
export function prototypeI18nPlugin(
  app: App,
  options: PrototypeI18nPluginOptions = {},
): void {
  app.provide(prototypeI18nOverridesKey, snapshotPrototypeI18nOptions(options));
}

/** Selects the override slice for one component from a provided snapshot. */
export function selectComponentOverrides(
  snapshot: PrototypeI18nSnapshot,
  componentId: PrototypeComponentId,
): Partial<Record<PrototypeLocale, PrototypeCardLocaleOverrides>> {
  const selected: Partial<
    Record<PrototypeLocale, PrototypeCardLocaleOverrides>
  > = {};
  for (const [locale, components] of Object.entries(snapshot.messages)) {
    const slice = components?.[componentId];
    if (slice !== undefined) {
      selected[locale as PrototypeLocale] = slice;
    }
  }
  return selected;
}

function snapshotPrototypeI18nOptions(
  options: PrototypeI18nPluginOptions,
): PrototypeI18nSnapshot {
  const fallbackLocale =
    typeof options.fallbackLocale === "string" &&
    options.fallbackLocale.length > 0
      ? options.fallbackLocale
      : DEFAULT_FALLBACK_LOCALE;
  const messages =
    options.messages === undefined ? {} : structuredClone(options.messages);
  return { fallbackLocale, messages };
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown>
    ? DeepPartial<T[K]>
    : T[K];
};

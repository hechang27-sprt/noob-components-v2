import { objectEntries } from "tsafe/objectEntries";
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

/**
 * Plugin options. Only message overrides are configurable; the host global
 * Composer remains the sole locale and fallback-locale authority.
 */
export interface PrototypeI18nPluginOptions {
  /** Per-locale, per-component message overrides captured as a startup snapshot. */
  messages?: PrototypeLocaleOverrides;
}

/**
 * Immutable, application-scoped startup snapshot provided by the plugin.
 * Carries only message overrides; locale and fallback authority stay with the
 * host global Composer.
 */
export type PrototypeI18nSnapshot = {
  messages: PrototypeLocaleOverrides;
};

export const prototypeI18nOverridesKey: InjectionKey<PrototypeI18nSnapshot> =
  Symbol("noob-naive-ui:prototype-i18n-overrides");

export const DEFAULT_SNAPSHOT: Readonly<PrototypeI18nSnapshot> = Object.freeze({
  messages: {},
});

/**
 * Provides an immutable, application-scoped startup snapshot of prototype
 * i18n message overrides. It never creates an i18n instance and never
 * registers global messages. Caller options are defensively copied at
 * installation time, so mutating the caller's objects after `app.use` cannot
 * affect current or future mounts.
 *
 * @param app - The Vue application receiving the override snapshot.
 * @param options - Message override configuration; locale and fallback locale
 * are owned by the host global Composer and are not accepted here.
 */
export function prototypeI18nPlugin(
  app: App,
  options: PrototypeI18nPluginOptions = {},
): void {
  app.provide(prototypeI18nOverridesKey, snapshotPrototypeI18nOptions(options));
}

/**
 * Selects the override slice for one component from a message tree.
 * Only locales that actually carry a slice for the component are returned,
 * so absent locale keys never yield undefined override entries.
 *
 * @param messages - The plugin message override tree.
 * @param componentId - Stable component identifier to select.
 * @returns The per-locale override slices present for the component.
 */
export function selectComponentOverrides(
  messages: PrototypeLocaleOverrides,
  componentId: PrototypeComponentId,
): Partial<Record<PrototypeLocale, PrototypeCardLocaleOverrides>> {
  const selected: Partial<
    Record<PrototypeLocale, PrototypeCardLocaleOverrides>
  > = {};
  for (const [locale, components] of objectEntries(messages)) {
    const slice = components?.[componentId];
    if (slice !== undefined) {
      selected[locale] = slice;
    }
  }
  return selected;
}

/**
 * Defensively copies caller options into the immutable startup snapshot.
 * Only the message tree is retained; structured cloning keeps later caller
 * mutation from leaking into mounted or future components.
 *
 * @param options - Raw plugin options supplied at installation.
 * @returns The frozen-in-effect snapshot provided to components.
 */
function snapshotPrototypeI18nOptions(
  options: PrototypeI18nPluginOptions,
): PrototypeI18nSnapshot {
  const messages =
    options.messages === undefined ? {} : structuredClone(options.messages);
  return { messages };
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown>
    ? DeepPartial<T[K]>
    : T[K];
};

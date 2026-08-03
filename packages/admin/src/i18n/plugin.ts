import { objectEntries } from "tsafe/objectEntries";
import type { App, InjectionKey } from "vue";

import type {
  AdminComponentId,
  AdminLocale,
  AdminLocaleName,
  AdminLocaleOverrides,
  AdminLoginPageLocale,
  AdminShellLocale,
} from "./admin-locale";

/**
 * Plugin options. Only message overrides are configurable; the host global
 * Composer remains the sole locale and fallback-locale authority.
 */
export interface AdminI18nPluginOptions {
  /** Per-locale, per-component message overrides captured as a startup snapshot. */
  messages?: AdminLocaleOverrides;
}

/**
 * Immutable, application-scoped startup snapshot provided by the plugin.
 * Carries only message overrides; locale and fallback authority stay with the
 * host global Composer.
 */
export type AdminI18nSnapshot = {
  messages: AdminLocaleOverrides;
};

export const adminI18nOverridesKey: InjectionKey<AdminI18nSnapshot> = Symbol(
  "noob-naive-ui:admin-i18n-overrides",
);

export const DEFAULT_SNAPSHOT: Readonly<AdminI18nSnapshot> = Object.freeze({
  messages: {},
});

/**
 * Provides an immutable, application-scoped startup snapshot of admin package
 * i18n message overrides. It never creates an i18n instance and never
 * registers global messages. Caller options are defensively copied at
 * installation time, so mutating the caller's objects after `app.use` cannot
 * affect current or future mounts.
 *
 * @param app - The Vue application receiving the override snapshot.
 * @param options - Message override configuration; locale and fallback locale
 * are owned by the host global Composer and are not accepted here.
 */
export function adminI18nPlugin(
  app: App,
  options: AdminI18nPluginOptions = {},
): void {
  app.provide(adminI18nOverridesKey, snapshotAdminI18nOptions(options));
}

/**
 * Selects the AdminShell override slice from a message tree. Only locales
 * that actually carry a slice are returned, so absent locale keys never yield
 * undefined override entries.
 *
 * @param messages - The plugin message override tree.
 * @returns The per-locale AdminShell override slices present.
 */
export function selectAdminShellOverrides(
  messages: AdminLocaleOverrides,
): Partial<Record<AdminLocaleName, DeepPartial<AdminShellLocale>>> {
  return selectComponentOverrides(messages, "AdminShell");
}

/**
 * Selects the AdminLoginPage override slice from a message tree. Only locales
 * that actually carry a slice are returned, so absent locale keys never yield
 * undefined override entries.
 *
 * @param messages - The plugin message override tree.
 * @returns The per-locale AdminLoginPage override slices present.
 */
export function selectAdminLoginPageOverrides(
  messages: AdminLocaleOverrides,
): Partial<Record<AdminLocaleName, DeepPartial<AdminLoginPageLocale>>> {
  return selectComponentOverrides(messages, "AdminLoginPage");
}

/**
 * Defensively copies caller options into the immutable startup snapshot.
 * Only the message tree is retained; structured cloning keeps later caller
 * mutation from leaking into mounted or future components.
 *
 * @param options - Raw plugin options supplied at installation.
 * @returns The frozen-in-effect snapshot provided to components.
 */
function snapshotAdminI18nOptions(
  options: AdminI18nPluginOptions,
): AdminI18nSnapshot {
  const messages =
    options.messages === undefined ? {} : structuredClone(options.messages);
  return { messages };
}

/**
 * Selects the override slice for one component from a message tree.
 *
 * @param messages - The plugin message override tree.
 * @param componentId - Stable component identifier to select.
 * @returns The per-locale override slices present for the component.
 */
function selectComponentOverrides<Id extends AdminComponentId>(
  messages: AdminLocaleOverrides,
  componentId: Id,
): Partial<Record<AdminLocaleName, DeepPartial<AdminLocale[Id]>>> {
  const selected: Partial<
    Record<AdminLocaleName, DeepPartial<AdminLocale[Id]>>
  > = {};
  for (const [locale, components] of objectEntries(messages)) {
    const slice = components?.[componentId];
    if (slice !== undefined) {
      selected[locale] = slice;
    }
  }
  return selected;
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown>
    ? DeepPartial<T[K]>
    : T[K];
};

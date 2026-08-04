import {
  createLibraryI18nPlugin,
  type LibraryI18nPluginOptions,
  type LibraryI18nSnapshot,
} from "@noob-naive-ui/i18n";

import type { AdminLocale, AdminLocaleName } from "./admin-locale";

/**
 * The admin package's i18n plugin descriptor, produced by the shared
 * factory. The factory owns the plugin transport, the injection key, the
 * empty snapshot, and the generic component slice selector; this module
 * only pins the admin locale schema.
 */
export const adminI18n = createLibraryI18nPlugin<AdminLocaleName, AdminLocale>({
  libraryId: "noob-naive-ui:admin",
});

/**
 * Provides an immutable, application-scoped startup snapshot of admin
 * package i18n message overrides. It never creates an i18n instance and
 * never registers global messages. Caller options are defensively copied at
 * installation time, so mutating the caller's objects after `app.use` cannot
 * affect current or future mounts.
 *
 * @param app - The Vue application receiving the override snapshot.
 * @param options - Message override configuration; locale and fallback locale
 * are owned by the host global Composer and are not accepted here.
 */
export const adminI18nPlugin = adminI18n.plugin;

/** Injection key of the admin package's app-scoped override snapshot. */
export const adminI18nOverridesKey = adminI18n.overridesKey;

/** Frozen empty override snapshot used when the plugin is not installed. */
export const DEFAULT_SNAPSHOT = adminI18n.emptySnapshot;

/** The admin package's immutable, application-scoped override snapshot. */
export type AdminI18nSnapshot = LibraryI18nSnapshot<
  AdminLocaleName,
  AdminLocale
>;

/** Plugin options; only message overrides are configurable. */
export type AdminI18nPluginOptions = LibraryI18nPluginOptions<
  AdminLocaleName,
  AdminLocale
>;

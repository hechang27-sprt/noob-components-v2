import {
  createLibraryI18nDescriptor,
  type LibraryI18nSnapshot,
} from "@noob-naive-ui/i18n";

import type { AdminLocale, AdminLocaleName } from "./admin-locale";

/**
 * The admin package's i18n descriptor, produced by the shared factory. The
 * factory owns the injection key, the empty snapshot, and the generic
 * component slice selector; this module only pins the admin locale schema.
 */
export const adminI18n = createLibraryI18nDescriptor<
  AdminLocaleName,
  AdminLocale
>({
  libraryId: "noob-naive-ui:admin",
});

/** Injection key of the admin package's app-scoped override snapshot. */
export const adminI18nOverridesKey = adminI18n.overridesKey;

/** Frozen empty override snapshot used when no overrides are provided. */
export const DEFAULT_SNAPSHOT = adminI18n.emptySnapshot;

/** The admin package's immutable, application-scoped override snapshot. */
export type AdminI18nSnapshot = LibraryI18nSnapshot<
  AdminLocaleName,
  AdminLocale
>;

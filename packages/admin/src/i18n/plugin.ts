import type {
  LibraryI18nDescriptor,
  LibraryI18nSnapshot,
} from "@noob-naive-ui/i18n";

import type { AdminLocale, AdminLocaleName } from "./admin-locale";

/**
 * The admin package's typed i18n handle. The runtime value is the stable
 * `libraryId` under which hosts provide admin overrides in the shared
 * registry (via the `AdminProvider` `overrides` prop); the generic parameters
 * pin the admin locale schema for `createComponentI18n`.
 */
export const adminI18n: LibraryI18nDescriptor<AdminLocaleName, AdminLocale> = {
  libraryId: "noob-naive-ui:admin",
};

/** The admin package's immutable, application-scoped override snapshot. */
export type AdminI18nSnapshot = LibraryI18nSnapshot<
  AdminLocaleName,
  AdminLocale
>;

import type { LibraryI18nOverrides } from "@noob-naive-ui/i18n";
import type { LocaleFileMap } from "../locales/locale-types.generated";

/**
 * Public locale typing for the admin package.
 *
 * Message-shape types are generated from the locale-first JSON resources in
 * `src/locales/<ComponentName>.json` by the shared
 * `tooling/vite/json-locale-types` plugin (`src/locales/
 * locale-types.generated.ts`), so the packaged messages and the public
 * override contract cannot drift. The generated module lives under `src/`,
 * so the declaration build emits a sibling `dist/locales/
 * locale-types.generated.d.ts` and exported types stay resolvable for
 * consumers (no JSON references in the published declarations).
 */

/** Supported packaged locale identifiers for admin components. */
export type AdminLocaleName = "en" | "zh-CN";

/** Stable component identifiers addressable by admin package overrides. */
export type AdminComponentId = "AdminShell" | "AdminLoginPage";

/** The complete AdminShell message schema (en subtree of the resource). */
export type AdminShellLocale = LocaleFileMap["AdminShell"]["en"];

/** The complete AdminLoginPage message schema (en subtree of the resource). */
export type AdminLoginPageLocale = LocaleFileMap["AdminLoginPage"]["en"];

/** The complete admin package message schema keyed by component. */
export interface AdminLocale {
  AdminShell: AdminShellLocale;
  AdminLoginPage: AdminLoginPageLocale;
}

/**
 * Locale-keyed, component-addressable partial override tree accepted by the
 * admin package plugin. Every level is optional so hosts override only the
 * message leaves they own. Derived from the shared override type so the
 * partial-tree machinery lives in exactly one place.
 */
export type AdminLocaleOverrides = LibraryI18nOverrides<
  AdminLocaleName,
  AdminLocale
>;

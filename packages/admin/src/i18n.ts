import type { RegistryI18nOverrides } from "@noob-naive-ui/registry";
import type { LocaleFileMap } from "./locales/locale-types.generated";

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
 * message leaves they own. Derived from the framework-wide registry (the
 * admin `LibraryOverridesRegistry` augmentation declares the FULL locale
 * schema; this is its i18n override projection), so the partial-tree
 * machinery lives in exactly one place.
 */
export type AdminLocaleOverrides = NonNullable<
  RegistryI18nOverrides["noob-naive-ui:admin"]
>;

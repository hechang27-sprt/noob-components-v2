/**
 * Public locale typing for the admin package.
 *
 * Explicit self-contained interfaces mirror the locale-first JSON resources in
 * `src/locales/<ComponentName>.json`. They are intentionally not derived from
 * `typeof` the JSON imports: the dist-only declaration build does not emit
 * imported JSON resources, so exported types must stand alone.
 */

/** Supported packaged locale identifiers for admin components. */
export type AdminLocaleName = "en" | "zh-CN";

/** Stable component identifiers addressable by admin package overrides. */
export type AdminComponentId = "AdminShell" | "AdminLoginPage";

/** The complete AdminShell message schema. */
export interface AdminShellLocale {
  account: { signOut: string };
  fontSize: { small: string; medium: string; large: string };
  aria: {
    fontSize: string;
    language: string;
    account: string;
    themeLight: string;
    themeDark: string;
    sidebarExpand: string;
    sidebarCollapse: string;
  };
  tabs: { openPages: string };
  errors: { unableToNavigate: string; unableToCloseTab: string };
  signedIn: string;
}

/** The complete AdminLoginPage message schema. */
export interface AdminLoginPageLocale {
  loading: { title: string; description: string };
  alreadySignedIn: { title: string; signedInAs: string; generic: string };
  status: {
    expired: string;
    forbidden: string;
    signedOut: string;
    unknown: string;
  };
  form: {
    signIn: string;
    username: string;
    password: string;
    rememberMe: string;
    signingIn: string;
  };
}

/** The complete admin package message schema keyed by component. */
export interface AdminLocale {
  AdminShell: AdminShellLocale;
  AdminLoginPage: AdminLoginPageLocale;
}

/**
 * Locale-keyed, component-addressable partial override tree accepted by the
 * admin package plugin. Every level is optional so hosts override only the
 * message leaves they own.
 */
export type AdminLocaleOverrides = Partial<
  Record<AdminLocaleName, DeepPartial<AdminLocale>>
>;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

import "./style.css";

export type {
  AdminAuthIdentity,
  AdminAuthRestoreResult,
  AdminAuthStatus,
  AdminFontSize,
  AdminLocaleOption,
  AdminLoginValues,
  AdminMenuTree,
  AdminRouteKey,
  AdminShellPreferences,
  AdminThemeMode,
} from "./runtime-contract";

export { useAdminAuthStore } from "./stores/auth";
export type { AdminAuthStore, AdminAuthStoreConfig } from "./stores/auth";

export { useAdminShellPreferencesStore } from "./stores/shell-preferences";
export { useAdminShellMenuStore } from "./stores/menu";

export { useAdminShellNavigationStore } from "./stores/navigation";

export { adminI18nPlugin } from "./i18n/plugin";
export type {
  AdminComponentId,
  AdminLocale,
  AdminLocaleName,
  AdminLocaleOverrides,
  AdminLoginPageLocale,
  AdminShellLocale,
} from "./i18n/admin-locale";
export type { AdminI18nPluginOptions, AdminI18nSnapshot } from "./i18n/plugin";

export { resolveAdminNaiveUiLocale } from "./runtime/naive-ui-config";
export type { AdminNaiveUiConfig } from "./runtime/naive-ui-config";

export {
  AdminLoginPage,
  type AdminLoginPageProps,
} from "./components/admin-login-page";

export {
  AdminShell,
  type AdminShellContext,
  type AdminShellDestination,
  type AdminShellNavigate,
  type AdminShellNavigation,
  type AdminShellNavigationRequest,
  type AdminShellNavigationResult,
  type AdminShellTab,
  type AdminShellTabCandidate,
  type AdminShellTabDescriptor,
  type AdminShellTabNavigationDecision,
  type AdminShellTabNavigationResolver,
  useAdminShell,
} from "./components/admin-shell";

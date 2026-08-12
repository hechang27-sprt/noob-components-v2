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

export { useAdminShellNavigationStore } from "./stores/navigation";

export { useAdminProvider, type AdminProviderApi } from "./use-admin-provider";

export type {
  AdminComponentId,
  AdminLocale,
  AdminLocaleName,
  AdminLocaleOverrides,
  AdminLoginPageLocale,
  AdminShellLocale,
} from "./i18n/admin-locale";
export type { AdminI18nSnapshot } from "./i18n/plugin";

export {
  resolveAdminNaiveBaseFontSize,
  resolveAdminNaiveUiLocale,
} from "./runtime/naive-ui-config";
export type { AdminNaiveUiConfig } from "./runtime/naive-ui-config";

export {
  AdminLoginPage,
  type AdminLoginPageProps,
} from "./components/admin-login-page";

export {
  AdminProvider,
  type AdminProviderProps,
} from "./components/admin-provider";

export {
  AdminShell,
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
} from "./components/admin-shell";
export {
  type AdminShellContext,
  useAdminShell,
} from "./components/use-admin-shell";

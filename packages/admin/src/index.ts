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
  AdminThemePreset,
} from "./runtime-contract";

export { useAdminAuthStore } from "./stores/auth";
export type { AdminAuthStore, AdminAuthStoreConfig } from "./stores/auth";

export { useAdminShellNavigationStore } from "./stores/navigation";

export { useAdminProvider, type AdminProviderApi } from "./use-admin-provider";

export type {
  AdminLocale,
  AdminLocaleName,
  AdminLocaleOverrides,
  AdminLoginPageLocale,
  AdminShellLocale,
} from "./i18n";

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
  AdminConfigProvider,
  type AdminConfigProviderProps,
} from "./components/admin-config-provider";

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

export * from "./registry";
export * from "./components/hmr-test";

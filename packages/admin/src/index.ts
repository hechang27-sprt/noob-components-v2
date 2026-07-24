import "./style.css";

export type {
  AdminAuthIdentity,
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
export type { AdminAuthStoreConfig } from "./stores/auth";

export { useAdminShellPreferencesStore } from "./stores/shell-preferences";
export { useAdminShellMenuStore } from "./stores/menu";

export { useAdminShellNavigationStore } from "./stores/navigation";

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

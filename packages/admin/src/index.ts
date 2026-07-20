import "./style.css";

export type {
  AdminAuthActions,
  AdminAuthStatus,
  AdminFontSize,
  AdminLocaleOption,
  AdminLoginValues,
  AdminMenuTree,
  AdminRouteKey,
  AdminShellPreferences,
  AdminThemeMode,
} from "./runtime-contract";

export { useAdminShellPreferencesStore } from "./stores/shell-preferences";

export {
  AdminLoginPage,
  type AdminLoginPageProps,
} from "./components/admin-login-page";

export {
  AdminShell,
  type AdminShellDestination,
  type AdminShellNavigate,
  type AdminShellNavigation,
  type AdminShellNavigationRequest,
  type AdminShellNavigationResult,
  type AdminShellProps,
  type AdminShellTab,
  type AdminShellTabCandidate,
  type AdminShellTabDescriptor,
  type AdminShellTabNavigationDecision,
  type AdminShellTabNavigationResolver,
} from "./components/admin-shell";

import "./style.css";

export type {
  AdminAuthActions,
  AdminAuthStatus,
  AdminFontSize,
  AdminLocaleOption,
  AdminLoginValues,
  AdminMenuTree,
  AdminRouteKey,
  AdminRouteVisibility,
  AdminShellPreferences,
  AdminThemeMode,
} from "./runtime-contract";

export { useAdminShellPreferencesStore } from "./stores/shell-preferences";

export {
  AdminLoginPage,
  type AdminLoginPageProps,
} from "./components/admin-login-page";

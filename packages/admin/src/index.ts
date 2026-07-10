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
  type AdminShellProps,
  type AdminShellTab,
  type AdminShellTabController,
} from "./components/admin-shell";

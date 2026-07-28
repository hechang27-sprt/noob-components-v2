import type { MenuOption } from "naive-ui";

export type AdminAuthStatus =
  | { kind: "loading" }
  | {
      kind: "anonymous";
      reason?: "signed-out" | "expired" | "forbidden" | "unknown";
    }
  | {
      kind: "authenticated";
      userLabel?: string;
      avatarUrl?: string;
      subtitle?: string;
    };
export type AdminAuthIdentity = {
  userLabel?: string;
  avatarUrl?: string;
  subtitle?: string;
};

export type AdminAuthRestoreResult =
  | { kind: "authenticated"; identity: AdminAuthIdentity }
  | { kind: "anonymous" };

export type AdminLoginValues = {
  username: string;
  password: string;
  remember?: boolean;
};

export type AdminRouteKey = string;

export type AdminMenuTree = MenuOption[];

export type AdminThemeMode = "light" | "dark" | "system";
export type AdminFontSize = "small" | "medium" | "large";

export type AdminLocaleOption = {
  key: string;
  label: string;
};

export type AdminShellPreferences = {
  themeMode: AdminThemeMode;
  fontSize: AdminFontSize;
  locale: string;
  availableLocales: AdminLocaleOption[];
  sidebarCollapsed: boolean;
};

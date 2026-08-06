import {
  NAvatar,
  NButton,
  NDropdown,
  NIcon,
  NThing,
  type DropdownOption,
} from "naive-ui";
import {
  LanguageOutline,
  LogOutOutline,
  MenuOutline,
  MoonOutline,
  PersonCircleOutline,
  SunnyOutline,
  TextOutline,
} from "@vicons/ionicons5";
import { defineComponent } from "vue";

import { getComponentI18n } from "@noob-naive-ui/i18n";

import { useAdminAuthStore } from "../stores/auth";
import { useAdminShellPreferencesStore } from "../stores/shell-preferences";

/** Renders the Vicons glyph that distinguishes the account menu's logout action. */
function renderLogoutIcon() {
  return (
    <NIcon size={16}>
      <LogOutOutline />
    </NIcon>
  );
}

/**
 * Renders AdminShell's `nav-left` ProLayout slot.
 *
 * Pure-presentational Vue component: reads the preference store and the
 * nearest component Composer directly and calls the store action on toggle.
 * Rendered as a descendant of AdminShell so those composition calls resolve
 * against its context; no props or callback data.
 *
 * Declared with `defineComponent` (rather than a plain function component)
 * so plugin-vue-jsx hot-registers the module: an HMR edit re-executes and
 * reloads only this leaf instead of propagating to the shell, whose reload
 * remounts it and drops the setup-scoped open-tab registry.
 *
 * @returns The `nav-left` slot's JSX.
 */
export const AdminShellNavLeft = defineComponent(
  () => {
    const preferences = useAdminShellPreferencesStore();
    const { t } = getComponentI18n();

    return () => (
      <div class="flex items-center h-full" data-admin-nav-left>
        <NButton
          attr-type="button"
          quaternary
          circle
          data-admin-control="sidebar"
          aria-label={
            preferences.sidebarCollapsed
              ? t("aria.sidebarExpand")
              : t("aria.sidebarCollapse")
          }
          aria-pressed={preferences.sidebarCollapsed}
          onClick={() =>
            preferences.setSidebarCollapsed(!preferences.sidebarCollapsed)
          }>
          <NIcon size={18}>
            <MenuOutline />
          </NIcon>
        </NButton>
      </div>
    );
  },
  { name: "AdminShellNavLeft" },
);

/**
 * Renders AdminShell's `nav-right` ProLayout slot.
 *
 * Pure-presentational Vue component: reads the preference and auth stores
 * plus the nearest component Composer directly and invokes store actions on
 * selection. Rendered as a descendant of AdminShell so those composition
 * calls resolve against its context; no props or callback data.
 *
 * Declared with `defineComponent` (rather than a plain function component)
 * so plugin-vue-jsx hot-registers the module: an HMR edit re-executes and
 * reloads only this leaf instead of propagating to the shell, whose reload
 * remounts it and drops the setup-scoped open-tab registry.
 *
 * @returns The `nav-right` slot's JSX.
 */
export const AdminShellNavRight = defineComponent(
  () => {
    const preferences = useAdminShellPreferencesStore();
    const auth = useAdminAuthStore();
    const { t } = getComponentI18n();

    return () => {
      const status = auth.status;
      const pending = auth.logoutPending;

      const userLabel =
        status.kind === "authenticated"
          ? (status.userLabel ?? t("signedIn"))
          : t("signedIn");

      /** Presents the fixed font-size choices with reactive locale labels. */
      const fontSizeOptions = [
        { key: "small", label: t("fontSize.small") },
        { key: "medium", label: t("fontSize.medium") },
        { key: "large", label: t("fontSize.large") },
      ] satisfies DropdownOption[];

      /** Presents the fixed account actions with a reactive locale label. */
      const accountOptions = [
        { key: "logout", label: t("account.signOut"), icon: renderLogoutIcon },
      ] satisfies DropdownOption[];

      const fontSizeLabel =
        fontSizeOptions.find(({ key }) => key === preferences.fontSize)
          ?.label ?? preferences.fontSize;
      const localeLabel =
        preferences.availableLocales.find(
          ({ key }) => key === preferences.locale,
        )?.label ?? preferences.locale;
      const themeIcon =
        preferences.themeMode === "dark" ? SunnyOutline : MoonOutline;

      return (
        <div class="flex items-center h-full gap-1" data-admin-controls>
          <NButton
            attr-type="button"
            quaternary
            circle
            data-admin-control="theme-mode"
            data-admin-theme-action={
              preferences.themeMode === "dark" ? "exit-dark" : "enter-dark"
            }
            aria-label={
              preferences.themeMode === "dark"
                ? t("aria.themeLight")
                : t("aria.themeDark")
            }
            onClick={() =>
              preferences.setThemeMode(
                preferences.themeMode === "dark" ? "light" : "dark",
              )
            }>
            <NIcon component={themeIcon} size={18} />
          </NButton>
          <NDropdown
            trigger="hover"
            delay={0}
            value={preferences.fontSize}
            options={fontSizeOptions}
            onSelect={(value: string | number) => {
              if (
                value === "small" ||
                value === "medium" ||
                value === "large"
              ) {
                preferences.setFontSize(value);
              }
            }}>
            <NButton
              attr-type="button"
              quaternary
              circle
              data-admin-control="font-size"
              aria-label={t("aria.fontSize", { label: fontSizeLabel })}>
              <NIcon size={18}>
                <TextOutline />
              </NIcon>
            </NButton>
          </NDropdown>
          <NDropdown
            trigger="hover"
            delay={0}
            value={preferences.locale}
            options={preferences.availableLocales}
            disabled={preferences.availableLocales.length === 0}
            onSelect={(value: string | number) => {
              if (typeof value === "string") {
                preferences.setLocale(value);
              }
            }}>
            <NButton
              attr-type="button"
              quaternary
              circle
              data-admin-control="locale"
              disabled={preferences.availableLocales.length === 0}
              aria-label={t("aria.language", { label: localeLabel })}>
              <NIcon size={18}>
                <LanguageOutline />
              </NIcon>
            </NButton>
          </NDropdown>
          <NDropdown
            trigger="hover"
            delay={0}
            disabled={pending}
            options={accountOptions}
            onSelect={async (value: string | number) => {
              if (value !== "logout" || auth.logoutPending) return;
              try {
                await auth.logout();
              } catch {
                // Generic feedback is handled by the host; the store's status remains safe.
              }
            }}>
            <NButton
              attr-type="button"
              quaternary
              class="gap-1.5"
              data-admin-control="account"
              disabled={pending}
              loading={pending}
              aria-label={t("aria.account", { user: userLabel })}>
              <NThing>
                {{
                  avatar: () => (
                    <NAvatar round bordered>
                      <NIcon>
                        <PersonCircleOutline />
                      </NIcon>
                    </NAvatar>
                  ),
                  header: () => (
                    <div class="h-10 inline-flex items-center">{userLabel}</div>
                  ),
                }}
              </NThing>
            </NButton>
          </NDropdown>
        </div>
      );
    };
  },
  { name: "AdminShellNavRight" },
);

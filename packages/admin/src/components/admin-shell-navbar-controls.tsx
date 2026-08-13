import {
  NAvatar,
  NButton,
  NDropdown,
  NFlex,
  NIcon,
  NText,
  type DropdownOption,
} from "naive-ui";
import {
  ColorPaletteOutline,
  LanguageOutline,
  LogOutOutline,
  MenuOutline,
  PersonCircleOutline,
  TextOutline,
} from "@vicons/ionicons5";
import { defineComponent } from "vue";

import { getComponentI18n, resolveI18nText } from "@noob-naive-ui/i18n";

import { useAdminAuthStore } from "../stores/auth";
import { useAdminProvider } from "../use-admin-provider";

const DROPDOWN_DELAY = 25;

/** Renders the Vicons glyph that distinguishes the account menu's logout action. */

/**
 * Renders AdminShell's `nav-left` ProLayout slot.
 *
 * Pure-presentational Vue component: reads `useAdminProvider` and the
 * nearest component Composer directly and calls the provider action on
 * toggle. Rendered as a descendant of AdminShell so those composition calls
 * resolve against its context; no props or callback data.
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
    const provider = useAdminProvider();
    const { t } = getComponentI18n();

    return () => (
      <NFlex align="center" class="h-full" data-admin-nav-left>
        <NButton
          attr-type="button"
          quaternary
          circle
          data-admin-control="sidebar"
          aria-label={
            provider.sidebarCollapsed.value
              ? t("aria.sidebarExpand")
              : t("aria.sidebarCollapse")
          }
          aria-pressed={provider.sidebarCollapsed.value}
          onClick={() =>
            provider.setSidebarCollapsed(!provider.sidebarCollapsed.value)
          }>
          {{
            icon: () => (
              <NIcon>
                <MenuOutline />
              </NIcon>
            ),
          }}
        </NButton>
      </NFlex>
    );
  },
  { name: "AdminShellNavLeft" },
);

/**
 * Renders AdminShell's `nav-right` ProLayout slot.
 *
 * Pure-presentational Vue component: reads `useAdminProvider` and the auth
 * store plus the nearest component Composer directly and invokes the
 * provider/store actions on selection. Rendered as a descendant of AdminShell
 * so those composition calls resolve against its context; no props or
 * callback data.
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
    const provider = useAdminProvider();
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

      /** Presents the host-supplied theme presets with reactive locale labels. */
      const themeOptions = provider.themes.value.map(
        (preset) =>
          ({
            key: preset.key,
            label: resolveI18nText(preset.label, t),
          }) satisfies DropdownOption,
      );

      /** Presents the fixed account actions with a reactive locale label. */
      const accountOptions = [
        {
          key: "logout",
          label: t("account.signOut"),
          icon: () => (
            <NIcon>
              <LogOutOutline />
            </NIcon>
          ),
        },
      ] satisfies DropdownOption[];

      const fontSizeLabel =
        fontSizeOptions.find(({ key }) => key === provider.fontSize.value)
          ?.label ?? provider.fontSize.value;
      const localeLabel =
        provider.availableLocales.value.find(
          ({ key }) => key === provider.locale.value,
        )?.label ?? provider.locale.value;
      const activeTheme = provider.activeTheme.value;
      const themeLabel = activeTheme
        ? resolveI18nText(activeTheme.label, t)
        : provider.themeMode.value;

      return (
        <NFlex
          align="center"
          class="h-full overflow-hidden"
          wrap={false}
          data-admin-controls>
          <NDropdown
            trigger="hover"
            delay={DROPDOWN_DELAY}
            value={provider.activeTheme.value?.key}
            options={themeOptions}
            onSelect={(value: string | number) => {
              if (typeof value === "string") {
                provider.setTheme(value);
              }
            }}>
            <NButton
              attr-type="button"
              quaternary
              circle
              data-admin-control="theme"
              disabled={themeOptions.length === 0}
              aria-label={t("aria.theme", { label: themeLabel })}>
              {{
                icon: () => (
                  <NIcon>
                    <ColorPaletteOutline />
                  </NIcon>
                ),
              }}
            </NButton>
          </NDropdown>
          <NDropdown
            trigger="hover"
            delay={DROPDOWN_DELAY}
            value={provider.fontSize.value}
            options={fontSizeOptions}
            onSelect={(value: string | number) => {
              if (
                value === "small" ||
                value === "medium" ||
                value === "large"
              ) {
                provider.setFontSize(value);
              }
            }}>
            <NButton
              attr-type="button"
              quaternary
              circle
              data-admin-control="font-size"
              aria-label={t("aria.fontSize", { label: fontSizeLabel })}>
              {{
                icon: () => (
                  <NIcon>
                    <TextOutline />
                  </NIcon>
                ),
              }}
            </NButton>
          </NDropdown>
          <NDropdown
            trigger="hover"
            delay={DROPDOWN_DELAY}
            value={provider.locale.value}
            options={provider.availableLocales.value}
            disabled={provider.availableLocales.value.length === 0}
            onSelect={(value: string | number) => {
              if (typeof value === "string") {
                provider.setLocale(value);
              }
            }}>
            <NButton
              attr-type="button"
              quaternary
              circle
              data-admin-control="locale"
              disabled={provider.availableLocales.value.length === 0}
              aria-label={t("aria.language", { label: localeLabel })}>
              {{
                icon: () => (
                  <NIcon>
                    <LanguageOutline />
                  </NIcon>
                ),
              }}
            </NButton>
          </NDropdown>
          <NDropdown
            class={"overflow-hidden"}
            trigger="hover"
            delay={DROPDOWN_DELAY}
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
              data-admin-control="account"
              disabled={pending}
              loading={pending}
              aria-label={t("aria.account", { user: userLabel })}
              class="px-0! h-auto!">
              <NFlex inline align="center" class="mx-1 my-1">
                <NAvatar round bordered>
                  <NIcon>
                    <PersonCircleOutline />
                  </NIcon>
                </NAvatar>
                <NText class="trim-text">{userLabel}</NText>
              </NFlex>
            </NButton>
          </NDropdown>
        </NFlex>
      );
    };
  },
  { name: "AdminShellNavRight" },
);

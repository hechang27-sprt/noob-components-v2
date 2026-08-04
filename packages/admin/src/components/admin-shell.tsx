import {
  NAvatar,
  NButton,
  NDropdown,
  NIcon,
  NMenu,
  NTab,
  NTabs,
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
import { ProLayout } from "pro-naive-ui";
import {
  defineComponent,
  inject,
  onBeforeUnmount,
  provide,
  reactive,
  ref,
  shallowRef,
  toRaw,
  watch,
  type InjectionKey,
} from "vue";

import {
  resolveI18nText,
  useComponentI18n,
  useGlobalI18nSync,
  type I18nText,
} from "@noob-naive-ui/i18n";
import adminShellMessages from "../locales/AdminShell.json";
import {
  DEFAULT_SNAPSHOT,
  adminI18nOverridesKey,
  selectAdminShellOverrides,
} from "../i18n/plugin";
import type { AdminLocaleOption } from "../runtime-contract";
import { useAdminAuthStore } from "../stores/auth";
import { useAdminShellPreferencesStore } from "../stores/shell-preferences";
import { useAdminShellMenuStore } from "../stores/menu";
import { useAdminShellNavigationStore } from "../stores/navigation";

/** Renders the Vicons glyph that distinguishes the account menu's logout action. */
function renderLogoutIcon() {
  return (
    <NIcon size={16}>
      <LogOutOutline />
    </NIcon>
  );
}

/** Selects whether one navigation call opens a page or activates an existing page instance. */
export type AdminShellTabNavigationDecision =
  | { kind: "open" }
  | { kind: "activate"; tabId: string };

/** Resolves one destination against all currently opened public tab snapshots. */
export type AdminShellTabNavigationResolver = (
  tabs: readonly AdminShellTabDescriptor[],
  destination: AdminShellDestination,
) => AdminShellTabNavigationDecision;

/** Requests navigation to a destination using an optional policy scoped to this call. */
export type AdminShellNavigate = (
  /** Supplies durable router-neutral destination data retained by an opened tab. */
  destination: AdminShellDestination,
  /** Supplies an ephemeral policy used only while resolving this navigation call. */
  resolveTabNavigation?: AdminShellTabNavigationResolver,
) => Promise<void>;

/** Exposes the nearest AdminShell's public destination control. */
export type AdminShellContext = {
  /** Requests navigation through this shell instance's existing resolution path. */
  navigate: AdminShellNavigate;
};

/** Identifies shell context privately while preserving typed hierarchical injection. */
const adminShellContextKey: InjectionKey<AdminShellContext> =
  Symbol("AdminShellContext");

/**
 * Resolves the public navigation control supplied by the nearest ancestor AdminShell.
 *
 * @returns The nearest shell's destination control.
 * @throws When the caller is not rendered beneath an AdminShell provider.
 */
export function useAdminShell(): AdminShellContext {
  const context = inject(adminShellContextKey);
  if (!context) {
    throw new Error("useAdminShell() requires an ancestor AdminShell.");
  }
  return context;
}

/** Describes a router-neutral destination interpreted only by the host. */
export type AdminShellDestination = {
  /** Supplies the stable host-defined navigation key. */
  navKey: string;
  /** Supplies optional router-neutral application data as a plain JSON object. */
  payload?: Readonly<Record<string, unknown>>;
};

/** Describes one immutable opened page-instance snapshot exposed to the host. */
export type AdminShellTabDescriptor = {
  /** Identifies this page instance independently of its destination. */
  id: string;
  /** Supplies the router-neutral destination represented by this page instance. */
  nav: AdminShellDestination;
  /**
   * Supplies the displayable tab label. `i18n` labels resolve against the
   * host global Composer at render time (reactive to locale changes) and are
   * persisted by their message key; `string` labels render verbatim.
   */
  label: I18nText;
  /** Allows the host to keep a page instance permanently open when false. */
  closable?: boolean;
};

/** Stores shell-private ordering and pending state for one committed page instance. */
export type AdminShellTab = AdminShellTabDescriptor & {
  /** Records the current zero-based visible position. */
  index: number;
  /** Prevents duplicate activation requests for this exact record. */
  activationPending: boolean;
  /** Prevents duplicate close requests for this exact record. */
  closePending: boolean;
};

/** Describes one uncommitted page instance proposed by the shell. */
export type AdminShellTabCandidate = Pick<
  AdminShellTabDescriptor,
  "id" | "nav"
>;

/** Describes the single discriminated host navigation boundary. */
export type AdminShellNavigationRequest =
  | {
      /** Selects creation of a new uncommitted page instance. */
      kind: "open";
      /** Supplies the shell-generated identity and requested destination awaiting host confirmation. */
      candidate: AdminShellTabCandidate;
      /** Supplies the host-authoritative active page before the open request, or null when none exists. */
      current: AdminShellTabDescriptor | null;
      /** Requests replacement of the current browser-history entry when true, rather than adding an entry. */
      closeCurrent: boolean;
    }
  | {
      /** Selects navigation to an already committed page instance. */
      kind: "activate";
      /** Supplies the exact committed page instance that must become active. */
      destination: AdminShellTabDescriptor;
      /** Supplies the host-authoritative active page before activation, or null when none exists. */
      current: AdminShellTabDescriptor | null;
    }
  | {
      /** Selects removal of one exact committed page instance. */
      kind: "close";
      /** Supplies the exact committed page instance to remove after host confirmation. */
      closing: AdminShellTabDescriptor;
      /** Supplies the shell-selected fallback page instance to activate, or null when no fallback remains. */
      destination: AdminShellTabDescriptor | null;
    };

/** Reports the host-confirmed active page after one navigation request. */
export type AdminShellNavigationResult = {
  active: AdminShellTabDescriptor | null;
};

/** Coordinates router-neutral page-instance navigation with the host application. */
export type AdminShellNavigation = {
  /** Reports the host-authoritative active page instance. */
  active: AdminShellTabDescriptor | null;
  /** Handles one resolved open, activate, or close request. */
  handleNavigation: (
    request: AdminShellNavigationRequest,
  ) => Promise<AdminShellNavigationResult>;
};

/**
 * Returns one public immutable descriptor snapshot without shell-private mutable fields.
 *
 * Records are stored plain — `recordCurrentTab` strips write-side proxies
 * with `toRaw` — but the reactive map re-wraps every value on read, so the
 * tab passed here is still a proxy. `toRaw` unwraps it to the stored plain
 * record, and `structuredClone` deep-copies the public fields so the
 * snapshot shares nothing with the reactive record (which stays reactive
 * for rendering). Cloning is safe precisely because the write boundary
 * guarantees proxy-free records; the adapter persists descriptors with
 * `structuredClone` for the same reason.
 */
function snapshotTab(tab: AdminShellTab): AdminShellTabDescriptor {
  const raw = toRaw(tab);
  return structuredClone({
    id: raw.id,
    nav: raw.nav,
    label: raw.label,
    closable: raw.closable,
  });
}

export const AdminShell = defineComponent(
  (_, { slots }) => {
    /** Reads the package-owned frontend auth runtime for identity and logout. */
    const auth = useAdminAuthStore();
    /** Reads and mutates the one existing runtime preference store. */
    const preferences = useAdminShellPreferencesStore();
    /** Reads the host-configured menu options from the admin package runtime. */
    const menu = useAdminShellMenuStore();
    /** Reads the host-configured navigation adapter from the admin package runtime. */
    const nav = useAdminShellNavigationStore();

    // Fresh local registry: packaged defaults first, the AdminShell override
    // slice second, so overrides win at the leaf.
    const { t } = useComponentI18n({
      messages: adminShellMessages,
      overridesKey: adminI18nOverridesKey,
      emptySnapshot: DEFAULT_SNAPSHOT,
      selectOverrides: selectAdminShellOverrides,
    });

    /**
     * Synchronizes the persisted preference locale into the global Composer
     * one way. Immediate so the hydrated preference is authoritative when the
     * shell mounts; AdminShell locale selections flow store → Composer and
     * inheriting local Composers follow automatically. The host seeds the
     * Composer at creation for the pre-auth login page.
     */
    const globalComposer = useGlobalI18nSync(() => preferences.locale);

    /** Stores committed page instances by immutable ID. */
    const tabs = reactive(new Map<string, AdminShellTab>());
    /** Owns the sole user-visible page-instance ordering. */
    const visibleTabs = ref<string[]>([]);

    /** Holds sanitized navigation feedback for the current boundary. */
    const tabError = ref<string>();
    /** Identifies the only uncommitted open candidate still allowed to complete. */
    const pendingOpen = shallowRef<AdminShellTabCandidate>();

    /** Synchronizes retained tab indexes with visible order. */
    function reindexTabs(): void {
      visibleTabs.value.forEach((id, index) => {
        const tab = tabs.get(id);
        if (tab) tab.index = index;
      });
    }

    /** Clears ephemeral membership and invalidates an uncommitted candidate. */
    function clearTabs(): void {
      tabs.clear();
      visibleTabs.value.length = 0;
      pendingOpen.value = undefined;
      tabError.value = undefined;
    }

    /**
     * Records or refreshes one host-confirmed descriptor by page-instance ID.
     *
     * The host adapter may hand back reactive descriptors, so `toRaw` strips
     * any read-time proxy here: the map only ever stores plain records, which
     * lets `snapshotTab` rebuild snapshots from raw data.
     */
    function recordCurrentTab(current: AdminShellTabDescriptor | null): void {
      if (!current) return;
      const tab = toRaw(current);
      const existing = tabs.get(tab.id);
      if (existing) {
        existing.nav = tab.nav;
        existing.label = tab.label;
        existing.closable = tab.closable;
        return;
      }
      tabs.set(tab.id, {
        ...tab,
        index: visibleTabs.value.length,
        activationPending: false,
        closePending: false,
      });
      visibleTabs.value.push(tab.id);
    }

    /** Returns all committed public descriptors in visible order. */
    function openedDescriptors(): AdminShellTabDescriptor[] {
      return visibleTabs.value.flatMap((id) => {
        const tab = tabs.get(id);
        return tab ? [snapshotTab(tab)] : [];
      });
    }

    /** Returns whether Naive UI may activate a known idle page instance. */
    function canActivateTab(id: string | number): boolean {
      return (
        typeof id === "string" &&
        Boolean(tabs.get(id) && !tabs.get(id)!.activationPending)
      );
    }

    /** Requests activation for one exact committed page instance. */
    async function activateTab(id: string): Promise<void> {
      const navigation = nav.navigation;
      const tab = tabs.get(id);
      if (
        !navigation ||
        !tab ||
        tab.activationPending ||
        navigation.active?.id === id
      )
        return;
      tab.activationPending = true;
      tabError.value = undefined;
      try {
        await navigation.handleNavigation({
          kind: "activate",
          destination: snapshotTab(tab),
          current: navigation.active,
        });
      } catch (error) {
        console.error("activateTab failed:", error);
        if (tabs.get(id) === tab) tabError.value = t("errors.unableToNavigate");
      } finally {
        if (tabs.get(id) === tab) tab.activationPending = false;
      }
    }

    /**
     * Resolves a destination with an optional call policy and requests activation or open.
     *
     * @param destination - Durable router-neutral data retained when a new tab is committed.
     * @param resolveTabNavigation - Ephemeral policy invoked only for this navigation call.
     * @returns A promise that settles after resolution and any host navigation complete.
     */
    async function requestDestination(
      destination: AdminShellDestination,
      resolveTabNavigation?: AdminShellTabNavigationResolver,
    ): Promise<void> {
      const navigation = nav.navigation;
      if (!navigation || pendingOpen.value) return;
      const opened = openedDescriptors();
      const newestMatch = [...opened]
        .reverse()
        .find((tab) => tab.nav.navKey === destination.navKey);
      const decision =
        resolveTabNavigation?.(opened, destination) ??
        (newestMatch
          ? { kind: "activate" as const, tabId: newestMatch.id }
          : { kind: "open" as const });
      if (decision.kind === "activate") {
        if (tabs.has(decision.tabId)) await activateTab(decision.tabId);
        return;
      }
      const candidate = { id: crypto.randomUUID(), nav: destination };
      pendingOpen.value = candidate;
      tabError.value = undefined;
      try {
        const result = await navigation.handleNavigation({
          kind: "open",
          candidate,
          current: navigation.active,
          closeCurrent: false,
        });
        if (
          nav.navigation === navigation &&
          pendingOpen.value === candidate &&
          result.active?.id === candidate.id
        )
          recordCurrentTab(result.active);
      } catch (error) {
        console.error("requestDestination failed:", error);
        if (nav.navigation === navigation && pendingOpen.value === candidate)
          tabError.value = t("errors.unableToNavigate");
      } finally {
        if (pendingOpen.value === candidate) pendingOpen.value = undefined;
      }
    }

    /** Retains one stable descendant context for this mounted shell instance. */
    const shellContext: AdminShellContext = {
      navigate: requestDestination,
    };
    provide(adminShellContextKey, shellContext);

    /** Computes the current-order fallback descriptor for an exact close request. */
    function getCloseDestination(
      tab: AdminShellTab,
    ): AdminShellTabDescriptor | null {
      if (nav.navigation?.active?.id !== tab.id)
        return nav.navigation?.active ?? null;
      const id =
        visibleTabs.value[tab.index + 1] ?? visibleTabs.value[tab.index - 1];
      const destination = id ? tabs.get(id) : undefined;
      return destination ? snapshotTab(destination) : null;
    }

    /** Requests closure and removes only the exact record that owned the completion. */
    async function closeTab(id: string): Promise<void> {
      const navigation = nav.navigation;
      const tab = tabs.get(id);
      if (!navigation || !tab || tab.closable === false || tab.closePending)
        return;
      tab.closePending = true;
      tabError.value = undefined;
      try {
        const { active } = await navigation.handleNavigation({
          kind: "close",
          closing: snapshotTab(tab),
          destination: getCloseDestination(tab),
        });

        if (
          nav.navigation === navigation && // the same navigation adapter still owns the completion
          tab === tabs.get(id) && // the exact tab record that initiated the close is still committed
          tab.id !== active?.id // the host no longer reports that tab as active
        ) {
          tabs.delete(id);
          const index = visibleTabs.value.indexOf(id);
          if (index !== -1) visibleTabs.value.splice(index, 1);
          reindexTabs();
        }
      } catch (error) {
        console.error("closeTab failed:", error);
        if (tabs.get(id) === tab) tabError.value = t("errors.unableToCloseTab");
      } finally {
        if (tabs.get(id) === tab) tab.closePending = false;
      }
    }

    /**
     * Toggles between dark and non-dark presentation without opening a menu.
     *
     * Dark mode exits to explicit light mode; light and system modes enter dark mode.
     *
     * @returns Nothing after forwarding the next theme mode to the preference store.
     */
    function toggleThemeMode(): void {
      preferences.setThemeMode(
        preferences.themeMode === "dark" ? "light" : "dark",
      );
    }

    /**
     * Updates the font-size preference from a Naive dropdown option key.
     *
     * @param value - Selected dropdown key, which may be a string or number.
     * @returns Nothing after forwarding a valid font size to the preference store.
     */
    function setFontSize(value: string | number): void {
      if (value === "small" || value === "medium" || value === "large") {
        preferences.setFontSize(value);
      }
    }

    /**
     * Updates the locale preference from a Naive dropdown option key.
     *
     * @param value - Selected dropdown key, which may be a string or number.
     * @returns Nothing after forwarding a string locale key to the preference store.
     */
    function setLocale(value: string | number): void {
      if (typeof value === "string") {
        preferences.setLocale(value);
      }
    }

    /**
     * Sets sidebar collapse through the public preference store action.
     *
     * @param value - Whether the layout sidebar should render collapsed.
     * @returns Nothing after storing the controlled ProLayout state.
     */
    function setSidebarCollapsed(value: boolean): void {
      preferences.setSidebarCollapsed(value);
    }

    /**
     * Delegates the logout menu choice to the supplied frontend action without overlap.
     *
     * @param value - Selected dropdown key, which may be a string or number.
     * @returns A promise that settles after recording any safe local failure feedback.
     */
    async function selectAccountAction(value: string | number): Promise<void> {
      if (value !== "logout" || auth.logoutPending) return;

      try {
        await auth.logout();
      } catch {
        // Generic feedback is handled by the host; the store's status remains safe.
      }
    }

    /** Tracks navigation boundaries and records each host-confirmed page instance. */
    watch(
      () => ({
        navigation: nav.navigation,
        activeTabId: nav.navigation?.active?.id,
        activeTabDest: nav.navigation?.active?.nav,
        activeTabLabel: nav.navigation?.active?.label,
        activeTabClosable: nav.navigation?.active?.closable,
      }),
      (next, previous) => {
        const { navigation } = next;
        const { navigation: previousNavigation } = previous ?? {};

        const hasNavigation = Boolean(navigation);
        const previousHasNavigation = Boolean(previousNavigation);
        if (
          !hasNavigation ||
          !previousHasNavigation ||
          navigation !== previousNavigation
        )
          clearTabs();
        if (hasNavigation) recordCurrentTab(navigation?.active ?? null);
      },
      { immediate: true, flush: "sync" },
    );

    /**
     * Invalidates pending actions and drops all ephemeral tabs on component unmount.
     *
     * @returns Nothing after delegating cleanup to clearTabs.
     */
    onBeforeUnmount(clearTabs);

    return () => {
      const status = auth.status;
      const pending = auth.logoutPending;

      const activeId = nav.navigation?.active?.id;
      const activeMenuKey = nav.navigation?.active?.nav.navKey;
      const localeOptions: AdminLocaleOption[] = preferences.availableLocales;
      const menuOptions = menu.options;

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

      const userLabel =
        status.kind === "authenticated"
          ? (status.userLabel ?? t("signedIn"))
          : t("signedIn");

      const fontSizeLabel =
        fontSizeOptions.find(({ key }) => key === preferences.fontSize)
          ?.label ?? preferences.fontSize;
      const localeLabel =
        localeOptions.find(({ key }) => key === preferences.locale)?.label ??
        preferences.locale;
      const themeIcon =
        preferences.themeMode === "dark" ? SunnyOutline : MoonOutline;

      const layoutSlots = {
        "nav-left": () => (
          <div class="flex items-center h-full" data-admin-nav-left>
            <NButton
              attr-type="button"
              quaternary
              circle
              size="large"
              data-admin-control="sidebar"
              aria-label={
                preferences.sidebarCollapsed
                  ? t("aria.sidebarExpand")
                  : t("aria.sidebarCollapse")
              }
              aria-pressed={preferences.sidebarCollapsed}
              onClick={() =>
                setSidebarCollapsed(!preferences.sidebarCollapsed)
              }>
              <NIcon size={18}>
                <MenuOutline />
              </NIcon>
            </NButton>
          </div>
        ),
        "nav-right": () => (
          <div class="flex items-center h-full gap-1" data-admin-controls>
            <NButton
              attr-type="button"
              quaternary
              circle
              size="large"
              data-admin-control="theme-mode"
              data-admin-theme-action={
                preferences.themeMode === "dark" ? "exit-dark" : "enter-dark"
              }
              aria-label={
                preferences.themeMode === "dark"
                  ? t("aria.themeLight")
                  : t("aria.themeDark")
              }
              onClick={toggleThemeMode}>
              <NIcon component={themeIcon} size={18} />
            </NButton>
            <NDropdown
              trigger="hover"
              delay={0}
              value={preferences.fontSize}
              options={fontSizeOptions}
              onSelect={setFontSize}>
              <NButton
                attr-type="button"
                quaternary
                circle
                size="large"
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
              options={localeOptions}
              disabled={localeOptions.length === 0}
              onSelect={setLocale}>
              <NButton
                attr-type="button"
                quaternary
                circle
                size="large"
                data-admin-control="locale"
                disabled={localeOptions.length === 0}
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
              onSelect={selectAccountAction}>
              <NButton
                attr-type="button"
                quaternary
                size="large"
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
                      <div class="h-10 inline-flex items-center">
                        {userLabel}
                      </div>
                    ),
                  }}
                </NThing>
              </NButton>
            </NDropdown>
          </div>
        ),
        sidebar: menuOptions?.length
          ? () => (
              <NMenu
                options={menuOptions}
                value={activeMenuKey}
                onUpdateValue={(key: string | number) =>
                  void requestDestination({ navKey: String(key) })
                }
              />
            )
          : undefined,
        tabbar: nav.navigation
          ? () => (
              <div
                class="min-w-0"
                role="tablist"
                aria-label={t("tabs.openPages")}>
                <NTabs
                  type="card"
                  size="small"
                  value={activeId}
                  tabsPadding={8}
                  data-admin-tabs
                  onBeforeLeave={canActivateTab}
                  onUpdateValue={(key: string | number) =>
                    void activateTab(String(key))
                  }
                  onClose={(key: string | number) => void closeTab(String(key))}
                  tabClass="data-[admin-tab-active=true]:h-9/10 h-4/5 self-end rounded-t-xl!">
                  {visibleTabs.value.map((id) => {
                    const tab = tabs.get(id);
                    const active = activeId === tab?.id;
                    /** Supplies tab semantics that Naive UI does not declare as component props. */
                    const tabAccessibilityProps = {
                      role: "tab",
                      "aria-selected": active,
                      "aria-current": active ? "page" : undefined,
                    };
                    return tab ? (
                      <NTab
                        key={tab.id}
                        name={tab.id}
                        tab={resolveI18nText(tab.label, (key, named) =>
                          named
                            ? globalComposer.t(key, named)
                            : globalComposer.t(key),
                        )}
                        closable={tab.closable !== false}
                        data-admin-tab-key={tab.id}
                        data-admin-tab-active={active}
                        {...tabAccessibilityProps}
                      />
                    ) : null;
                  })}
                </NTabs>
                {tabError.value ? (
                  <p role="alert" data-admin-tab-error>
                    {tabError.value}
                  </p>
                ) : null}
              </div>
            )
          : undefined,
        default: () => slots.default?.({ navigate: requestDestination }),
      };

      return (
        <div class="h-dvh" style={{ height: "100dvh" }}>
          <ProLayout
            collapsed={preferences.sidebarCollapsed}
            onUpdateCollapsed={setSidebarCollapsed}
            showSidebar={Boolean(menuOptions?.length)}
            showTabbar={Boolean(nav.navigation)}
            v-slots={layoutSlots}
          />
        </div>
      );
    };
  },
  {
    name: "AdminShell",
  },
);

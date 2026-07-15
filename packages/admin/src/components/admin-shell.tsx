import { NMenu, type MenuOption } from "naive-ui";
import { ProLayout } from "pro-naive-ui";
import {
  defineComponent,
  onBeforeUnmount,
  reactive,
  ref,
  watch,
  type PropType,
} from "vue";

import { AdminLoginPage } from "./admin-login-page";
import type {
  AdminAuthActions,
  AdminAuthStatus,
  AdminFontSize,
  AdminLocaleOption,
  AdminThemeMode,
} from "../runtime-contract";
import { useAdminShellPreferencesStore } from "../stores/shell-preferences";

/** Describes host-owned presentation for one router-neutral tab. */
export type AdminShellTabInput = {
  /** Identifies the tab and must stay stable across host updates. */
  key: string;
  /** Supplies the user-visible page title without exposing route metadata. */
  label: string;
  /** Allows the host to keep a tab permanently open when explicitly false. */
  closable?: boolean;
};

/** Stores shell-local ordering and async ownership for an open tab. */
export type AdminShellTab = AdminShellTabInput & {
  /** Records the tab's current zero-based position in the visible tab order. */
  index: number;
  /** Owns the current activation request for this tab's session, if any. */
  activationPendingVersion?: number;
  /** Owns the current close request for this tab's session, if any. */
  closePendingVersion?: number;
};

/** Coordinates router-neutral tab activation and closure with the starter. */
export type AdminShellTabController = {
  /** Reports the host-authoritative active tab descriptor, or no active tab. */
  current: AdminShellTabInput | null;
  /**
   * Requests activation without letting the shell optimistically change selection.
   *
   * @param key - Stable key of the existing local tab to activate.
   * @returns A promise that settles after the starter handles activation.
   */
  activate: (key: string) => Promise<void>;
  /**
   * Requests closure of a local tab and gives the starter a neighbor suggestion.
   *
   * @param closedKey - Stable key of the tab requested for closure.
   * @param suggestedNextKey - Adjacent or host-active key to select after close.
   * @returns A promise that resolves only when the starter accepts closure.
   */
  close: (closedKey: string, suggestedNextKey: string | null) => Promise<void>;
};

/** Defines the frontend-ready inputs accepted by the router-free shell. */
export type AdminShellProps = {
  /** Selects loading, anonymous, or authenticated top-level presentation. */
  authStatus: AdminAuthStatus;
  /** Supplies starter-owned login/logout callbacks to the anonymous branch. */
  authActions: AdminAuthActions;
  /** Supplies the starter-built menu tree without shell inspection or mutation. */
  menuOptions?: MenuOption[];
  /** Supplies optional host authority for locally rendered open tabs. */
  tabController?: AdminShellTabController;
};

/**
 * Renders the frontend-only authenticated shell and its runtime-owned controls.
 *
 * The component owns presentation and ephemeral open-tab membership only; the
 * starter owns route content, menu construction, and tab callback behavior.
 *
 * @param props - Frontend auth, menu, and optional tab-controller inputs.
 * @returns A Vue component that selects the corresponding shell branch.
 */
export const AdminShell = defineComponent(
  (props: AdminShellProps, { slots }) => {
    /** Reads and mutates the one existing runtime preference store. */
    const preferences = useAdminShellPreferencesStore();
    /** Stores only tabs observed in the current authenticated host session by key. */
    const tabs = reactive(new Map<string, AdminShellTab>());
    /** Owns the entire user-visible tab ordering independently of map insertion order. */
    const visibleTabs = ref<string[]>([]);
    /** Holds a sanitized async-tab feedback message for the current session. */
    const tabError = ref<string>();
    /** Invalidates callback completions that belong to an earlier tab session. */
    const sessionVersion = ref(0);

    /**
     * Synchronizes each retained tab's index with the sole visible-order source.
     *
     * @returns Nothing after writing each current zero-based visible index.
     */
    function reindexTabs(): void {
      visibleTabs.value.forEach((key, index) => {
        const tab = tabs.get(key);
        if (tab) {
          tab.index = index;
        }
      });
    }

    /**
     * Clears all session-local tab state when its auth or controller boundary changes.
     *
     * @returns Nothing after invalidating in-flight callback completions.
     */
    function clearTabs(): void {
      tabs.clear();
      visibleTabs.value.length = 0;
      tabError.value = undefined;
      sessionVersion.value += 1;
    }

    /**
     * Adds or refreshes host-owned tab presentation without replacing shell-local state.
     *
     * @param current - The latest host-authoritative tab descriptor, if any.
     * @returns Nothing after synchronizing local membership and presentation.
     */
    function recordCurrentTab(current: AdminShellTabInput | null): void {
      if (!current) {
        return;
      }

      const existing = tabs.get(current.key);
      if (existing) {
        existing.label = current.label;
        existing.closable = current.closable;
        return;
      }

      tabs.set(current.key, {
        key: current.key,
        label: current.label,
        closable: current.closable,
        index: visibleTabs.value.length,
      });
      visibleTabs.value.push(current.key);
    }

    /**
     * Starts a host activation callback while suppressing duplicate clicks.
     *
     * @param key - Stable key of the already open tab requested for activation.
     * @returns A promise that settles after reporting any safe local error state.
     */
    async function activateTab(key: string): Promise<void> {
      const controller = props.tabController;
      const version = sessionVersion.value;
      const tab = tabs.get(key);
      if (!controller || !tab || tab.activationPendingVersion === version) {
        return;
      }

      tab.activationPendingVersion = version;
      tabError.value = undefined;

      try {
        await controller.activate(key);
      } catch {
        if (
          sessionVersion.value === version &&
          tabs.get(key)?.activationPendingVersion === version
        ) {
          tabError.value = "Unable to activate tab.";
        }
      } finally {
        const currentTab = tabs.get(key);
        if (
          sessionVersion.value === version &&
          currentTab?.activationPendingVersion === version
        ) {
          currentTab.activationPendingVersion = undefined;
        }
      }
    }

    /**
     * Computes the next-key suggestion for a close request without changing host state.
     *
     * @param index - Current visible-order index of the tab requested for closure.
     * @param tabKey - Stable key of the tab requested for closure.
     * @returns The adjacent or current host key, or null when none is available.
     */
    function getSuggestedNextKey(index: number, tabKey: string): string | null {
      const currentKey = props.tabController?.current?.key;
      if (currentKey !== tabKey) {
        return currentKey ?? null;
      }

      return (
        visibleTabs.value[index + 1] ?? visibleTabs.value[index - 1] ?? null
      );
    }

    /**
     * Awaits a host close callback before removing the requested tab locally.
     *
     * @param tabKey - Stable key of the open tab requested for closure.
     * @returns A promise that settles after retaining or removing the tab safely.
     */
    async function closeTab(tabKey: string): Promise<void> {
      const controller = props.tabController;
      const version = sessionVersion.value;
      const tab = tabs.get(tabKey);
      const index = visibleTabs.value.indexOf(tabKey);
      if (
        !controller ||
        !tab ||
        index === -1 ||
        tab.closable === false ||
        tab.closePendingVersion === version
      ) {
        return;
      }

      tab.closePendingVersion = version;
      tabError.value = undefined;
      const suggestedNextKey = getSuggestedNextKey(index, tabKey);

      try {
        await controller.close(tabKey, suggestedNextKey);
        if (
          sessionVersion.value === version &&
          tabs.get(tabKey)?.closePendingVersion === version
        ) {
          const visibleIndex = visibleTabs.value.indexOf(tabKey);
          tabs.delete(tabKey);
          if (visibleIndex !== -1) {
            visibleTabs.value.splice(visibleIndex, 1);
            reindexTabs();
          }
        }
      } catch {
        if (
          sessionVersion.value === version &&
          tabs.get(tabKey)?.closePendingVersion === version
        ) {
          tabError.value = "Unable to close tab.";
        }
      } finally {
        const currentTab = tabs.get(tabKey);
        if (
          sessionVersion.value === version &&
          currentTab?.closePendingVersion === version
        ) {
          currentTab.closePendingVersion = undefined;
        }
      }
    }

    /**
     * Updates the theme preference from the internal select control.
     *
     * @param event - Select change event carrying a valid theme-mode value.
     * @returns Nothing after forwarding the value to the preference store.
     */
    function setThemeMode(event: Event): void {
      preferences.setThemeMode(
        (event.target as HTMLSelectElement).value as AdminThemeMode,
      );
    }

    /**
     * Updates the font-size preference from the internal select control.
     *
     * @param event - Select change event carrying a valid font-size value.
     * @returns Nothing after forwarding the value to the preference store.
     */
    function setFontSize(event: Event): void {
      preferences.setFontSize(
        (event.target as HTMLSelectElement).value as AdminFontSize,
      );
    }

    /**
     * Updates the locale preference from an available runtime locale option.
     *
     * @param event - Select change event carrying an available locale key.
     * @returns Nothing after forwarding the value to the preference store.
     */
    function setLocale(event: Event): void {
      preferences.setLocale((event.target as HTMLSelectElement).value);
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
     * Tracks auth/controller boundaries and host-reported current-tab presentation.
     * The watcher receives the current and prior auth/controller tuple and returns
     * nothing after resetting stale state or recording the current host tab.
     */
    watch(
      () => [
        props.authStatus.kind,
        props.tabController,
        props.tabController?.current?.key,
        props.tabController?.current?.label,
        props.tabController?.current?.closable,
      ],
      (next, previous) => {
        const [kind, controller] = next as [
          AdminAuthStatus["kind"],
          AdminShellTabController | undefined,
          string | undefined,
          string | undefined,
          boolean | undefined,
        ];
        const [previousKind, previousController] = (previous ?? []) as [
          AdminAuthStatus["kind"] | undefined,
          AdminShellTabController | undefined,
        ];
        const authenticated = kind === "authenticated" && Boolean(controller);
        const previousAuthenticated =
          previousKind === "authenticated" && Boolean(previousController);

        if (
          !authenticated ||
          !previousAuthenticated ||
          controller !== previousController
        ) {
          clearTabs();
        }

        if (authenticated) {
          recordCurrentTab(controller?.current ?? null);
        }
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
      const authStatus = props.authStatus;
      if (authStatus.kind === "loading") {
        return (
          <main
            class="grid min-h-dvh place-items-center"
            role="status"
            aria-busy="true"
          >
            <p>Checking your session…</p>
          </main>
        );
      }

      if (authStatus.kind === "anonymous") {
        return (
          <AdminLoginPage
            authStatus={authStatus}
            authActions={props.authActions}
          />
        );
      }

      const activeKey = props.tabController?.current?.key;
      const localeOptions: AdminLocaleOption[] = preferences.availableLocales;
      const menuOptions = props.menuOptions;
      const userLabel = authStatus.userLabel;
      const layoutSlots = {
        "nav-right": () => (
          <div class="flex items-center gap-2" data-admin-controls>
            <span>{userLabel ?? "Signed in"}</span>
            <label>
              Theme
              <select
                name="theme-mode"
                value={preferences.themeMode}
                onChange={setThemeMode}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>
              Font size
              <select
                name="font-size"
                value={preferences.fontSize}
                onChange={setFontSize}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
            <label>
              Language
              <select
                name="locale"
                value={preferences.locale}
                disabled={localeOptions.length === 0}
                onChange={setLocale}
              >
                {localeOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              data-admin-control="sidebar"
              aria-pressed={preferences.sidebarCollapsed}
              onClick={() => setSidebarCollapsed(!preferences.sidebarCollapsed)}
            >
              {preferences.sidebarCollapsed
                ? "Expand sidebar"
                : "Collapse sidebar"}
            </button>
          </div>
        ),
        sidebar: menuOptions?.length
          ? () => <NMenu options={menuOptions} />
          : undefined,
        tabbar: props.tabController
          ? () => (
              <div data-admin-tabs role="tablist" aria-label="Open pages">
                {visibleTabs.value.map((key) => {
                  const tab = tabs.get(key);
                  return tab ? (
                    <div key={tab.key} class="inline-flex items-center">
                      <button
                        type="button"
                        role="tab"
                        data-admin-tab-key={tab.key}
                        aria-selected={activeKey === tab.key}
                        onClick={() => void activateTab(tab.key)}
                      >
                        {tab.label}
                      </button>
                      {tab.closable !== false ? (
                        <button
                          type="button"
                          data-admin-tab-close={tab.key}
                          aria-label={`Close ${tab.label}`}
                          onClick={() => void closeTab(tab.key)}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ) : null;
                })}
                {tabError.value ? (
                  <p role="alert" data-admin-tab-error>
                    {tabError.value}
                  </p>
                ) : null}
              </div>
            )
          : undefined,
        default: () => slots.default?.(),
      };

      return (
        <div class="h-dvh" style={{ height: "100dvh" }}>
          <ProLayout
            {...{
              collapsed: preferences.sidebarCollapsed,
              "onUpdate:collapsed": setSidebarCollapsed,
              showSidebar: Boolean(menuOptions?.length),
              showTabbar: Boolean(props.tabController),
            }}
            v-slots={layoutSlots}
          />
        </div>
      );
    };
  },
  {
    props: {
      authStatus: { type: Object as PropType<AdminAuthStatus>, required: true },
      authActions: {
        type: Object as PropType<AdminAuthActions>,
        required: true,
      },
      menuOptions: Array as PropType<MenuOption[]>,
      tabController: Object as PropType<AdminShellTabController>,
    },
  },
);

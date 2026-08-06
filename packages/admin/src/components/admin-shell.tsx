import { NMenu } from "naive-ui";
import { ProLayout } from "pro-naive-ui";
import { defineComponent } from "vue";

import {
  createComponentI18n,
  useGlobalI18nSync,
  type I18nText,
} from "@noob-naive-ui/i18n";
import adminShellMessages from "../locales/AdminShell.json";
import { adminI18n } from "../i18n/plugin";
import { useAdminShellPreferencesStore } from "../stores/shell-preferences";
import { useAdminShellMenuStore } from "../stores/menu";
import { useAdminShellNavigationStore } from "../stores/navigation";
import {
  AdminShellNavLeft,
  AdminShellNavRight,
} from "./admin-shell-navbar-controls";
import { AdminShellTabbar } from "./admin-shell-tabbar";
import { useAdminShellTabs } from "./use-admin-shell-tabs";

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
    }
  | {
      /**
       * Selects in-place restamping of the current browser-history entry with
       * one exact committed page instance.
       *
       * The shell requests this when history traversal revives a page
       * instance that was closed while a committed tab for the same
       * destination already exists, so the stale entry adopts the committed
       * identity instead of surfacing a duplicate tab.
       */
      kind: "heal";
      /** Supplies the exact committed page instance that becomes the canonical identity for the current history entry. */
      destination: AdminShellTabDescriptor;
      /** Supplies the host-authoritative active page before healing, or null when none exists. */
      current: AdminShellTabDescriptor | null;
    };

/** Reports the host-confirmed active page after one navigation request. */
export type AdminShellNavigationResult = {
  active: AdminShellTabDescriptor | null;
};

/** Coordinates router-neutral page-instance navigation with the host application. */
export type AdminShellNavigation = {
  /** Reports the host-authoritative active page instance. */
  active: AdminShellTabDescriptor | null;
  /** Handles one resolved open, activate, close, or heal request. */
  handleNavigation: (
    request: AdminShellNavigationRequest,
  ) => Promise<AdminShellNavigationResult>;
};

export const AdminShell = defineComponent(
  (_, { slots }) => {
    /** Reads and mutates the one existing runtime preference store. */
    const preferences = useAdminShellPreferencesStore();
    /** Reads the host-configured menu options from the admin package runtime. */
    const menu = useAdminShellMenuStore();
    /** Reads the host-configured navigation adapter from the admin package runtime. */
    const nav = useAdminShellNavigationStore();

    // Fresh local registry: packaged defaults first, the AdminShell override
    // slice second, so overrides win at the leaf.
    const { t } = createComponentI18n({
      messages: adminShellMessages,
      plugin: adminI18n,
      componentId: "AdminShell",
    });

    /**
     * Synchronizes the persisted preference locale into the global Composer
     * one way. Immediate so the hydrated preference is authoritative when the
     * shell mounts; AdminShell locale selections flow store → Composer and
     * inheriting local Composers follow automatically. The host seeds the
     * Composer at creation for the pre-auth login page.
     */
    useGlobalI18nSync(() => preferences.locale);

    /** Owns the router-neutral page-instance tab state machine (provides the controller). */
    const shellContext = useAdminShellTabs({
      getNavigation: () => nav.navigation,
      t,
    });

    return () => {
      const activeMenuKey = nav.navigation?.active?.nav.navKey;
      const menuOptions = menu.options;

      const layoutSlots = {
        "nav-left": () => <AdminShellNavLeft />,
        "nav-right": () => <AdminShellNavRight />,
        sidebar: menuOptions?.length
          ? () => (
              <NMenu
                options={menuOptions}
                value={activeMenuKey}
                onUpdateValue={(key: string | number) =>
                  void shellContext.navigate({ navKey: String(key) })
                }
              />
            )
          : undefined,
        tabbar: nav.navigation ? () => <AdminShellTabbar /> : undefined,
        default: () => slots.default?.({ navigate: shellContext.navigate }),
      };

      return (
        <div class="h-dvh" style={{ height: "100dvh" }}>
          <ProLayout
            collapsed={preferences.sidebarCollapsed}
            onUpdateCollapsed={(value) =>
              preferences.setSidebarCollapsed(value)
            }
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

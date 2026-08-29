import { NLayout, NMenu } from "naive-ui";
import { ProLayout, useLayoutMenu } from "pro-naive-ui";
import { defineComponent, watch } from "vue";

import {
  createComponentI18n,
  useGlobalI18nSync,
  type I18nText,
} from "@noob-naive-ui/i18n";
import adminShellMessages from "../locales/AdminShell.json";
import { useAdminProvider } from "../use-admin-provider";
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
    /** Reads and mutates the admin package's presentational state and menu via the single consumption surface. */
    const provider = useAdminProvider();
    /** Reads the host-configured navigation adapter from the admin package runtime. */
    const nav = useAdminShellNavigationStore();

    // Fresh local registry: packaged defaults first, the AdminShell override
    // slice second, so overrides win at the leaf.
    const { t } = createComponentI18n({
      messages: adminShellMessages,
      libraryId: "noob-naive-ui:admin",
      componentId: "AdminShell",
    });

    /**
     * Synchronizes the persisted preference locale into the global Composer
     * one way. Immediate so the hydrated preference is authoritative when the
     * shell mounts; AdminShell locale selections flow store → Composer and
     * inheriting local Composers follow automatically. The host seeds the
     * Composer at creation for the pre-auth login page.
     */
    useGlobalI18nSync(provider.locale);

    /** Owns the router-neutral page-instance tab state machine (provides the controller). */
    const shellContext = useAdminShellTabs({
      getNavigation: () => nav.navigation,
      t,
    });

    /**
     * Computes the naive-ui menu props for the active layout mode.
     *
     * Mode stays vertical until a layout-mode preference exists; the future
     * switcher binds it here and renders `horizontalMenuProps` in a nav slot
     * instead — the `activeKey` watcher below already serves every menu
     * instance, so no per-menu navigation wiring is needed.
     */
    const { activeKey, layout } = useLayoutMenu({
      menus: () => provider.menu.value,
      mode: () => "vertical" as const,
    });

    /**
     * Follows the navigation store's active page into the menu so tab
     * activation, history traversal, and programmatic navigation all keep the
     * highlighted menu key in sync.
     */
    watch(
      () => nav.navigation?.active?.nav.navKey ?? null,
      (key) => {
        if (activeKey.value !== key) activeKey.value = key;
      },
      { immediate: true },
    );

    /**
     * Turns menu selections into navigation. `useLayoutMenu`'s own
     * `onUpdateValue` already writes `activeKey` (and its expanded-keys
     * watcher follows), so this watcher is the single menu → navigation seam;
     * the active-key guard stops programmatic navigation from re-navigating
     * through this watcher.
     */
    watch(activeKey, (key) => {
      if (key == null) return;
      if (key === nav.navigation?.active?.nav.navKey) return;
      void shellContext.navigate({ navKey: String(key) });
    });

    return () => {
      const menuOptions = provider.menu.value;

      const layoutSlots = {
        "nav-left": () => <AdminShellNavLeft />,
        "nav-right": () => <AdminShellNavRight />,
        sidebar: menuOptions?.length
          ? () => <NMenu {...layout.value.verticalMenuProps} />
          : undefined,
        tabbar: nav.navigation ? () => <AdminShellTabbar /> : undefined,
        default: () => slots.default?.({ navigate: shellContext.navigate }),
      };

      return (
        <NLayout position="absolute" class="h-dvh">
          <ProLayout
            {...provider.proLayoutConfig.value}
            navClass="h-auto! py-2 px-2 flex items-center"
            tabbarClass="border-none! h-auto!" // remove the default ProLayout tabbar bottom border
            onUpdateCollapsed={(value) => provider.setSidebarCollapsed(value)}
            showSidebar={Boolean(menuOptions?.length)}
            showTabbar={Boolean(nav.navigation)}
            v-slots={layoutSlots}
          />
        </NLayout>
      );
    };
  },
  {
    name: "AdminShell",
  },
);

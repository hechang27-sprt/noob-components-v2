import { onBeforeUnmount, provide, ref, toRaw, toRef, watch } from "vue";

import { isEqual } from "es-toolkit";

import { useAdminShellTabsStore } from "../stores/tabs";
import type {
  AdminShellDestination,
  AdminShellNavigation,
  AdminShellTab,
  AdminShellTabDescriptor,
  AdminShellTabNavigationResolver,
} from "./admin-shell";
import {
  adminShellContextKey,
  type AdminShellContext,
} from "./use-admin-shell";

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

/** Resolves whether two destinations identify the same page content. */
function sameDestination(
  a: AdminShellDestination,
  b: AdminShellDestination,
): boolean {
  return a.navKey === b.navKey && isEqual(a.payload, b.payload);
}

/** Options for {@link useAdminShellTabs}. */
export interface UseAdminShellTabsOptions {
  /** Reads the current navigation adapter from the shell's stores. */
  getNavigation: () => AdminShellNavigation | null;
  /** Bound translator used for sanitized tab-navigation error feedback. */
  t: (key: string, named?: Record<string, unknown>) => string;
}

/**
 * Owns AdminShell's router-neutral page-instance tab state machine.
 *
 * Manages the committed page-instance registry, the user-visible ordering,
 * the uncommitted open candidate, and history-recovery healing. The host
 * navigation adapter is read reactively via `getNavigation` on each action
 * and on navigation-boundary changes, so the shell stays a single
 * orchestrator while this composable isolates the tab logic. The registry
 * itself lives in {@link useAdminShellTabsStore} so it survives HMR
 * remounts of AdminShell; this composable builds the per-instance
 * {@link AdminShellContext} controller over it and provides it to
 * descendants.
 *
 * @param options - Navigation adapter reader and bound translator.
 * @returns The AdminShellContext controller (tab state and actions),
 * already provided to descendants.
 */
export function useAdminShellTabs(
  options: UseAdminShellTabsOptions,
): AdminShellContext {
  const { getNavigation, t } = options;
  const store = useAdminShellTabsStore();

  /**
   * Stable reactive handles into the shared registry. Pinia unwraps
   * setup-store refs, so `visibleTabs` is the reactive array itself; the
   * context still exposes the ref via `toRef` for descendant readers.
   */
  const tabs = store.tabs;
  const visibleTabs = store.visibleTabs;
  const knownPageIds = store.knownPageIds;
  const healingRevives = store.healingRevives;

  /** Holds sanitized navigation feedback for the current boundary. */
  const tabError = ref<string>();

  /** Synchronizes retained tab indexes with visible order. */
  function reindexTabs(): void {
    visibleTabs.forEach((id, index) => {
      const tab = tabs.get(id);
      if (tab) tab.index = index;
    });
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
      index: visibleTabs.length,
      activationPending: false,
      closePending: false,
    });
    visibleTabs.push(tab.id);
    knownPageIds.add(tab.id);
  }

  /** Returns all committed public descriptors in visible order. */
  function openedDescriptors(): AdminShellTabDescriptor[] {
    return visibleTabs.flatMap((id) => {
      const tab = tabs.get(id);
      return tab ? [snapshotTab(tab)] : [];
    });
  }

  /**
   * Resolves the newest committed page instance for one destination.
   *
   * Both menu-driven navigation and history recovery treat one exact
   * destination — the same navKey and an equal payload record — as the same
   * logical page, so this single policy drives `requestDestination`'s
   * activate-vs-open decision and `recordOrHealActive`'s revive healing
   * alike. A different payload is a different page instance, never a match.
   *
   * @param destination - The destination matched against committed page instances.
   * @returns The newest visible committed tab for the destination, or undefined.
   */
  function newestCommittedFor(
    destination: AdminShellDestination,
  ): AdminShellTab | undefined {
    for (let index = visibleTabs.length - 1; index >= 0; index--) {
      const tab = tabs.get(visibleTabs[index]);
      if (tab && sameDestination(tab.nav, destination)) return tab;
    }
    return undefined;
  }

  /**
   * Records a host-confirmed active page, healing the current history entry
   * when the page is a redundant revive of a committed tab.
   *
   * Browser Back can land on a history entry whose stamped page instance
   * was closed while a newer instance of the same destination is committed;
   * recording the revived id would surface a duplicate tab. The shell owns
   * membership, so it decides to heal and the host adapter rewrites the
   * stale entry in place through a `heal` request. Only page ids the shell
   * has recorded before can be revives — a never-recorded id is a fresh
   * host-confirmed page instance and is always recorded. Revives without a
   * committed destination match (same navKey and payload) are recorded as
   * new page instances (history restore).
   *
   * @param navigation - The navigation adapter owning the confirmed active state.
   * @returns Nothing after recording immediately or scheduling the heal.
   */
  function recordOrHealActive(navigation: AdminShellNavigation): void {
    const active = navigation.active;
    if (
      !active ||
      tabs.has(active.id) ||
      healingRevives.has(active.id) ||
      // A never-recorded id is a fresh host-confirmed page instance, which
      // the shell always records; only ids seen before can be redundant
      // revives of a closed tab.
      !knownPageIds.has(active.id)
    ) {
      recordCurrentTab(active);
      return;
    }
    const match = newestCommittedFor(active.nav);
    if (!match) {
      recordCurrentTab(active);
      return;
    }
    healingRevives.add(active.id);
    void navigation
      .handleNavigation({
        kind: "heal",
        destination: snapshotTab(match),
        current: active,
      })
      .then(({ active: healed }) => {
        // A successful heal re-fires this watch with the committed id,
        // which records as an update; only a no-op heal (location mismatch)
        // leaves the revived page active, recorded here as its own tab.
        if (healed && !tabs.has(healed.id)) recordCurrentTab(healed);
      })
      .catch((error) => {
        console.error("healRevivedTab failed:", error);
        recordCurrentTab(active);
      })
      .finally(() => {
        healingRevives.delete(active.id);
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
    const navigation = getNavigation();
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
    const navigation = getNavigation();
    if (!navigation || store.pendingOpen) return;
    const opened = openedDescriptors();
    const newestMatch = newestCommittedFor(destination);
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
    store.pendingOpen = candidate;
    tabError.value = undefined;
    try {
      const result = await navigation.handleNavigation({
        kind: "open",
        candidate,
        current: navigation.active,
        closeCurrent: false,
      });
      if (
        getNavigation() === navigation &&
        store.pendingOpen === candidate &&
        result.active?.id === candidate.id
      )
        recordCurrentTab(result.active);
    } catch (error) {
      console.error("requestDestination failed:", error);
      if (getNavigation() === navigation && store.pendingOpen === candidate)
        tabError.value = t("errors.unableToNavigate");
    } finally {
      if (store.pendingOpen === candidate) store.pendingOpen = undefined;
    }
  }

  /** Computes the current-order fallback descriptor for an exact close request. */
  function getCloseDestination(
    tab: AdminShellTab,
  ): AdminShellTabDescriptor | null {
    if (getNavigation()?.active?.id !== tab.id)
      return getNavigation()?.active ?? null;
    const id = visibleTabs[tab.index + 1] ?? visibleTabs[tab.index - 1];
    const destination = id ? tabs.get(id) : undefined;
    return destination ? snapshotTab(destination) : null;
  }

  /** Requests closure and removes only the exact record that owned the completion. */
  async function closeTab(id: string): Promise<void> {
    const navigation = getNavigation();
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
        getNavigation() === navigation && // the same navigation adapter still owns the completion
        tab === tabs.get(id) && // the exact tab record that initiated the close is still committed
        tab.id !== active?.id // the host no longer reports that tab as active
      ) {
        tabs.delete(id);
        const index = visibleTabs.indexOf(id);
        if (index !== -1) visibleTabs.splice(index, 1);
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
   * Tracks navigation boundaries and records each host-confirmed page instance.
   */
  watch(
    () => {
      const navigation = getNavigation();
      return {
        navigation,
        activeTabId: navigation?.active?.id,
        activeTabDest: navigation?.active?.nav,
        activeTabLabel: navigation?.active?.label,
        activeTabClosable: navigation?.active?.closable,
      };
    },
    (next, previous) => {
      const { navigation } = next;
      const { navigation: previousNavigation } = previous ?? {};

      const hasNavigation = Boolean(navigation);
      // The registry is shared across HMR remounts, so only a real adapter
      // identity change (or a disappearing adapter) clears it — a fresh
      // setup after a remount must keep the open tabs it already holds
      // instead of wiping them to just the active page.
      if (
        !hasNavigation ||
        (previousNavigation && navigation !== previousNavigation)
      ) {
        store.clearTabs();
        tabError.value = undefined;
      }
      if (hasNavigation && navigation) recordOrHealActive(navigation);
    },
    { immediate: true, flush: "sync" },
  );

  /**
   * Invalidates in-flight shell requests on unmount without dropping the
   * shared tab registry, which must survive HMR remounts.
   *
   * @returns Nothing after clearing the pending open candidate and heal bookkeeping.
   */
  onBeforeUnmount(() => {
    store.pendingOpen = undefined;
    store.healingRevives.clear();
  });

  /** Retains one stable descendant controller for this mounted shell instance. */
  const context: AdminShellContext = {
    navigate: requestDestination,
    tabs,
    visibleTabs: toRef(store, "visibleTabs"),
    tabError,
    canActivateTab,
    activateTab,
    closeTab,
  };
  provide(adminShellContextKey, context);

  return context;
}

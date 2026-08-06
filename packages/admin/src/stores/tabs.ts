import { defineStore } from "pinia";
import { reactive, ref, shallowRef, watch } from "vue";

import type {
  AdminShellTab,
  AdminShellTabCandidate,
} from "../components/admin-shell";
import { useAdminAuthStore } from "./auth";

/**
 * Creates the package-owned tab registry backing AdminShell's page instances.
 *
 * The registry lives in a Pinia store instead of `useAdminShellTabs`' setup
 * scope so it survives Vue HMR reloads: editing a shell dependency remounts
 * AdminShell, and the fresh setup must reuse the same tab state rather than
 * start empty (which would collapse the open-tab list to the active tab).
 * Only serializable state lives here — the controller functions stay in the
 * composable, mirroring the navigation store's "callbacks outside state"
 * contract. Session isolation is preserved by clearing the registry when the
 * package auth store reports an unauthenticated status (logout or cross-tab
 * invalidation); HMR remounts never change auth status, so they never wipe
 * the registry.
 *
 * @returns The reactive tab registry and its reset action.
 */
const setup = () => {
  /** Stores committed page instances by immutable ID. */
  const tabs = reactive(new Map<string, AdminShellTab>());
  /** Owns the sole user-visible page-instance ordering. */
  const visibleTabs = ref<string[]>([]);
  /** Remembers every page-instance id the shell has ever recorded. */
  const knownPageIds = new Set<string>();
  /** Identifies the only uncommitted open candidate still allowed to complete. */
  const pendingOpen = shallowRef<AdminShellTabCandidate>();
  /** Holds revived page-instance ids that already have a heal in flight. */
  const healingRevives = new Set<string>();

  /** Clears ephemeral membership and invalidates an uncommitted candidate. */
  function clearTabs(): void {
    tabs.clear();
    visibleTabs.value.length = 0;
    knownPageIds.clear();
    pendingOpen.value = undefined;
    healingRevives.clear();
  }

  /** Drops the registry when the authenticated session ends. */
  const auth = useAdminAuthStore();
  watch(
    () => auth.status.kind,
    (kind) => {
      if (kind === "anonymous") clearTabs();
    },
  );

  return {
    tabs,
    visibleTabs,
    knownPageIds,
    pendingOpen,
    healingRevives,
    clearTabs,
  };
};

/** The per-application tab registry singleton (never persisted). */
export const useAdminShellTabsStore = defineStore("admin-shell-tabs", setup);

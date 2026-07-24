import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";

import type { AdminShellNavigation } from "../components/admin-shell";

/**
 * Creates the non-persistent frontend navigation runtime owned by the admin package.
 *
 * Hosts configure the router-neutral adapter once per Pinia instance, and
 * AdminShell consumes it reactively.
 *
 * @returns Reactive navigation state and its one-time configuration action.
 */
const setup = () => {
  /** Holds the non-serializable controller outside Pinia's returned state tree. */
  const navigationState = shallowRef<AdminShellNavigation | null>(null);

  /** Exposes the current controller as a getter rather than serializable state. */
  const navigation = computed(() => navigationState.value);

  /** Prevents reconfiguration after the host has supplied the adapter. */
  let configured = false;

  /**
   * Sets the host-owned navigation adapter once per Pinia instance.
   *
   * Subsequent calls are silently ignored.
   *
   * @param nav - Host-built {@link AdminShellNavigation} adapter.
   * @returns Nothing.
   */
  function configure(nav: AdminShellNavigation): void {
    if (configured) return;
    configured = true;
    navigationState.value = nav;
  }

  return { navigation, configure };
};

export const useAdminShellNavigationStore = defineStore(
  "admin-shell-navigation",
  setup,
);

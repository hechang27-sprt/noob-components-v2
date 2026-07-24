import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * Non-persistent frontend menu runtime owned by the admin package.
 *
 * Hosts configure menu options once per Pinia instance and AdminShell
 * consumes them reactively. No router dependency.
 *
 * The store uses {@link AdminMenuTree} (Naive UI `MenuOption[]`) as its
 * configuration type. Menu options are rendered unchanged by AdminShell.
 */
const setup = () => {
  /** Reactive menu options rendered by AdminShell sidebar. */
  const options = ref<unknown[]>([]);

  /** Prevents reconfiguration after the host has supplied menu options. */
  let configured = false;

  /**
   * Sets the host-owned menu options once per Pinia instance.
   *
   * Subsequent calls are silently ignored.
   *
   * @param menuOptions - Starter-built Naive UI `MenuOption[]`.
   */
  function configure(menuOptions: unknown[]): void {
    if (configured) return;
    configured = true;
    options.value = menuOptions;
  }

  return { options, configure };
};

export const useAdminShellMenuStore = defineStore("admin-shell-menu", setup);

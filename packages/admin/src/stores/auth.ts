import { defineStore } from "pinia";
import { ref } from "vue";

import type {
  AdminAuthIdentity,
  AdminAuthStatus,
  AdminLoginValues,
} from "../runtime-contract";

export interface AdminAuthStoreConfig {
  /**
   * Host-owned login effect. Resolves to a presentation-only identity
   * that the store converts into authenticated status.
   */
  login: (values: AdminLoginValues) => Promise<AdminAuthIdentity>;

  /**
   * Host-owned logout effect. May be synchronous.
   * After the callback resolves, the store transitions to anonymous.
   */
  logout: () => Promise<void> | void;
}

/**
 * Non-persistent frontend auth runtime owned by the admin package.
 *
 * Hosts configure callbacks once and observe reactive status.
 * Only package actions mutate status after external callbacks succeed.
 */
export const useAdminAuthStore = defineStore("admin-auth", () => {
  /** Reactive read-only auth status for components. */
  const status = ref<AdminAuthStatus>({ kind: "anonymous", reason: "unknown" });

  /** Prevents use before the host has configured callbacks. */
  const isConfigured = ref(false);

  /** Prevents duplicate concurrent login submissions. */
  const loginPending = ref(false);

  const logoutPending = ref(false);

  /** Holds the most recent login error message for safe UI feedback. */
  const loginError = ref<string>();

  let config: AdminAuthStoreConfig | null = null;

  /**
   * Sets the host-owned callbacks once per Pinia instance.
   *
   * Subsequent calls are silently ignored.
   */
  function configure(cfg: AdminAuthStoreConfig): void {
    if (isConfigured.value) return;
    config = cfg;
    isConfigured.value = true;
  }

  /**
   * Invokes the configured login callback and transitions to authenticated
   * only after the host resolves a presentation identity.
   *
   * @param values - Frontend form values passed directly to the host callback.
   * @returns A promise that resolves after status is updated.
   * @throws When the store has not been configured.
   */
  async function login(values: AdminLoginValues): Promise<void> {
    if (!isConfigured.value) {
      throw new Error(
        "Admin auth store not configured. Call store.configure(...) first.",
      );
    }

    if (loginPending.value) return;

    loginPending.value = true;
    loginError.value = undefined;
    try {
      const identity: AdminAuthIdentity = await config!.login(values);
      status.value = {
        kind: "authenticated",
        userLabel: identity.userLabel,
        avatarUrl: identity.avatarUrl,
        subtitle: identity.subtitle,
      };
    } catch (error: unknown) {
      loginError.value = "Unable to sign in. Please try again.";
      throw error;
    } finally {
      loginPending.value = false;
    }
  }

  /**
   * Invokes the configured logout callback and transitions to anonymous.
   *
   * @returns A promise that resolves after status is updated.
   * @throws When the store has not been configured.
   */
  async function logout(): Promise<void> {
    if (!isConfigured.value) {
      throw new Error(
        "Admin auth store not configured. Call store.configure(...) first.",
      );
    }

    if (logoutPending.value) return;

    logoutPending.value = true;
    try {
      await config!.logout();
      status.value = { kind: "anonymous", reason: "signed-out" };
    } finally {
      logoutPending.value = false;
    }
  }

  return {
    status,
    isConfigured,
    loginPending,
    logoutPending,
    loginError,
    configure,
    login,
    logout,
  };
});

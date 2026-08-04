import { defineStore } from "pinia";
import { ref } from "vue";

import type {
  AdminAuthIdentity,
  AdminAuthRestoreResult,
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

  /**
   * Host-owned restore effect. Called unconditionally on configure.
   * Resolves to authenticated identity or anonymous.
   * A thrown error results in anonymous with reason "unknown".
   */
  restore: () => Promise<AdminAuthRestoreResult>;
}

/** The store instance shape returned by {@link useAdminAuthStore}. */
export type AdminAuthStore = ReturnType<typeof useAdminAuthStore>;

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
   * Settles when the current restore completes.
   * Replaced at the start of each new restore.
   */
  let restoreResolver: (() => void) | null = null;
  let restorePromise: Promise<void> | null = null;

  function settleRestore(): void {
    if (restoreResolver) {
      restoreResolver();
      restoreResolver = null;
      restorePromise = null;
    }
  }

  /**
   * Sets the host-owned callbacks once per Pinia instance.
   *
   * Stores the host-owned effects, enters loading synchronously, and starts
   * restoration unconditionally. Subsequent calls are silently ignored.
   */
  function configure(cfg: AdminAuthStoreConfig): void {
    if (isConfigured.value) return;

    config = cfg;
    isConfigured.value = true;

    // Enter loading before starting authoritative host restoration.
    status.value = { kind: "loading" };
    startRestore();
  }

  /**
   * Returns a promise that resolves when the current restore settles.
   * Throws if the store has not been configured.
   */
  function waitForRestoration(): Promise<void> {
    if (!isConfigured.value) {
      throw new Error(
        "Admin auth store not configured. Call store.configure(...) first.",
      );
    }
    return restorePromise ?? Promise.resolve();
  }

  function startRestore(): void {
    ({ promise: restorePromise, resolve: restoreResolver } =
      Promise.withResolvers<void>());
    void loadAndRestore();
  }

  async function loadAndRestore(): Promise<void> {
    try {
      const result = await config!.restore();

      if (result.kind === "authenticated") {
        status.value = {
          kind: "authenticated",
          ...result.identity,
        };
      } else {
        status.value = { kind: "anonymous", reason: "unknown" };
      }
    } catch {
      // Fail-closed: anonymous with unknown reason.
      status.value = { kind: "anonymous", reason: "unknown" };
    }

    settleRestore();
  }

  /**
   * Invokes the configured login callback and transitions to authenticated
   * only after the host resolves a presentation identity.
   *
   * The complete values, including `remember`, are forwarded unchanged;
   * only the host owns credential and session persistence policy.
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
    waitForRestoration,
  };
});

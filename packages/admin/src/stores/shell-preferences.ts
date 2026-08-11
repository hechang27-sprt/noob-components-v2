import { defineStore } from "pinia";
import { reactive } from "vue";

import type { AdminShellPreferences } from "../runtime-contract";
import {
  createDefaultAdminShellPreferences,
  DEFAULT_FALLBACK_LOCALE,
  loadAdminShellPreferences,
  persistAdminShellPreferences,
  resolveAdminShellPreferencesStorage,
  type AdminShellPreferencesStorage,
  type AdminShellPreferencesStoreOptions,
} from "../runtime/shell-preferences";

/** Non-persisted runtime-only shell state held alongside the preferences blob. */
type AdminShellPreferencesRuntime = {
  /** True once preferences have been hydrated from storage. */
  isHydrated: boolean;
  /** Runtime-only browser dark-mode signal fed by the host matchMedia listener. */
  systemUsesDark: boolean;
  /** Host-owned naive-ui fallback locale; runtime-only, never persisted. */
  fallbackLocale: string;
};

/**
 * Minimal, storage-only preference-state store backing the admin shell.
 *
 * This store is deliberately opaque with respect to preference semantics: it
 * holds two reactive blobs — the persisted `preferences` object and the
 * non-persisted `runtime` object — and offers only blob-level persistence
 * operations (`initialize`, `replacePreferences`, `reset`). Every semantic
 * field, setter, and derivation lives in the `useAdminProvider` composable,
 * which reads and mutates these blobs.
 *
 * Division is by persistence, not meaning: all persisted fields live in
 * `preferences`; all non-persisted runtime state lives in `runtime`.
 */
const setup = () => {
  /** The persisted preferences blob (all fields are stored). */
  const preferences = reactive<AdminShellPreferences>(
    createDefaultAdminShellPreferences(),
  );
  /** Non-persisted runtime state (hydration flag, dark-mode signal, fallback locale). */
  const runtime = reactive<AdminShellPreferencesRuntime>({
    isHydrated: false,
    systemUsesDark: false,
    fallbackLocale: DEFAULT_FALLBACK_LOCALE,
  });

  let storage: AdminShellPreferencesStorage | null = null;
  let stopPersistence: (() => void) | null = null;
  let enablePersistence = true;

  /** Subscribes once to persist the preferences blob on every mutation. */
  function ensurePersistenceSubscription(): void {
    if (stopPersistence) return;
    const store = useAdminShellPreferencesStore();
    stopPersistence = store.$subscribe(
      () => {
        if (!enablePersistence) return;
        persistAdminShellPreferences(storage, preferences);
      },
      { detached: true, flush: "sync" },
    );
  }

  /** Runs an effect while suppressing persistence (hydration, resets). */
  function runWithoutPersistence(run: () => void): void {
    enablePersistence = false;
    try {
      run();
    } finally {
      enablePersistence = true;
    }
  }

  /**
   * Resolves host-owned storage/defaults/fallback, starts persistence, and
   * loads persisted state into the preferences blob. Called once by
   * `AdminProvider` at mount.
   */
  function initialize(options: AdminShellPreferencesStoreOptions = {}): void {
    storage = resolveAdminShellPreferencesStorage(options.storage);
    runtime.fallbackLocale = options.fallbackLocale ?? DEFAULT_FALLBACK_LOCALE;
    ensurePersistenceSubscription();
    runWithoutPersistence(() => {
      Object.assign(
        preferences,
        loadAdminShellPreferences(
          storage,
          createDefaultAdminShellPreferences(options.defaults),
        ),
      );
      runtime.isHydrated = true;
    });
  }

  /** Merges a partial preferences object into the blob (opaque, no normalization). */
  function replacePreferences(value: Partial<AdminShellPreferences>): void {
    Object.assign(preferences, value);
  }

  /** Replaces the entire preferences blob (opaque, no normalization). */
  function reset(preferencesBlob: AdminShellPreferences): void {
    Object.assign(preferences, preferencesBlob);
  }

  return {
    preferences,
    runtime,
    initialize,
    replacePreferences,
    reset,
  };
};

export const useAdminShellPreferencesStore = defineStore(
  "admin-shell-preferences",
  setup,
);

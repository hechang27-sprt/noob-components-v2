import { defineStore } from "pinia";
import { computed, ref } from "vue";

import type {
  AdminFontSize,
  AdminLocaleOption,
  AdminShellPreferences,
  AdminThemeMode,
} from "../runtime-contract";
import {
  createDefaultAdminShellPreferences,
  loadAdminShellPreferences,
  normalizeShellPreferences,
  persistAdminShellPreferences,
  resolveAdminShellPreferencesStorage,
  type AdminShellPreferencesStorage,
  type AdminShellPreferencesStoreOptions,
} from "../runtime/shell-preferences";

export const useAdminShellPreferencesStore = defineStore(
  "admin-shell-preferences",
  () => {
    const themeMode = ref<AdminThemeMode>("system");
    const fontSize = ref<AdminFontSize>("medium");
    const locale = ref("en");
    const availableLocales = ref<AdminLocaleOption[]>([]);
    const sidebarCollapsed = ref(false);
    const isHydrated = ref(false);

    let storage: AdminShellPreferencesStorage | null = null;
    let defaults = createDefaultAdminShellPreferences();
    let stopPersistence: (() => void) | null = null;
    let enablePersistence = true;

    const preferences = computed<AdminShellPreferences>(() => ({
      themeMode: themeMode.value,
      fontSize: fontSize.value,
      locale: locale.value,
      availableLocales: availableLocales.value.map((option) => ({ ...option })),
      sidebarCollapsed: sidebarCollapsed.value,
    }));

    function initialize(options: AdminShellPreferencesStoreOptions = {}): void {
      defaults = createDefaultAdminShellPreferences(options.defaults);
      storage = resolveAdminShellPreferencesStorage(options.storage);
      ensurePersistenceSubscription();

      runWithoutPersistence(() => {
        applyPreferences(loadAdminShellPreferences(storage, defaults));
        isHydrated.value = true;
      });
    }

    function setThemeMode(value: AdminThemeMode): void {
      themeMode.value = value;
    }

    function setFontSize(value: AdminFontSize): void {
      fontSize.value = value;
    }

    function setLocale(value: string): void {
      locale.value = value;
    }

    function setAvailableLocales(value: AdminLocaleOption[]): void {
      availableLocales.value = value.map((option) => ({ ...option }));

      if (
        !availableLocales.value.some((option) => option.key === locale.value)
      ) {
        locale.value = availableLocales.value[0]?.key ?? defaults.locale;
      }
    }

    function setSidebarCollapsed(value: boolean): void {
      sidebarCollapsed.value = value;
    }

    function toggleSidebar(): void {
      sidebarCollapsed.value = !sidebarCollapsed.value;
    }

    function reset(
      options: Pick<AdminShellPreferencesStoreOptions, "defaults"> = {},
    ): void {
      defaults = createDefaultAdminShellPreferences(options.defaults);
      applyPreferences(defaults);
    }

    function replacePreferences(value: Partial<AdminShellPreferences>): void {
      applyPreferences(
        normalizeShellPreferences({
          ...preferences.value,
          ...value,
        }),
      );
    }

    function ensurePersistenceSubscription(): void {
      if (stopPersistence) {
        return;
      }

      const store = useAdminShellPreferencesStore();
      stopPersistence = store.$subscribe(
        () => {
          if (!enablePersistence) {
            return;
          }

          persistAdminShellPreferences(storage, store.preferences);
        },
        { detached: true, flush: "sync" },
      );
    }

    function runWithoutPersistence(run: () => void): void {
      enablePersistence = false;

      try {
        run();
      } finally {
        enablePersistence = true;
      }
    }

    function applyPreferences(value: AdminShellPreferences): void {
      themeMode.value = value.themeMode;
      fontSize.value = value.fontSize;
      locale.value = value.locale;
      availableLocales.value = value.availableLocales.map((option) => ({
        ...option,
      }));
      sidebarCollapsed.value = value.sidebarCollapsed;
    }

    return {
      themeMode,
      fontSize,
      locale,
      availableLocales,
      sidebarCollapsed,
      isHydrated,
      preferences,
      initialize,
      replacePreferences,
      reset,
      setAvailableLocales,
      setFontSize,
      setLocale,
      setSidebarCollapsed,
      setThemeMode,
      toggleSidebar,
    };
  },
);

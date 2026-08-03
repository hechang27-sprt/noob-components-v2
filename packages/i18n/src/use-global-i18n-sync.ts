import { watch, type WatchSource } from "vue";
import { useI18n, type Composer } from "vue-i18n";

/**
 * Options for {@link useGlobalI18nSync}.
 */
export interface UseGlobalI18nSyncOptions {
  /** Whether to push the source's current value into the Composer immediately. */
  immediate?: boolean;
}

/**
 * Synchronizes a locale source ref into the host's single global Composer,
 * one way. Intended for store-owned locale authorities: the store remains
 * the source of truth and the global Composer (and every inheriting local
 * Composer) follows. The host seeds the Composer at creation for pre-shell
 * screens; this composable covers everything after the shell mounts.
 *
 * @param source - The reactive locale authority to watch (ref, computed, or
 * getter).
 * @param options - `immediate` defaults to true so the current value is
 * authoritative at setup time.
 * @returns The host's global Composer, for direct translation use.
 */
export function useGlobalI18nSync(
  source: WatchSource<string>,
  options: UseGlobalI18nSyncOptions = {},
): Composer {
  const globalComposer = useI18n({ useScope: "global" });

  watch(
    source,
    (locale) => {
      globalComposer.locale.value = locale;
    },
    { immediate: options.immediate ?? true },
  );

  return globalComposer;
}

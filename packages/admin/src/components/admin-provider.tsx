import { defineComponent, provide, watch } from "vue";
import { useI18n } from "vue-i18n";
import { NConfigProvider } from "naive-ui";

import {
  libraryI18nOverridesKey,
  type LibraryI18nOverridesRegistry,
} from "@noob-naive-ui/i18n";
import type { AdminMenuTree, AdminThemePreset } from "../runtime-contract";
import type { AdminShellPreferencesStoreOptions } from "../runtime/shell-preferences";
import { useAdminProvider } from "../use-admin-provider";
import { useAdminShellMenuStore } from "../stores/menu";
import { useAdminShellPreferencesStore } from "../stores/shell-preferences";

/**
 * Props-driven root provider that owns mount-safe host configuration for the
 * admin package.
 *
 * It is the package-level replacement for the demo host's manual wiring: it
 * initializes the shell-preferences store, configures the shell menu, and
 * seeds the host global vue-i18n Composer with per-locale messages. The host
 * only needs to `app.use(i18n)` and `app.use(createPinia())` before mounting
 * this component.
 */
export interface AdminProviderProps {
  /** Per-locale message resources keyed by locale code. */
  messages: Record<string, Record<string, unknown>>;
  /** Naive UI `MenuOption[]` rendered by the AdminShell sidebar. */
  menu: AdminMenuTree;
  /** Optional shell-preferences store options (defaults, storage). */
  storeOptions?: AdminShellPreferencesStoreOptions;
  /** Host-supplied selectable theme presets (navbar dropdown options). */
  themes?: AdminThemePreset[];
  /** Default light preset key, used while theme mode is `"system"` and OS is light. */
  defaultTheme?: string;
  /** Default dark preset key, used while theme mode is `"system"` and OS is dark. */
  defaultDarkTheme?: string;
  /** App-scoped text-override registry keyed by each component package's
   * libraryId (e.g. `admin`, `ui`). Replaces the former plugin host install:
   * this component provides the whole registry under {@link libraryI18nOverridesKey},
   * which every package's `createComponentI18n` reads by its own libraryId.
   * Type each entry by importing that package's override type (`AdminLocaleOverrides`,
   * `NoobUiLocaleOverrides`). */
  overrides?: LibraryI18nOverridesRegistry;
}

/**
 * Root provider for the admin package.
 *
 * Mounts an `NConfigProvider` whose theme/locale/componentOptions derive from
 * the shell-preferences store, seeds the host global i18n Composer, and wires
 * the shell menu. Idempotent across HMR remounts because the underlying
 * stores once-guard their own initialization.
 */
export const AdminProvider = defineComponent(
  (props: AdminProviderProps, { slots }) => {
    // 0. Provide the shared, libraryId-keyed text-override registry under the
    // injection key every package's `createComponentI18n` reads, so hosts no
    // longer install a per-package plugin or provider. Each entry's messages are
    // defensively copied to preserve the immutable snapshot contract. Must
    // precede child setup (AdminShell/AdminLoginPage).
    provide(
      libraryI18nOverridesKey,
      Object.fromEntries(
        Object.entries(props.overrides ?? {}).map(([libraryId, entry]) => [
          libraryId,
          structuredClone(entry ?? {}),
        ]),
      ),
    );
    // 1. Resolve the package-owned stores before configuring them, plus the
    //    consumption surface that derives the render config (naiveUiConfig).
    const preferences = useAdminShellPreferencesStore();
    const menu = useAdminShellMenuStore();
    const provider = useAdminProvider();

    // 2. The host global Composer; the host must `app.use(i18n)` before mount.
    const composer = useI18n({ useScope: "global" });

    // 3. Provider-owned (not main.ts) store initialization.
    preferences.initialize(props.storeOptions);

    // 3b. Configure the host-supplied theme presets + polarity defaults so the
    //     composable's derived naiveUiConfig (base theme + merged overrides)
    //     and the navbar dropdown resolve them. The composable owns this
    //     semantic write into the store's opaque runtime blob.
    provider.configureThemePresets(
      props.themes ?? [],
      props.defaultTheme ?? "",
      props.defaultDarkTheme ?? "",
    );

    // 4. Seed the active locale so the PRE-AUTH login page renders the
    //    restored locale (AdminShell keeps syncing ongoing). Read the locale
    //    through the composable (toRef into the store's preferences blob). The
    //    composer object is qualified to avoid unbound-method lint on `.value`.
    composer.locale.value = provider.locale.value;

    // 5. Menu is provider-owned via the `menu` prop.
    menu.configure(props.menu);

    // 6. Seed per-locale messages; the watch re-seeds on prop change (HMR
    //    path: host re-imports resource -> new prop -> re-seed). Qualified
    //    composer call avoids unbound-method lint.
    watch(
      () => props.messages,
      (m) => {
        for (const [locale, msgs] of Object.entries(m)) {
          composer.setLocaleMessage(locale, msgs);
        }
      },
      { immediate: true },
    );

    // 7. Render the naive-ui config provider: spread the derived config so
    //    theme/locale/componentOptions flow. The active theme preset (base
    //    theme + merged overrides) is already resolved into naiveUiConfig by
    //    the composable.
    return () => (
      <NConfigProvider {...provider.naiveUiConfig.value}>
        {slots.default?.()}
      </NConfigProvider>
    );
  },
  {
    name: "AdminProvider",
    props: {
      messages: { type: Object, required: true },
      menu: { type: Array, required: true },
      storeOptions: { type: Object, default: undefined },
      themes: { type: Array, default: undefined },
      defaultTheme: { type: String, default: undefined },
      defaultDarkTheme: { type: String, default: undefined },
      overrides: { type: Object, default: undefined },
    },
  },
);

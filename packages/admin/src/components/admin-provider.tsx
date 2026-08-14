import { defineComponent, watch } from "vue";
import { useI18n } from "vue-i18n";
import { NGlobalStyle } from "naive-ui";

import type { RegistryI18nOverrides } from "@noob-naive-ui/registry";
import {
  AdminUiConfigProvider,
  noobUiI18n,
  type NoobUiLocaleOverrides,
  type NoobUiThemeOverrides,
} from "@noob-naive-ui/ui";
import type {
  AdminMenuTree,
  AdminPresetThemeOverrides,
  AdminThemeOverrides,
  AdminThemePreset,
} from "../runtime-contract";
import type { AdminShellPreferencesStoreOptions } from "../runtime/shell-preferences";
import { useAdminProvider } from "../use-admin-provider";
import { useAdminShellMenuStore } from "../stores/menu";
import { useAdminShellPreferencesStore } from "../stores/shell-preferences";
import { adminI18n } from "../i18n/plugin";
import type { AdminLocaleOverrides } from "../i18n/admin-locale";
import { ProConfigProvider } from "pro-naive-ui";
import { AdminConfigProvider } from "./admin-config-provider";

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
  /** App-scoped i18n text-override registry keyed by each component package's
   * libraryId (e.g. `noob-naive-ui:admin`, `noob-naive-ui:ui`). This prop is
   * i18n-only: it never concerns themeVar overrides, which flow exclusively
   * through the active `AdminThemePreset.themeOverrides`. Each entry is a
   * bare per-library i18n override tree; type it by importing that package's
   * override type (`AdminLocaleOverrides`, `NoobUiLocaleOverrides`). */
  i18nOverrides?: RegistryI18nOverrides;
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
    // 0. AdminProvider is the AGGREGATOR only: it owns host wiring and passes
    // per-package values (i18n + themeOverride) to the ConfigProviders
    // mounted in its render, which provide their own slices of the shared
    // override registry. AdminProvider itself never provides the registry.
    // Theme overrides flow exclusively through the active preset's
    // themeOverrides; `i18nOverrides` is i18n-only.
    const provider = useAdminProvider();
    // 1. Resolve the package-owned stores before configuring them, plus the
    // consumption surface that derives the render config (naiveUiConfig).
    const preferences = useAdminShellPreferencesStore();
    const menu = useAdminShellMenuStore();

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

    // 7. Render the aggregated config providers + naive-ui config provider.
    // AdminProvider passes per-package values (i18n + themeOverride) to the
    // ConfigProviders, which provide their own slices of the shared override
    // registry, so hosts compose only `AdminProvider`. Each `themeOverride` is
    // sourced from the active preset's `themeOverrides` (the sole theme source,
    // reactively re-passed on theme change); the `i18n` reads are boundary-cast
    // because `i18nOverrides` values are loose `unknown` while the ConfigProvider
    // `i18n` prop is per-package typed. The naive-ui base theme + merged
    // overrides are already resolved into `naiveUiConfig` by the composable.
    return () => (
      <AdminConfigProvider
        i18n={
          props.i18nOverrides?.[
            adminI18n.libraryId as keyof RegistryI18nOverrides
          ] as AdminLocaleOverrides | undefined
        }
        themeOverride={
          provider.activeTheme.value?.themeOverrides?.[
            adminI18n.libraryId as keyof AdminPresetThemeOverrides
          ] as AdminThemeOverrides | undefined
        }
      >
        <AdminUiConfigProvider
          i18n={
            props.i18nOverrides?.[
              noobUiI18n.libraryId as keyof RegistryI18nOverrides
            ] as NoobUiLocaleOverrides | undefined
          }
          themeOverride={
            provider.activeTheme.value?.themeOverrides?.[
              noobUiI18n.libraryId as keyof AdminPresetThemeOverrides
            ] as NoobUiThemeOverrides | undefined
          }
        >
          <ProConfigProvider {...provider.naiveUiConfig.value}>
            <NGlobalStyle />
            {slots.default?.()}
          </ProConfigProvider>
        </AdminUiConfigProvider>
      </AdminConfigProvider>
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
      i18nOverrides: { type: Object, default: undefined },
    },
  },
);

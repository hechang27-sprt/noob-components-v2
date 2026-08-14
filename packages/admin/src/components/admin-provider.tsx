import { computed, defineComponent, provide, watch } from "vue";
import { useI18n } from "vue-i18n";
import { NGlobalStyle } from "naive-ui";
import { merge } from "es-toolkit";

import {
  libraryOverridesKey,
  type LibraryI18nOverridesRegistry,
  type LibraryOverridesRegistry,
} from "@noob-naive-ui/i18n";
import {
  AdminUiConfigProvider,
  noobUiI18n,
  type NoobUiLocaleOverrides,
  type NoobUiThemeOverrides,
} from "@noob-naive-ui/ui";
import type {
  AdminMenuTree,
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
  i18nOverrides?: LibraryI18nOverridesRegistry;
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
    // 0. Provide the shared, libraryId-keyed override registry under the
    // injection key every package's `createComponentI18n` / `useUiTheme` reads,
    // so hosts no longer install a per-package plugin or provider. The base
    // layer carries (a) the i18n-only `i18nOverrides` entries (each a bare
    // per-library i18n tree, wrapped `{ i18n }`) and (b) the active theme
    // preset's per-library themeVar overrides (as `{ theme }`), EXCLUDING the
    // libraryIds owned by the ConfigProviders mounted below (admin, ui), whose
    // slices layer on top via the nearest-wins merge. Must precede child setup
    // (AdminShell/AdminLoginPage). Theme overrides never enter via
    // `i18nOverrides` — theme presets are their sole source.
    const provider = useAdminProvider();
    const ownedLibraryIds: Record<string, true> = {
      [adminI18n.libraryId]: true,
      [noobUiI18n.libraryId]: true,
    };
    const baseRegistry = computed<LibraryOverridesRegistry>(() => {
      const base: LibraryOverridesRegistry = {};
      for (const [libraryId, i18n] of Object.entries(
        props.i18nOverrides ?? {},
      )) {
        if (!ownedLibraryIds[libraryId])
          base[libraryId] = { i18n: structuredClone(i18n) };
      }
      for (const [libraryId, theme] of Object.entries(
        provider.activeTheme.value?.themeOverrides ?? {},
      )) {
        if (!ownedLibraryIds[libraryId])
          base[libraryId] = { ...base[libraryId], theme };
      }
      return base;
    });
    provide(libraryOverridesKey, baseRegistry);
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

    // 7. Render the aggregated config providers + naive-ui config provider. The
    // per-package ConfigProviders layer their own slices (admin i18n + preset
    // theme; ui i18n + preset theme) over the base registry via the
    // nearest-wins merge, so hosts compose only `AdminProvider`. Each
    // `themeOverride` is sourced from the active preset's `themeOverrides` (the
    // sole theme source); the `i18n` reads are boundary-cast because
    // `i18nOverrides` values are loose `unknown` while the ConfigProvider `i18n`
    // prop is per-package typed. The naive-ui base theme + merged overrides are
    // already resolved into `naiveUiConfig` by the composable.
    return () => (
      <AdminConfigProvider
        i18n={
          props.i18nOverrides?.[adminI18n.libraryId] as
            | AdminLocaleOverrides
            | undefined
        }
        themeOverride={
          provider.activeTheme.value?.themeOverrides?.[
            adminI18n.libraryId
          ] as AdminThemeOverrides | undefined
        }
      >
        <AdminUiConfigProvider
          i18n={
            props.i18nOverrides?.[noobUiI18n.libraryId] as
              | NoobUiLocaleOverrides
              | undefined
          }
          themeOverride={
            provider.activeTheme.value?.themeOverrides?.[
              noobUiI18n.libraryId
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

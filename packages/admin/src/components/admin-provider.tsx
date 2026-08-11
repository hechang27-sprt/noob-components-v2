import { defineComponent, provide, watch } from "vue";
import { useI18n } from "vue-i18n";
import { NConfigProvider, type GlobalThemeOverrides } from "naive-ui";

import {
  adminI18nOverridesKey,
  type AdminI18nPluginOptions,
} from "../i18n/plugin";
import type { AdminMenuTree } from "../runtime-contract";
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
  /** Host naive-ui global theme overrides merged on top of the store's. */
  theme?: GlobalThemeOverrides;
  /** Per-locale, per-component overrides of admin package text. Replaces the
   *  former `app.use(adminI18nPlugin, { messages })` host install: this
   *  component provides the override snapshot via {@link adminI18nOverridesKey},
   *  which `createComponentI18n` injects when merging package text. */
  overrides?: AdminI18nPluginOptions["messages"];
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
    // 0. Provide the admin package text-override snapshot under the injection
    //    key `createComponentI18n` reads, so hosts no longer install
    //    `adminI18nPlugin`. Defensively copied to preserve the immutable
    //    snapshot contract. Must precede child setup (AdminShell/AdminLoginPage).
    provide(adminI18nOverridesKey, {
      messages: props.overrides ? structuredClone(props.overrides) : {},
    });
    // 1. Resolve the package-owned stores before configuring them, plus the
    //    consumption surface that derives the render config (naiveUiConfig).
    const preferences = useAdminShellPreferencesStore();
    const menu = useAdminShellMenuStore();
    const provider = useAdminProvider();

    // 2. The host global Composer; the host must `app.use(i18n)` before mount.
    const composer = useI18n({ useScope: "global" });

    // 3. Provider-owned (not main.ts) store initialization.
    preferences.initialize(props.storeOptions);

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
    //    theme/locale/componentOptions flow, and merge the host `theme`
    //    overrides on top of the derived themeOverrides.
    return () => (
      <NConfigProvider
        {...provider.naiveUiConfig.value}
        themeOverrides={{
          ...provider.naiveUiConfig.value.themeOverrides,
          ...props.theme,
        }}>
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
      theme: { type: Object, default: undefined },
      overrides: { type: Object, default: undefined },
    },
  },
);

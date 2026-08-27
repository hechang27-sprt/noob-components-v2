import { NButton, NIcon, NP } from "naive-ui";
import { computed, defineComponent } from "vue";

import { getComponentI18n, resolveI18nText } from "@noob-naive-ui/i18n";
import { UiCardTab, UiCardTabs } from "@noob-naive-ui/ui";

import { useAdminShellNavigationStore } from "../stores/navigation";
import { useAdminShell } from "./use-admin-shell";
import { type AdminShellTab } from "./admin-shell";
import { CloseSharp } from "@vicons/ionicons5";

/**
 * Renders AdminShell's `tabbar` ProLayout slot.
 *
 * Pure-presentational Vue component: reads the full shell controller
 * (`useAdminShell`) and the nearest component Composer (`getComponentI18n`)
 * for both package-owned text and host-authored tab labels (root-message
 * fallback resolves host-global keys), plus the navigation store for the
 * active id. Rendered as a descendant of AdminShell so those composition
 * calls resolve against its context; no props or callback data.
 *
 * Uses the ui package's `UiCardTabs` connected tab bar as the tab strip
 * (instead of naive-ui `NTabs`), with the per-tab close affordance rendered at
 * the use site inside each `UiCardTab`'s fully-customizable default slot.
 *
 * Declared with `defineComponent` (rather than a plain function component)
 * so plugin-vue-jsx hot-registers the module: an HMR edit re-executes and
 * reloads only this leaf instead of propagating to the shell, whose reload
 * remounts it and drops the setup-scoped open-tab registry.
 *
 * @returns The tabbar slot's JSX.
 */
/**
 * Renders the ordered tab strip for one snapshot of open pages.
 *
 * Separate component boundary with a stable `descriptors` array prop: the
 * strip (and every UiCardTab/naive child below it) skips re-render when the
 * bar wrapper re-renders for unrelated reasons (theme vars changing on a
 * size/theme switch). Without this boundary the strip was materialized inline
 * in UiCardTabs' default slot, so every wrapper render re-executed the whole
 * tab map and re-created each naive child's interop props — making any shell
 * flush linear in the tab count.
 */
const AdminTabStrip = defineComponent(
  (props: { descriptors: AdminShellTab[] }) => {
    const shell = useAdminShell();
    const { t } = getComponentI18n();
    const nav = useAdminShellNavigationStore();

    const activeTabId = computed(() => nav.navigation?.active?.id ?? "");

    return () => (
      <>
        {props.descriptors.map((tab) => {
          const label = resolveI18nText(tab.label, t);
          const isActive = tab.id === activeTabId.value;
          return (
            <UiCardTab key={tab.id} tabKey={tab.id} mode="tab">
              <span class="inline-flex items-center justify-between gap-2 w-full overflow-hidden h-full">
                <span class="overflow-hidden text-ellipsis whitespace-nowrap">
                  {label}
                </span>
                {tab.closable !== false ? (
                  <NButton
                    text
                    themeOverrides={{
                      textColorTextHover: isActive ? undefined : "#FFF",
                      textColorTextFocus: isActive ? undefined : "#FFF",
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      void shell.closeTab(tab.id);
                    }}>
                    <NIcon>
                      <CloseSharp />
                    </NIcon>
                  </NButton>
                ) : null}
              </span>
            </UiCardTab>
          );
        })}
      </>
    );
  },
  {
    name: "AdminTabStrip",
  },
);

export const AdminShellTabbar = defineComponent(
  () => {
    const shell = useAdminShell();
    const { t } = getComponentI18n();
    const nav = useAdminShellNavigationStore();

    const activeTabId = computed(() => nav.navigation?.active?.id ?? "");

    // Stable descriptor snapshot: SAME array identity while open tabs are
    // unchanged, so AdminTabStrip (and every tab below it) skips re-render
    // when the wrapper re-renders for theme-var changes. A fresh array is
    // only produced when `visibleTabs` or a tab record actually changed.
    const stripDescriptors = computed<AdminShellTab[]>(() =>
      shell.visibleTabs.value
        .map((id) => shell.tabs.get(id))
        .filter((tab): tab is AdminShellTab => tab !== undefined),
    );

    // NOTE: reactive reads must happen INSIDE the returned JSX — the vapor
    // compiler hoists setup-scope consts out of the render effect (frozen
    // active tab highlight otherwise).
    return () => (
      <div
        class="w-full h-full"
        role="tablist"
        aria-label={t("tabs.openPages")}>
        <UiCardTabs
          modelValue={activeTabId.value}
          onUpdate:modelValue={(key: string | number) =>
            void shell.activateTab(String(key))
          }>
          <AdminTabStrip descriptors={stripDescriptors.value} />
        </UiCardTabs>
        {shell.tabError.value ? (
          <div role="alert" data-admin-tab-error>
            <NP>{shell.tabError.value}</NP>
          </div>
        ) : null}
      </div>
    );
  },
  {
    name: "AdminShellTabbar",
  },
);

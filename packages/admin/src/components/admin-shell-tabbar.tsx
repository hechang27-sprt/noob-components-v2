import { NTab, NTabs } from "naive-ui";
import type { VNode } from "vue";

import { getComponentI18n, resolveI18nText } from "@noob-naive-ui/i18n";

import { useAdminShellNavigationStore } from "../stores/navigation";
import { useAdminShell } from "./use-admin-shell";

/**
 * Renders AdminShell's `tabbar` ProLayout slot.
 *
 * Pure-presentational Vue functional component: reads the full shell
 * controller (`useAdminShell`) and the nearest component Composer
 * (`getComponentI18n`) for both package-owned text and host-authored tab
 * labels (root-message fallback resolves host-global keys), plus the
 * navigation store for the active id. Rendered as a descendant of AdminShell
 * so those composition calls resolve against its context; no props or
 * callback data.
 *
 * @returns The tabbar slot's JSX.
 */
export function AdminShellTabbar(): VNode {
  const shell = useAdminShell();
  const { t } = getComponentI18n();
  const nav = useAdminShellNavigationStore();

  const activeId = nav.navigation?.active?.id;
  const tabError = shell.tabError.value;

  return (
    <div class="min-w-0" role="tablist" aria-label={t("tabs.openPages")}>
      <NTabs
        type="card"
        value={activeId}
        tabsPadding={8}
        data-admin-tabs
        onBeforeLeave={shell.canActivateTab}
        onUpdateValue={(key: string | number) =>
          void shell.activateTab(String(key))
        }
        onClose={(key: string | number) => void shell.closeTab(String(key))}
        tabClass="data-[admin-tab-active=true]:h-9/10 h-4/5 self-end rounded-t-xl!">
        {shell.visibleTabs.value.map((id) => {
          const tab = shell.tabs.get(id);
          const active = activeId === tab?.id;
          /** Supplies tab semantics that Naive UI does not declare as component props. */
          const tabAccessibilityProps = {
            role: "tab",
            "aria-selected": active,
            "aria-current": active ? "page" : undefined,
          };
          return tab ? (
            <NTab
              key={tab.id}
              name={tab.id}
              tab={resolveI18nText(tab.label, t)}
              closable={tab.closable !== false}
              data-admin-tab-key={tab.id}
              data-admin-tab-active={active}
              {...tabAccessibilityProps}
            />
          ) : null;
        })}
      </NTabs>
      {tabError ? (
        <p role="alert" data-admin-tab-error>
          {tabError}
        </p>
      ) : null}
    </div>
  );
}

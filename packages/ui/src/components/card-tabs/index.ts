/**
 * Compound component API for the connected card-tab bar.
 *
 * Usage:
 * ```tsx
 * <CardTabs.Root modelValue={activeKey} onUpdate:modelValue={setActive}>
 *   <CardTabs.Tab tabKey="tab-1">Tab 1</CardTabs.Tab>
 *   <CardTabs.Tab tabKey="tab-2">Tab 2</CardTabs.Tab>
 * </CardTabs.Root>
 * ```
 *
 * `CardTabs.Root` owns the grid layout, scroll container, and keyboard
 * navigation. `CardTabs.Tab` registers with the shared controller on
 * mount and renders a `grid-cols-subgrid` scope positioned by runtime
 * CSS variables.
 */
import { Root } from "./root";
import { Tab } from "./tab";
export { type CardTabsThemeVars } from "./root";

export const CardTabs = {
  Root,
  Tab,
};

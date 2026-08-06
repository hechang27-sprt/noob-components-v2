import type { ProLayoutProps } from "pro-naive-ui";

import type { AdminFontSize } from "../runtime-contract";

/**
 * ProLayout props derived from admin shell preferences.
 *
 * The preferences store exposes this as a computed; AdminShell binds it
 * directly: `<ProLayout {...preferences.proLayoutConfig} …>` alongside the
 * navigation-derived props it owns (showSidebar, showTabbar, slots). It is
 * derived presentation state, never part of serialized preferences, and
 * mirrors `AdminNaiveUiConfig` for naive-ui's `NConfigProvider`.
 */
export type AdminProLayoutConfig = Pick<
  ProLayoutProps,
  "tabbarHeight" | "collapsed"
>;

/**
 * Tabbar container heights (px) matching each font-size preference tier.
 *
 * Browser-measured 2026-08-06 in the demo (naive-ui@2.44.1,
 * pro-naive-ui@3.2.3). The card-type tab nav is intrinsic-height: NTab
 * heights are small 35.1 / medium 38.7 / large 45.0 plus a ~5px structural
 * top offset (naive-ui card-tab padding), giving nav content heights of
 * 39/43/50. Each value adds the 1px tabbar border and ~1px headroom.
 * naive-ui's per-component size tiers are discrete, so tab height is not
 * proportional to the 13/14/16px theme fonts. Re-measure when a naive-ui bump
 * changes tab heights (see spec: ProLayout chrome-size contract).
 */
export const PRO_LAYOUT_TABBAR_HEIGHTS: Record<AdminFontSize, number> = {
  small: 41,
  medium: 45,
  large: 52,
};

/**
 * Resolves the ProLayout tabbar container height for a font-size preference
 * tier.
 *
 * @param size - The active font-size preference tier.
 * @returns The matching tabbar height in pixels.
 */
export function resolveAdminProLayoutTabbarHeight(size: AdminFontSize): number {
  return PRO_LAYOUT_TABBAR_HEIGHTS[size];
}

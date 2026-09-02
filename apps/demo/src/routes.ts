import {
  defineAdminRouteRegistry,
  defineAdminRouteUrlCodec,
} from "@noob-naive-ui/admin-vue-router";
import { z } from "zod";

import { DashboardDemoPage } from "./pages/demo/dashboard-demo-page";
import { HmrTestPage } from "./pages/demo/hmr-test-page";
import { DetailDemoPage } from "./pages/demo/detail-demo-page";
import { InternationalizationDemoPage } from "./pages/demo/internationalization-demo-page";
import { ReportsDemoPage } from "./pages/demo/reports-demo-page";
import { SettingsDemoPage } from "./pages/demo/settings-demo-page";
import { AdminShellTabDescriptor } from "@noob-naive-ui/admin";
import { AdminShellDestination } from "@noob-naive-ui/admin";

/** Validates the router-neutral payload for a report-detail destination. */
const detailPayloadSchema = z.object({ reportId: z.string().min(1) });

/** Binds demo page routes and URL codecs to the shared AdminShell/Vue Router adapter. */
export const demoRouteRegistry = defineAdminRouteRegistry({
  dashboard: {
    route: {
      path: "",
      component: DashboardDemoPage,
      props: false,
    },
  },
  internationalization: {
    route: {
      path: "demo/internationalization",
      component: InternationalizationDemoPage,
      props: false,
    },
  },
  hmrTest: {
    route: {
      path: "demo/hmr-test",
      component: HmrTestPage,
      props: false,
    },
  },
  reports: {
    route: {
      path: "reports",
      component: ReportsDemoPage,
      props: false,
    },
  },
  settings: {
    route: {
      path: "settings",
      component: SettingsDemoPage,
      props: false,
    },
  },
  detail: {
    route: {
      path: "detail/:reportId",
      component: DetailDemoPage,
      props: true,
    },
    codec: defineAdminRouteUrlCodec(detailPayloadSchema, {
      /** Maps the validated report identity to the detail route path parameter. */
      encode(payload) {
        return { params: { reportId: payload.reportId } };
      },
      /** Reconstructs raw report-detail payload from the normalized detail URL. */
      decode(route, _state) {
        const reportId = route.params.reportId;
        return { reportId: typeof reportId === "string" ? reportId : "" };
      },
    }),
  },
});

/** Identifies one demo destination and its equivalent generated Vue Router route name. */
export type DemoNavKey = (typeof demoRouteRegistry.navKeys)[number];

/** Describes host-owned presentation assigned when one destination opens as an AdminShell tab. */
type DemoTabPresentation = Pick<AdminShellTabDescriptor, "label" | "closable">;

/**
 * Resolves destination-specific tab labels and close policy outside the router registry.
 *
 * Labels are I18nText message keys resolved by AdminShell against the global
 * Composer, so open and restored tabs follow locale switches reactively.
 */
const tabPresentation: Record<
  DemoNavKey,
  (destination: AdminShellDestination) => DemoTabPresentation
> = {
  /** Supplies the fixed non-closable home-tab presentation. */
  dashboard: () => ({
    label: { kind: "i18n", key: "tabs.dashboard" },
    closable: false,
  }),
  /** Supplies the routed i18n demonstration tab presentation. */
  internationalization: () => ({
    label: { kind: "i18n", key: "tabs.internationalization" },
    closable: true,
  }),
  /** Supplies the HMR showcase tab presentation. */
  hmrTest: () => ({
    label: { kind: "i18n", key: "tabs.hmrTest" },
    closable: true,
  }),
  /** Supplies the report-list tab presentation. */
  reports: () => ({
    label: { kind: "i18n", key: "tabs.reports" },
    closable: true,
  }),
  /** Supplies the settings tab presentation. */
  settings: () => ({
    label: { kind: "i18n", key: "tabs.settings" },
    closable: true,
  }),
  /** Supplies a parameter-aware title for one report-detail tab. */
  detail: (destination: AdminShellDestination): DemoTabPresentation => {
    const reportId = destination.payload?.reportId;
    return {
      label: {
        kind: "i18n",
        key: "tabs.detail",
        named: { id: typeof reportId === "string" ? reportId : "detail" },
      },
      closable: true,
    };
  },
};

/**
 * Creates a host-owned public tab descriptor from a page-instance ID and destination.
 *
 * @param id - Immutable page-instance identity selected by the host.
 * @param destination - Canonical shell destination whose key selects tab presentation.
 * @returns The complete descriptor supplied to the shell navigation adapter.
 * @throws When the destination key is outside the demo route registry.
 */
export function describeDemoDestination(
  id: string,
  destination: AdminShellDestination,
): AdminShellTabDescriptor {
  const navKey = destination.navKey as DemoNavKey;
  const resolvePresentation = tabPresentation[navKey];
  if (!resolvePresentation) {
    throw new Error(`Unknown demo tab destination "${destination.navKey}".`);
  }
  return {
    id,
    nav: destination,
    ...resolvePresentation(destination),
  };
}

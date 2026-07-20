import { NButton } from "naive-ui";
import type { RouteRecordRaw } from "vue-router";
import { computed, defineComponent } from "vue";

import { useAdminShell } from "@noob-naive-ui/admin";

/** Describes the starter-owned metadata for one locally rendered demonstration route. */
export type DemoRouteDefinition = {
  /** Supplies the stable Vue Router name used to identify the route. */
  name: string;
  /** Supplies the stable URL path used to resolve this host-owned destination. */
  path: string;
  /** Supplies the human-readable label used by the menu and shell tab. */
  label: string;
  /** Controls whether the corresponding shell tab may be closed. */
  closable: boolean;
  /** Supplies the local page component rendered by Vue Router. */
  component: RouteRecordRaw["component"];
};

/**
 * Renders a concise demonstration page with a semantic title and explanatory copy.
 *
 * @param title - The page heading and basis for the local component name.
 * @param description - The user-facing explanation rendered beneath the heading.
 * @returns A local Vue route component that renders the supplied page content.
 */
function createDemoPage(title: string, description: string) {
  return defineComponent({
    name: `${title.replaceAll(" ", "")}DemoPage`,
    /**
     * Creates the page render function from the route's static title and description.
     *
     * @returns A render function for the local demonstration page.
     */
    setup() {
      return () => (
        <main class="p-6">
          <h1 class="m-0 text-2xl font-semibold">{title}</h1>
          <p class="mt-3 max-w-2xl text-base leading-6">{description}</p>
        </main>
      );
    },
  });
}


/** Renders the reports page with an application-owned detail navigation trigger. */
const ReportsDemoPage = defineComponent({
  name: "ReportsDemoPage",
  /**
   * Creates the reports page and its non-menu detail action.
   *
   * @returns A render function for the reports demonstration page.
   */
  setup() {
    /** Retains the nearest shell's descendant navigation control. */
    const { navigate } = useAdminShell();
    /** Opens a new detail page instance even when the same destination is already open. */
    function openDetail(): void {
      const randomYear = Math.round(Math.random() * 40 + 2000);
      void navigate(
        {
          navKey: "/detail",
          params: { reportId: `quarterly-${randomYear}` },
        },
        () => ({ kind: "open" }),
      );
    }

    return () => (
      <main class="p-6">
        <h1 class="m-0 text-2xl font-semibold">Reports</h1>
        <p class="mt-3 max-w-2xl text-base leading-6">
          Open a report detail page that is intentionally absent from the
          sidebar menu.
        </p>
        <NButton type="primary" onClick={openDetail}>
          Open quarterly report detail
        </NButton>
      </main>
    );
  },
});

/** Renders the non-menu detail route reached through an application-owned button. */
const DetailDemoPage = defineComponent({
  name: "DetailDemoPage",
  /**
   * Creates detail content from the active shell descriptor's router-neutral params.
   *
   * @returns A render function for the non-menu detail page.
   */
  setup() {
    /** Retains the nearest shell's reactive public navigation context. */
    const { active } = useAdminShell();
    /** Reactively reads the report identity retained in the active public descriptor. */
    const reportId = computed(() => {
      const value = active.value?.nav.params?.reportId;
      return typeof value === "string" ? value : "unknown";
    });
    return () => (
      <main class="p-6">
        <h1 class="m-0 text-2xl font-semibold">
          Report detail: {reportId.value}
        </h1>
        <p class="mt-3 max-w-2xl text-base leading-6">
          Report {reportId.value} was opened by a page-owned action and has no
          sidebar menu item.
        </p>
      </main>
    );
  },
});

/** Defines the demo's complete local route registry and tab presentation metadata. */
export const demoRouteDefinitions = [
  {
    name: "dashboard",
    path: "/",
    label: "Dashboard",
    closable: false,
    component: createDemoPage(
      "Dashboard",
      "This local page demonstrates the non-closable home tab in the public admin shell.",
    ),
  },
  {
    name: "reports",
    path: "/reports",
    label: "Reports",
    closable: true,
    component: ReportsDemoPage,
  },
  {
    name: "settings",
    path: "/settings",
    label: "Settings",
    closable: true,
    component: createDemoPage(
      "Settings",
      "Use the runtime controls in the shell header to try its persisted frontend preferences.",
    ),
  },
  {
    name: "detail",
    path: "/detail",
    label: "Report detail",
    closable: true,
    component: DetailDemoPage,
  },
] satisfies DemoRouteDefinition[];

/** Supplies the Vue Router records registered by the frontend-only demonstration app. */
export const demoRoutes = demoRouteDefinitions.map(
  ({ name, path, component }) => ({ name, path, component }),
) satisfies RouteRecordRaw[];

import {
  useAdminShell,
  useAdminShellPreferencesStore,
} from "@noob-naive-ui/admin";
import {
  defineAdminRouteRegistry,
  defineAdminRouteUrlCodec,
} from "@noob-naive-ui/admin-vue-router";
import { PrototypeCard } from "@noob-naive-ui/prototype-i18n-verification";
import { NButton } from "naive-ui";
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import { z } from "zod";

/**
 * Renders a concise demonstration page with a semantic title and explanatory copy.
 *
 * @param title - The page heading and basis for the local component name.
 * @param description - The user-facing explanation rendered beneath the heading.
 * @returns A local Vue route component that renders the supplied page content.
 */
function createDemoPage(title: string, description: string) {
  return defineComponent(
    /**
     * Creates the page render function from the route's static title and description.
     *
     * @returns A render function for the local demonstration page.
     */
    () => () => (
      <main class="p-6">
        <h1 class="m-0 text-2xl font-semibold">{title}</h1>
        <p class="mt-3 max-w-2xl text-base leading-6">{description}</p>
      </main>
    ),
    { name: `${title.replaceAll(" ", "")}DemoPage` },
  );
}

/** Renders the dashboard page with the localized prototype card and locale state. */
const DashboardDemoPage = defineComponent(
  /**
   * Composes the home dashboard with the i18n prototype verification card.
   *
   * @returns A render function exposing the preference/global locale data attributes.
   */
  () => {
    /** Reads the host preference locale for the verification harness. */
    const preferences = useAdminShellPreferencesStore();
    /** Reads the demo's single global Composer locale for the harness. */
    const { locale: globalLocale } = useI18n({ useScope: "global" });

    return () => (
      <main
        class="p-6"
        data-demo-preference-locale={preferences.locale}
        data-demo-global-locale={globalLocale.value}>
        <h1 class="m-0 text-2xl font-semibold">Dashboard</h1>
        <p class="mt-3 max-w-2xl text-base leading-6">
          This local page demonstrates the non-closable home tab in the public
          admin shell.
        </p>
        <PrototypeCard />
      </main>
    );
  },
  { name: "DashboardDemoPage" },
);

/** Renders the reports page with an application-owned detail navigation trigger. */
const ReportsDemoPage = defineComponent(
  /**
   * Creates the reports page and its non-menu detail action.
   *
   * @returns A render function for the reports demonstration page.
   */
  () => {
    /** Retains the nearest shell's descendant navigation control. */
    const { navigate } = useAdminShell();
    /** Opens a new detail page instance even when the same destination is already open. */
    function openDetail(): void {
      const randomYear = Math.round(Math.random() * 40 + 2000);
      navigate(
        {
          navKey: "detail",
          payload: { reportId: `quarterly-${randomYear}` },
        },
        () => ({ kind: "open" }),
      ).catch((error: unknown) => {
        console.error("Navigation failed:", error);
      });
    }

    return () => (
      <main class="p-6">
        <h1 class="m-0 text-2xl font-semibold">Reports</h1>
        <p class="mt-3 max-w-2xl text-base leading-6">
          Open a report detail page that is intentionally absent from the
          sidebar menu.
        </p>
        <NButton type="primary" onClick={() => openDetail()}>
          Open quarterly report detail
        </NButton>
      </main>
    );
  },
  { name: "ReportsDemoPage" },
);

/** Renders the non-menu detail route reached through an application-owned button. */
const DetailDemoPage = defineComponent(
  /**
   * Creates detail content from the explicit report route prop.
   *
   * @param props - Contains the report identity projected from the URL path parameter.
   * @returns A render function for the non-menu detail page.
   */
  (props: { reportId: string }) => () => (
    <main class="p-6">
      <h1 class="m-0 text-2xl font-semibold">
        Report detail: {props.reportId}
      </h1>
      <p class="mt-3 max-w-2xl text-base leading-6">
        Report {props.reportId} was opened by a page-owned action and has no
        sidebar menu item.
      </p>
    </main>
  ),
  {
    name: "DetailDemoPage",
    props: {
      reportId: { type: String, required: true },
    },
  },
);

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
      component: createDemoPage(
        "Settings",
        "Use the runtime controls in the shell header to try its persisted frontend preferences.",
      ),
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

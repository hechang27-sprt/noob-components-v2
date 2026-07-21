import { NButton } from "naive-ui";
import type {
  RouteLocationNamedRaw,
  RouteLocationNormalizedLoaded,
  RouteRecordRaw,
} from "vue-router";
import { defineComponent } from "vue";

import { useAdminShell, type AdminShellDestination } from "@noob-naive-ui/admin";

/** Describes the starter-owned metadata for one locally rendered demonstration route. */
export type DemoRouteDefinition = {
  /** Supplies the stable URL path used to resolve this host-owned destination. */
  path: string;
  /** Supplies the human-readable label used by the menu and shell tab. */
  label: string;
  /** Controls whether the corresponding shell tab may be closed. */
  closable: boolean;
  /** Supplies the local page component rendered by Vue Router. */
  component: RouteRecordRaw["component"];
  /** Controls whether Vue Router projects declared path parameters into component props. */
  props?: boolean;
  /** Converts destination params to URL state and reconstructs them from a matched URL. */
  urlCodec: DemoRouteUrlCodec;
};

/** Describes the URL-owned portion produced for one named Vue Router location. */
type DemoRouteUrlState = {
  /** Supplies declared dynamic path parameters. */
  params?: RouteLocationNamedRaw["params"];
  /** Supplies explicit query parameters. */
  query?: RouteLocationNamedRaw["query"];
  /** Supplies an optional URL fragment including its leading hash marker. */
  hash?: string;
};

/** Defines the reversible boundary between shell destination params and explicit URL state. */
type DemoRouteUrlCodec = {
  /**
   * Converts router-neutral destination params into explicit path/query/hash state.
   *
   * @param params - Serializable destination input requested through AdminShell.
   * @returns URL state merged into the named Vue Router location.
   */
  encode: (params: AdminShellDestination["params"]) => DemoRouteUrlState;
  /**
   * Reconstructs router-neutral destination params from one matched URL.
   *
   * @param route - Current normalized Vue Router location.
   * @returns Destination params reconstructed exclusively from explicit URL state.
   */
  decode: (
    route: RouteLocationNormalizedLoaded,
  ) => AdminShellDestination["params"];
};

/** Rejects hidden destination params for routes whose URL has no parameter contract. */
const parameterlessUrlCodec: DemoRouteUrlCodec = {
  /**
   * Rejects destination params because this route has no corresponding URL fields.
   *
   * @param params - Destination params that must be absent or empty.
   * @returns Empty URL state for a parameterless route.
   */
  encode(params) {
    if (params && Object.keys(params).length > 0) {
      throw new Error("This demo destination does not accept params.");
    }
    return {};
  },
  /**
   * Reconstructs no params because this route has no corresponding URL fields.
   *
   * @param _route - Current route, intentionally unused by the parameterless codec.
   * @returns No destination params.
   */
  decode(_route) {
    return undefined;
  },
};

/** Maps report detail destination params to and from its declared path parameter. */
const detailUrlCodec: DemoRouteUrlCodec = {
  /**
   * Validates and writes the requested report identity into the route path.
   *
   * @param params - Destination params expected to contain one string reportId.
   * @returns URL path params for the report detail route.
   */
  encode(params) {
    const reportId = params?.reportId;
    if (typeof reportId !== "string" || !reportId) {
      throw new Error("Report detail requires a reportId.");
    }
    return { params: { reportId } };
  },
  /**
   * Validates and reconstructs report detail input from the matched path.
   *
   * @param route - Current detail route containing the explicit reportId segment.
   * @returns Router-neutral destination params reconstructed from the URL.
   */
  decode(route) {
    const reportId = route.params.reportId;
    if (typeof reportId !== "string" || !reportId) {
      throw new Error("Report detail requires a reportId.");
    }
    return { reportId };
  },
};
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
      void navigate(
        {
          navKey: "detail",
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

/** Maps every stable shell navigation key to its host-owned Vue Router definition. */
export const demoRouteDefinitions = {
  dashboard: {
    path: "/",
    label: "Dashboard",
    closable: false,
    component: createDemoPage(
      "Dashboard",
      "This local page demonstrates the non-closable home tab in the public admin shell.",
    ),
    props: false,
    urlCodec: parameterlessUrlCodec,
  },
  reports: {
    path: "/reports",
    label: "Reports",
    closable: true,
    component: ReportsDemoPage,
    props: false,
    urlCodec: parameterlessUrlCodec,
  },
  settings: {
    path: "/settings",
    label: "Settings",
    closable: true,
    component: createDemoPage(
      "Settings",
      "Use the runtime controls in the shell header to try its persisted frontend preferences.",
    ),
    props: false,
    urlCodec: parameterlessUrlCodec,
  },
  detail: {
    path: "/detail/:reportId",
    label: "Report detail",
    closable: true,
    component: DetailDemoPage,
    props: true,
    urlCodec: detailUrlCodec,
  },
} satisfies Record<string, DemoRouteDefinition>;

/** Identifies one host-owned destination and its equivalent Vue Router route name. */
export type DemoNavKey = keyof typeof demoRouteDefinitions;

/**
 * Resolves one stable nav key to its host-owned route definition.
 *
 * @param navKey - Shell destination key equivalent to a demo route name.
 * @returns The matching route definition.
 * @throws When the destination key is not registered by the demo host.
 */
export function getDemoRouteDefinition(navKey: string): DemoRouteDefinition {
  const definition = (
    demoRouteDefinitions as Readonly<Record<string, DemoRouteDefinition>>
  )[navKey];
  if (!definition) throw new Error("Unknown demo destination.");
  return definition;
}

/**
 * Converts one shell destination into a named location with explicit URL state.
 *
 * @param destination - Router-neutral shell destination interpreted by the demo host.
 * @returns Named Vue Router location produced through the destination's URL codec.
 */
export function destinationToRouteLocation(
  destination: AdminShellDestination,
): RouteLocationNamedRaw {
  const definition = getDemoRouteDefinition(destination.navKey);
  return {
    name: destination.navKey,
    ...definition.urlCodec.encode(destination.params),
  };
}

/**
 * Reconstructs one shell destination from the current named route and explicit URL state.
 *
 * @param route - Current normalized Vue Router location.
 * @returns The reconstructed destination, or null for a route outside the demo registry.
 */
export function routeLocationToDestination(
  route: RouteLocationNormalizedLoaded,
): AdminShellDestination | null {
  if (typeof route.name !== "string") return null;
  const definition = (
    demoRouteDefinitions as Readonly<Record<string, DemoRouteDefinition>>
  )[route.name];
  if (!definition) return null;
  const params = definition.urlCodec.decode(route);
  return params ? { navKey: route.name, params } : { navKey: route.name };
}

/** Supplies route records whose names are the same stable keys used by shell navigation. */
export const demoRoutes = Object.entries(demoRouteDefinitions).map(
  ([name, { path, component, props }]) => ({ name, path, component, props }),
) satisfies RouteRecordRaw[];

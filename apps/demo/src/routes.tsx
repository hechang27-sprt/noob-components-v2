import type { RouteRecordRaw } from "vue-router";
import { defineComponent } from "vue";

/** Describes the starter-owned metadata for one locally rendered demonstration route. */
export type DemoRouteDefinition = {
  /** Supplies the stable Vue Router name used to identify the route. */
  name: string;
  /** Supplies the stable path used as both the route location and tab key. */
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
    component: createDemoPage(
      "Reports",
      "Navigate here from the router-aware menu to open and activate a closable shell tab.",
    ),
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
] satisfies DemoRouteDefinition[];

/** Supplies the Vue Router records registered by the frontend-only demonstration app. */
export const demoRoutes = demoRouteDefinitions.map(
  ({ name, path, component }) => ({ name, path, component }),
) satisfies RouteRecordRaw[];

import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import {
  createMemoryHistory,
  createRouter,
  type RouteLocationNormalizedLoaded,
} from "vue-router";

import { defineAdminRouteRegistry } from "../src";

/** Creates a route component suitable for registry tests without application behavior. */
function createPage() {
  return defineComponent(
    /** Returns an empty route render function used only for router resolution. */
    () => () => null,
  );
}

/** Creates a real normalized route for registry reverse-conversion tests. */
function resolveRoute(path: string): RouteLocationNormalizedLoaded {
  const registry = createRegistry();
  const router = createRouter({
    history: createMemoryHistory(),
    routes: registry.toRouteRecords(),
  });
  return router.resolve(path);
}

/** Creates the standard test registry with one parameterless and one parameterized route. */
function createRegistry() {
  return defineAdminRouteRegistry({
    dashboard: {
      route: { path: "/", component: createPage() },
    },
    detail: {
      route: {
        path: "/detail/:reportId",
        component: createPage(),
        props: true,
      },
      codec: {
        /** Converts a requested report identity into the route's declared path parameter. */
        encode(params) {
          const reportId = params?.reportId;
          if (typeof reportId !== "string" || !reportId) {
            throw new Error("detail requires a reportId.");
          }
          return { params: { reportId } };
        },
        /** Reconstructs report identity exclusively from the normalized URL path. */
        decode(route) {
          const reportId = route.params.reportId;
          if (typeof reportId !== "string" || !reportId) {
            throw new Error("detail requires a reportId.");
          }
          return { reportId };
        },
      },
    },
  });
}

describe("defineAdminRouteRegistry", () => {
  it("derives route names from nav keys while preserving host route records", () => {
    const registry = createRegistry();

    expect(registry.toRouteRecords()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "dashboard", path: "/" }),
        expect.objectContaining({
          name: "detail",
          path: "/detail/:reportId",
          props: true,
        }),
      ]),
    );
  });

  it("maps declared destination params to a named location and decodes them from a URL", () => {
    const registry = createRegistry();

    expect(
      registry.toLocation({
        navKey: "detail",
        params: { reportId: "quarterly-2025" },
      }),
    ).toEqual({ name: "detail", params: { reportId: "quarterly-2025" } });
    expect(registry.fromRoute(resolveRoute("/detail/quarterly-2025"))).toEqual({
      navKey: "detail",
      params: { reportId: "quarterly-2025" },
    });
  });

  it("silently drops params for a route without a codec and reconstructs no params", () => {
    const registry = createRegistry();

    expect(
      registry.toLocation({ navKey: "dashboard", params: { ignored: true } }),
    ).toEqual({
      name: "dashboard",
    });
    expect(registry.fromRoute(resolveRoute("/"))).toEqual({
      navKey: "dashboard",
    });
  });

  it("returns null for unregistered routes and throws clear errors for unknown destinations", () => {
    const registry = createRegistry();
    const unrelatedRouter = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/login", name: "login", component: createPage() }],
    });

    expect(registry.fromRoute(unrelatedRouter.resolve("/login"))).toBeNull();
    expect(() => registry.toLocation({ navKey: "missing" })).toThrow(
      'Unknown admin route navKey "missing".',
    );
  });

  it("propagates declared codec validation failures for malformed registered URLs", () => {
    const registry = createRegistry();
    const malformedDetail = {
      ...resolveRoute("/detail/valid"),
      params: { reportId: "" },
    } as RouteLocationNormalizedLoaded;

    expect(() => registry.fromRoute(malformedDetail)).toThrow(
      "detail requires a reportId.",
    );
  });
});

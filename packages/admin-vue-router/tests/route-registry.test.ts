import { describe, expect, expectTypeOf, it } from "vitest";
import { defineComponent } from "vue";
import {
  createMemoryHistory,
  createRouter,
  type HistoryState,
  type RouteLocationNormalizedLoaded,
} from "vue-router";
import { z } from "zod";

import { defineAdminRouteRegistry, type VueRouterNavParams } from "../src";

/** Creates a route component suitable for registry tests without application behavior. */
function createPage() {
  return defineComponent(
    /** Returns an empty route render function used only for router resolution. */
    () => () => null,
  );
}

/** Creates a real normalized route from the supplied registry. */
function resolveRoute(
  registry: ReturnType<typeof createRegistry>,
  path: string,
): RouteLocationNormalizedLoaded {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: registry.toRouteRecords(),
  });
  return router.resolve(path);
}

/** Creates the standard registry covering parameterless and payload-bearing routes. */
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
        payloadSchema: z.object({ reportId: z.string().min(1) }),
        /** Maps canonical report payload into the route path. */
        encode(payload) {
          expectTypeOf(payload).toEqualTypeOf<{ reportId: string }>();
          return { params: { reportId: payload.reportId } };
        },
        /** Reconstructs raw report payload from the normalized route path. */
        decode(route) {
          return { reportId: route.params.reportId };
        },
      },
    },
    stateful: {
      route: { path: "/stateful", component: createPage() },
      codec: {
        payloadSchema: z.object({
          section: z.string().trim().default("summary"),
        }),
        /** Stores canonical section data in history state. */
        encode(payload): VueRouterNavParams {
          return { state: { selectedSection: payload.section } };
        },
        /** Reads raw section data from history state. */
        decode(_route, state) {
          return { section: state.selectedSection };
        },
      },
    },
    mixed: {
      route: { path: "/mixed/:reportId", component: createPage() },
      codec: {
        payloadSchema: z.object({ reportId: z.string(), section: z.string() }),
        /** Splits canonical payload between URL and history state. */
        encode(payload) {
          return {
            params: { reportId: payload.reportId },
            state: { selectedSection: payload.section },
          };
        },
        /** Reconstructs payload with URL report identity and history-owned section precedence. */
        decode(route, state) {
          return {
            reportId: route.params.reportId,
            section: state.selectedSection,
          };
        },
      },
    },
    optional: {
      route: { path: "/optional", component: createPage() },
      codec: {
        payloadSchema: z.object({ filter: z.string() }).optional(),
        /** Emits optional payload as query state when supplied. */
        encode(payload) {
          return payload ? { query: { filter: payload.filter } } : {};
        },
        /** Returns optional raw payload from the current query. */
        decode(route) {
          return typeof route.query.filter === "string"
            ? { filter: route.query.filter }
            : undefined;
        },
      },
    },
  });
}

const emptyState: HistoryState = {};

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

  it("maps URL-only payload and validates decoded route data", () => {
    const registry = createRegistry();

    expect(
      registry.toLocation({
        navKey: "detail",
        payload: { reportId: "quarterly-2025" },
      }),
    ).toEqual({
      name: "detail",
      params: { reportId: "quarterly-2025" },
    });
    expect(
      registry.fromRoute(
        resolveRoute(registry, "/detail/quarterly-2025"),
        emptyState,
      ),
    ).toEqual({
      navKey: "detail",
      payload: { reportId: "quarterly-2025" },
    });
  });

  it("supports history-only representation and schema defaults/transforms", () => {
    const registry = createRegistry();

    expect(
      registry.toLocation({
        navKey: "stateful",
        payload: { section: " details " },
      }),
    ).toEqual({
      name: "stateful",
      state: { selectedSection: "details" },
    });
    expect(registry.toLocation({ navKey: "stateful", payload: {} })).toEqual({
      name: "stateful",
      state: { selectedSection: "summary" },
    });
    expect(
      registry.fromRoute(resolveRoute(registry, "/stateful"), {
        selectedSection: " history ",
      }),
    ).toEqual({
      navKey: "stateful",
      payload: { section: "history" },
    });
  });

  it("supports mixed URL/history representation with codec-owned precedence", () => {
    const registry = createRegistry();

    expect(
      registry.toLocation({
        navKey: "mixed",
        payload: { reportId: "r-1", section: "history" },
      }),
    ).toEqual({
      name: "mixed",
      params: { reportId: "r-1" },
      state: { selectedSection: "history" },
    });
    expect(
      registry.fromRoute(resolveRoute(registry, "/mixed/url-id"), {
        reportId: "state-id",
        selectedSection: "state-section",
      }),
    ).toEqual({
      navKey: "mixed",
      payload: { reportId: "url-id", section: "state-section" },
    });
  });

  it("silently drops payload for a route without a codec", () => {
    const registry = createRegistry();

    expect(
      registry.toLocation({ navKey: "dashboard", payload: { ignored: true } }),
    ).toEqual({ name: "dashboard" });
    expect(
      registry.fromRoute(resolveRoute(registry, "/"), { ignored: true }),
    ).toEqual({ navKey: "dashboard" });
  });

  it("supports a codec whose schema explicitly accepts absent payload", () => {
    const registry = createRegistry();

    expect(registry.toLocation({ navKey: "optional" })).toEqual({
      name: "optional",
    });
    expect(
      registry.fromRoute(resolveRoute(registry, "/optional"), emptyState),
    ).toEqual({
      navKey: "optional",
    });
  });

  it("returns null for unregistered routes and throws for unknown destinations", () => {
    const registry = createRegistry();
    const unrelatedRouter = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/login", name: "login", component: createPage() }],
    });

    expect(
      registry.fromRoute(unrelatedRouter.resolve("/login"), emptyState),
    ).toBeNull();
    expect(() => registry.toLocation({ navKey: "missing" })).toThrow(
      'Unknown admin route navKey "missing".',
    );
  });

  it("propagates unchanged Zod failures before encode and after decode", () => {
    const registry = createRegistry();

    expect(() =>
      registry.toLocation({ navKey: "detail", payload: { reportId: "" } }),
    ).toThrow(z.ZodError);
    expect(() => registry.toLocation({ navKey: "detail" })).toThrow(z.ZodError);
    const malformedDetail = {
      ...resolveRoute(registry, "/detail/valid"),
      params: { reportId: "" },
    } as RouteLocationNormalizedLoaded;
    expect(() => registry.fromRoute(malformedDetail, emptyState)).toThrow(
      z.ZodError,
    );
  });
});

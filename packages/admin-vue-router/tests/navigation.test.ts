import type {
  AdminShellDestination,
  AdminShellTabDescriptor,
} from "@noob-naive-ui/admin";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";

import {
  createAdminShellVueRouterNavigation,
  defineAdminRouteRegistry,
} from "../src";

/** Creates a route component suitable for navigation tests. */
function createPage() {
  return defineComponent(
    /** Returns an empty route render function used only by the memory router. */
    () => () => null,
  );
}

/** Creates the registry used to test URL and history-state composition. */
function createRegistry() {
  return defineAdminRouteRegistry({
    dashboard: { route: { path: "/", component: createPage() } },
    detail: {
      route: { path: "/detail/:reportId", component: createPage() },
      codec: {
        payloadSchema: z.object({
          reportId: z.string(),
          section: z.string().default("summary"),
        }),
        /** Encodes identity in URL and section in host-owned history state. */
        encode(payload) {
          return {
            params: { reportId: payload.reportId },
            state: { section: payload.section },
          };
        },
        /** Decodes URL identity and host-owned section state. */
        decode(route, state) {
          return { reportId: route.params.reportId, section: state.section };
        },
      },
    },
  });
}

/** Creates deterministic host presentation for one destination. */
function describeDestination(
  id: string,
  nav: AdminShellDestination,
): AdminShellTabDescriptor {
  return {
    id,
    nav,
    label: `${nav.navKey}:${String(nav.payload?.reportId ?? "home")}`,
    closable: nav.navKey !== "dashboard",
  };
}

/** Creates a ready memory router and its navigation adapter. */
async function createHarness() {
  const registry = createRegistry();
  const router = createRouter({
    history: createMemoryHistory(),
    routes: registry.toRouteRecords(),
  });
  let nextId = 0;
  await router.push("/");
  await router.isReady();
  const navigation = createAdminShellVueRouterNavigation({
    router,
    registry,
    describeDestination,
    /** Returns a deterministic page ID for direct unstamped entries. */
    createPageId: () => `generated-${++nextId}`,
  });
  return { navigation, router };
}

describe("createAdminShellVueRouterNavigation", () => {
  it("provides stable fallback identity for one unstamped route snapshot", async () => {
    const { navigation } = await createHarness();

    expect(navigation.active?.id).toBe("generated-1");
    expect(navigation.active?.id).toBe("generated-1");
    expect(navigation.active?.nav).toEqual({ navKey: "dashboard" });
  });

  it("restores the same fallback identity after leaving and returning by browser history", async () => {
    const { navigation, router } = await createHarness();
    const initialDashboard = navigation.active;

    await navigation.handleNavigation({
      kind: "open",
      candidate: {
        id: "detail-tab",
        nav: { navKey: "detail", payload: { reportId: "r-1" } },
      },
      current: initialDashboard,
      closeCurrent: false,
    });
    await new Promise<void>((resolve) => {
      const removeAfterEach = router.afterEach(() => {
        removeAfterEach();
        resolve();
      });
      router.back();
    });

    expect(router.currentRoute.value.name).toBe("dashboard");
    expect(navigation.active).toEqual(initialDashboard);
  });

  it("opens with canonical payload and persists metadata without duplicating destination", async () => {
    const { navigation, router } = await createHarness();

    const result = await navigation.handleNavigation({
      kind: "open",
      candidate: {
        id: "tab-1",
        nav: { navKey: "detail", payload: { reportId: "r-1" } },
      },
      current: navigation.active,
      closeCurrent: false,
    });

    expect(result.active).toEqual({
      id: "tab-1",
      label: "detail:r-1",
      closable: true,
      nav: {
        navKey: "detail",
        payload: { reportId: "r-1", section: "summary" },
      },
    });
    expect(router.options.history.state).toMatchObject({
      section: "summary",
      _noobAdminShell: {
        tab: { id: "tab-1", label: "detail:r-1", closable: true },
      },
    });
    expect(JSON.stringify(router.options.history.state)).not.toContain('"nav"');
    expect(JSON.stringify(router.options.history.state)).not.toContain(
      '"navKey"',
    );
    expect(JSON.stringify(router.options.history.state)).not.toContain(
      '"payload"',
    );
  });

  it("restores valid metadata and falls back when metadata is malformed", async () => {
    const { navigation, router } = await createHarness();
    await router.push({
      name: "detail",
      params: { reportId: "r-2" },
      state: {
        section: "details",
        _noobAdminShell: {
          tab: {
            id: "persisted",
            label: "Persisted",
            closable: true,
            extra: "strip",
          },
        },
      },
    });
    expect(navigation.active).toEqual({
      id: "persisted",
      label: "Persisted",
      closable: true,
      nav: {
        navKey: "detail",
        payload: { reportId: "r-2", section: "details" },
      },
    });

    await router.push({
      name: "detail",
      params: { reportId: "r-3" },
      state: {
        section: "summary",
        _noobAdminShell: { tab: { id: 3, label: false } },
      },
    });
    expect(navigation.active?.id).toBe("generated-1");
    expect(navigation.active?.label).toBe("detail:r-3");
  });

  it("activates and closes through exact fallback descriptors", async () => {
    const { navigation, router } = await createHarness();
    const exact = describeDestination("exact", {
      navKey: "detail",
      payload: { reportId: "r-4", section: "details" },
    });
    expect(
      (
        await navigation.handleNavigation({
          kind: "activate",
          destination: exact,
          current: navigation.active,
        })
      ).active?.id,
    ).toBe("exact");

    const fallback = describeDestination("fallback", { navKey: "dashboard" });
    expect(
      (
        await navigation.handleNavigation({
          kind: "close",
          closing: exact,
          destination: fallback,
        })
      ).active?.id,
    ).toBe("fallback");
    expect(router.currentRoute.value.name).toBe("dashboard");
    expect(
      await navigation.handleNavigation({
        kind: "close",
        closing: fallback,
        destination: null,
      }),
    ).toEqual({ active: null });
  });

  it("replaces current history entry for close-current opens", async () => {
    const { navigation, router } = await createHarness();
    const initialPosition = router.options.history.state.position;
    await navigation.handleNavigation({
      kind: "open",
      candidate: {
        id: "replacement",
        nav: { navKey: "detail", payload: { reportId: "r-5" } },
      },
      current: navigation.active,
      closeCurrent: true,
    });
    expect(router.options.history.state.position).toBe(initialPosition);
    expect(navigation.active?.id).toBe("replacement");
  });

  it("rejects codec collisions with the reserved metadata namespace", async () => {
    const registry = defineAdminRouteRegistry({
      collision: {
        route: { path: "/collision", component: createPage() },
        codec: {
          payloadSchema: z.object({}),
          /** Deliberately emits the adapter-reserved state key. */
          encode() {
            return { state: { _noobAdminShell: "host" } };
          },
          /** Decodes an empty payload for the collision fixture. */
          decode() {
            return {};
          },
        },
      },
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: registry.toRouteRecords(),
    });
    await router.push("/collision");
    const navigation = createAdminShellVueRouterNavigation({
      router,
      registry,
      describeDestination,
      createPageId: () => "fallback",
    });

    await expect(
      navigation.handleNavigation({
        kind: "open",
        candidate: {
          id: "collision",
          nav: { navKey: "collision", payload: {} },
        },
        current: navigation.active,
        closeCurrent: false,
      }),
    ).rejects.toThrow("_noobAdminShell");
  });
});

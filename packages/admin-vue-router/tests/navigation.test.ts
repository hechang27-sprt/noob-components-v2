import type {
  AdminShellDestination,
  AdminShellTabDescriptor,
} from "@noob-naive-ui/admin";
import { describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";

import {
  createAdminShellVueRouterNavigation,
  defineAdminRouteRegistry,
  defineAdminRouteUrlCodec,
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
  const payloadSchema = z.object({
    reportId: z.string(),
    section: z.string().default("summary"),
  });
  return defineAdminRouteRegistry({
    dashboard: { route: { path: "/", component: createPage() } },
    detail: {
      route: { path: "/detail/:reportId", component: createPage() },
      codec: defineAdminRouteUrlCodec(payloadSchema, {
        /** Encodes identity in URL and section in host-owned history state. */
        encode(payload) {
          return {
            params: { reportId: payload.reportId },
            state: { section: payload.section },
          };
        },
        /** Decodes URL identity and host-owned section state. */
        decode(route, state) {
          const reportId =
            typeof route.params.reportId === "string"
              ? route.params.reportId
              : "";
          return { reportId, section: state.section as string };
        },
      }),
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
    /** Returns the deterministic authenticated navigation scope under test. */
    getNavigationScopeId: () => "scope-1",
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

  it("refreshes fallback destination data while preserving page identity", async () => {
    const { navigation, router } = await createHarness();
    await router.replace({
      name: "detail",
      params: { reportId: "r-1" },
      state: { section: "summary" },
    });
    const first = navigation.active;

    await router.replace({
      name: "detail",
      params: { reportId: "r-1" },
      force: true,
      state: { section: "details" },
    });

    expect(navigation.active).toEqual({
      id: first?.id,
      label: "detail:r-1",
      closable: true,
      nav: {
        navKey: "detail",
        payload: { reportId: "r-1", section: "details" },
      },
    });
  });

  it("rejects inherited route-definition keys", () => {
    const registry = defineAdminRouteRegistry({
      dashboard: { route: { path: "/", component: createPage() } },
    });

    expect(() => registry.getDefinition("constructor")).toThrow(
      'Unknown admin route navKey "constructor".',
    );
    expect(
      registry.fromRoute({ name: "toString" } as never, {} as never),
    ).toBeNull();
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
          scopeId: "scope-1",
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
        _noobAdminShell: {
          scopeId: "scope-1",
          tab: { id: 3, label: false },
        },
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

  it("does not add history when closing an inactive tab", async () => {
    const { navigation, router } = await createHarness();
    const inactive = describeDestination("inactive", {
      navKey: "detail",
      payload: { reportId: "r-inactive" },
    });
    const active = describeDestination("active", {
      navKey: "detail",
      payload: { reportId: "r-active" },
    });
    await navigation.handleNavigation({
      kind: "activate",
      destination: inactive,
      current: navigation.active,
    });
    await navigation.handleNavigation({
      kind: "activate",
      destination: active,
      current: navigation.active,
    });
    const push = vi.spyOn(router, "push");
    push.mockClear();
    const positionBeforeClose = router.options.history.state.position;

    const result = await navigation.handleNavigation({
      kind: "close",
      closing: inactive,
      destination: active,
    });
    expect(push).not.toHaveBeenCalled();
    expect(router.options.history.state.position).toBe(positionBeforeClose);
    expect(result.active?.id).toBe("active");
  });
  it("preserves an existing Dashboard identity when restamping a scoped entry", async () => {
    const { navigation } = await createHarness();
    const dashboard = describeDestination("dashboard-session", {
      navKey: "dashboard",
    });

    const first = navigation.toScopedLocation(dashboard);
    const second = navigation.toScopedLocation(dashboard);

    expect(first.state).toMatchObject({
      _noobAdminShell: {
        scopeId: "scope-1",
        tab: { id: "dashboard-session" },
      },
    });
    expect(second.state).toMatchObject({
      _noobAdminShell: {
        scopeId: "scope-1",
        tab: { id: "dashboard-session" },
      },
    });
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
      getNavigationScopeId: () => "scope-1",
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

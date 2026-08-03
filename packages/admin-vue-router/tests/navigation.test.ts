import type {
  AdminShellDestination,
  AdminShellTabDescriptor,
} from "@noob-naive-ui/admin";
import { describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";

import {
  createAdminShellVueRouterRuntime,
  defineAdminRouteRegistry,
  defineAdminRouteUrlCodec,
  type AdminShellVueRouterRuntime,
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
  const reportId = nav.payload?.reportId;
  return {
    id,
    nav,
    label: {
      kind: "string",
      value: `${nav.navKey}:${typeof reportId === "string" ? reportId : "home"}`,
    },
    closable: nav.navKey !== "dashboard",
  };
}

/** Creates a ready memory router and its separated navigation runtime. */
async function createHarness() {
  const registry = createRegistry();
  const router = createRouter({
    history: createMemoryHistory(),
    routes: registry.toRouteRecords(),
  });
  let nextId = 0;
  await router.push("/");
  await router.isReady();
  const runtime = createAdminShellVueRouterRuntime({
    router,
    registry,
    describeDestination,
    /** Returns a deterministic page ID for direct unstamped entries. */
    createPageId: () => `generated-${++nextId}`,
    /** Returns the deterministic authenticated navigation scope under test. */
    getNavigationScopeId: () => "scope-1",
  });
  return { navigation: runtime.navigation, runtime, router };
}

describe("createAdminShellVueRouterRuntime", () => {
  describe("scope guard", () => {
    const scopeIds = { current: "scope-active" };

    /**
     * Creates a harness with homeDestination configured for scope-guard tests.
     * The guard is NOT pre-installed; each test controls installation.
     *
     * @returns A navigation runtime, router, and home descriptor.
     */
    async function createScopeHarness() {
      const registry = createRegistry();
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          ...registry.toRouteRecords(),
          /** Simulates a public login route outside the admin registry. */
          { path: "/login", name: "login", component: createPage() },
        ],
      });
      let nextId = 0;
      await router.push("/");
      await router.isReady();
      const home: AdminShellDestination = { navKey: "dashboard" };
      const runtime = createAdminShellVueRouterRuntime({
        router,
        registry,
        describeDestination,
        createPageId: () => `scoped-${++nextId}`,
        getNavigationScopeId: () => scopeIds.current,
        homeDestination: home,
      });
      return { runtime, router, home };
    }

    /**
     * Seeds a scoped history entry so the guard recognizes the current scope.
     * enterScope now navigates, so no separate push is needed.
     *
     * @param runtime - The Vue Router lifecycle runtime.
     * @returns A promise that resolves after the scoped entry is established.
     */
    async function seedScope(
      runtime: AdminShellVueRouterRuntime,
    ): Promise<void> {
      await runtime.enterScope({ navKey: "dashboard" });
    }

    /**
     * Pushes a route with scoped adapter metadata.
     *
     * @param router - The memory router to push on.
     * @param name - Route name.
     * @param scopeId - Scope identifier to stamp.
     * @param params - Optional route params for parameterized routes.
     * @returns A promise that resolves after navigation completes.
     */
    async function pushScoped(
      router: ReturnType<typeof createRouter>,
      name: string,
      scopeId: string,
      params?: Record<string, string>,
    ): Promise<void> {
      await router.push({
        name,
        params,
        state: {
          _noobAdminShell: {
            scopeId,
            tab: { id: "stale-tab", label: { kind: "string", value: "Stale" } },
          },
        },
      });
    }

    /** Resolves after the next afterEach hook fires. */
    function afterNextNavigation(
      router: ReturnType<typeof createRouter>,
    ): Promise<void> {
      return new Promise<void>((resolve) => {
        const removeAfter = router.afterEach(() => {
          removeAfter();
          resolve();
        });
      });
    }

    it("allows forward navigation when the current entry has the right scope", async () => {
      const { runtime, router } = await createScopeHarness();
      const remove = runtime.installScopeGuard();

      await seedScope(runtime);
      await pushScoped(router, "detail", scopeIds.current, {
        reportId: "r-1",
      });
      expect(router.currentRoute.value.name).toBe("detail");

      remove();
    });

    it("replaces stale-scope entries during Back navigation", async () => {
      const { runtime, router } = await createScopeHarness();
      const remove = runtime.installScopeGuard();

      await seedScope(runtime);
      await pushScoped(router, "detail", "old-scope", { reportId: "r-1" });
      await pushScoped(router, "detail", scopeIds.current, { reportId: "r-2" });

      router.back();
      await afterNextNavigation(router);

      expect(router.currentRoute.value.name).toBe("dashboard");
      expect(router.options.history.state).toMatchObject({
        _noobAdminShell: expect.objectContaining({
          scopeId: scopeIds.current,
        }),
      });
      expect(
        (router.options.history.state as Record<string, unknown>)
          ._noobAdminShell,
      ).toMatchObject({
        tab: {
          id: expect.any(String),
          label: { kind: "string", value: expect.any(String) },
        },
      });

      remove();
    });

    it("replaces missing-scope entries during Back navigation", async () => {
      const { runtime, router } = await createScopeHarness();
      const remove = runtime.installScopeGuard();

      await seedScope(runtime);
      await router.push({ name: "detail", params: { reportId: "r-1" } });
      await pushScoped(router, "detail", scopeIds.current, { reportId: "r-2" });

      router.back();
      await afterNextNavigation(router);

      expect(router.currentRoute.value.name).toBe("dashboard");
      expect(router.options.history.state).toMatchObject({
        _noobAdminShell: expect.objectContaining({
          scopeId: scopeIds.current,
        }),
      });

      remove();
    });

    it("stamps the configured home descriptor when repairing scope", async () => {
      const { runtime, router } = await createScopeHarness();
      const remove = runtime.installScopeGuard();

      await seedScope(runtime);
      await pushScoped(router, "detail", "old-scope", { reportId: "r-1" });
      await pushScoped(router, "detail", scopeIds.current, { reportId: "r-2" });

      router.back();
      await afterNextNavigation(router);

      expect(router.currentRoute.value.name).toBe("dashboard");
      const repairedState = router.options.history.state as Record<
        string,
        unknown
      >;
      const repairedShell = repairedState._noobAdminShell;
      const repairedTab =
        repairedShell !== null &&
        typeof repairedShell === "object" &&
        "tab" in repairedShell &&
        repairedShell.tab !== null &&
        typeof repairedShell.tab === "object"
          ? repairedShell.tab
          : undefined;
      // The adapter stamps a home descriptor here; the guard only recovers it
      // from Vue Router's erased HistoryState typing.
      const persistedTab = repairedTab as { id: string };
      expect(typeof persistedTab.id).toBe("string");
      expect(persistedTab.id.length).toBeGreaterThan(0);

      remove();
    });

    it("bypasses non-admin routes (e.g. /login) without repairing", async () => {
      const { runtime, router } = await createScopeHarness();
      const remove = runtime.installScopeGuard();

      await router.push({ name: "login" });
      expect(router.currentRoute.value.name).toBe("login");

      remove();
    });

    it("prevents replacement loops after one repair", async () => {
      const { runtime, router } = await createScopeHarness();
      const remove = runtime.installScopeGuard();

      await seedScope(runtime);
      await pushScoped(router, "detail", "old-scope", { reportId: "r-1" });
      await pushScoped(router, "detail", scopeIds.current, { reportId: "r-2" });

      router.back();
      await afterNextNavigation(router);
      expect(router.currentRoute.value.name).toBe("dashboard");

      // Forward navigation should work normally after repair
      await pushScoped(router, "detail", scopeIds.current, { reportId: "r-3" });
      expect(router.currentRoute.value.name).toBe("detail");

      // Back to the repaired dashboard should pass through (has current scope)
      router.back();
      await afterNextNavigation(router);
      expect(router.currentRoute.value.name).toBe("dashboard");

      remove();
    });

    it("admits an explicit scope entry via enterScope", async () => {
      const { runtime, router } = await createScopeHarness();
      const remove = runtime.installScopeGuard();

      // enterScope navigates to the destination with the correct scope
      await runtime.enterScope({
        navKey: "detail",
        payload: { reportId: "r-deep" },
      });
      expect(router.currentRoute.value.name).toBe("detail");
      expect(router.currentRoute.value.params.reportId).toBe("r-deep");

      remove();
    });

    it("returns a removal function that unregisters the guard", async () => {
      const { runtime, router } = await createScopeHarness();
      const remove = runtime.installScopeGuard();
      remove();

      // After removal, stale scope back-navigation should pass through un-repaired
      await seedScope(runtime);
      await pushScoped(router, "detail", "old-scope", { reportId: "r-1" });
      await pushScoped(router, "detail", scopeIds.current, { reportId: "r-2" });

      router.back();
      await afterNextNavigation(router);
      expect(router.currentRoute.value.name).toBe("detail");
    });

    it("throws when installScopeGuard is used without homeDestination", async () => {
      const { runtime } = await createHarness();

      expect(() => runtime.installScopeGuard()).toThrow(
        "installScopeGuard and enterScope require homeDestination to be configured.",
      );
    });
    it("throws when enterScope is used without homeDestination", async () => {
      const { runtime } = await createHarness();

      await expect(runtime.enterScope({ navKey: "dashboard" })).rejects.toThrow(
        "installScopeGuard and enterScope require homeDestination to be configured.",
      );
    });
  });
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
      label: { kind: "string", value: "detail:r-1" },
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
      label: { kind: "string", value: "detail:r-1" },
      closable: true,
      nav: {
        navKey: "detail",
        payload: { reportId: "r-1", section: "summary" },
      },
    });
    expect(router.options.history.state).toMatchObject({
      section: "summary",
      _noobAdminShell: {
        tab: {
          id: "tab-1",
          label: { kind: "string", value: "detail:r-1" },
          closable: true,
        },
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
            label: { kind: "string", value: "Persisted" },
            closable: true,
            extra: "strip",
          },
        },
      },
    });
    expect(navigation.active).toEqual({
      id: "persisted",
      label: { kind: "string", value: "Persisted" },
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
    expect(navigation.active?.label).toEqual({
      kind: "string",
      value: "detail:r-3",
    });
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
    const { runtime } = await createHarness();
    const dashboard = describeDestination("dashboard-session", {
      navKey: "dashboard",
    });

    const first = runtime.toScopedLocation(dashboard);
    const second = runtime.toScopedLocation(dashboard);

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
    const runtime = createAdminShellVueRouterRuntime({
      router,
      registry,
      describeDestination,
      createPageId: () => "fallback",
      getNavigationScopeId: () => "scope-1",
    });

    await expect(
      runtime.navigation.handleNavigation({
        kind: "open",
        candidate: {
          id: "collision",
          nav: { navKey: "collision", payload: {} },
        },
        current: runtime.navigation.active,
        closeCurrent: false,
      }),
    ).rejects.toThrow("_noobAdminShell");
  });
});

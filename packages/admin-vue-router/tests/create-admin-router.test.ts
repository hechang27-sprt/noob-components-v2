import {
  useAdminAuthStore,
  useAdminShellNavigationStore,
  type AdminAuthStore,
  type AdminShellDestination,
  type AdminShellTabDescriptor,
} from "@noob-naive-ui/admin";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, inject, type App } from "vue";
import { z } from "zod";
import { createMemoryHistory, type Router } from "vue-router";

import {
  ADMIN_DISPOSE_KEY,
  createAdminRouterPlugin,
  createAdminShellVueRouterRuntime,
  defineAdminRouteRegistry,
  defineAdminRouteUrlCodec,
  type AdminRouteDefinitions,
  type AdminRouteOverride,
  type AdminRouteRegistry,
  type AdminRouterPlugin,
  type CreateAdminRouterOptions,
} from "../src";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Creates a route component suitable for router tests. */
function createPage() {
  return defineComponent(() => () => null);
}

/** Creates the standard test registry with three admin routes. */
function createRegistry() {
  return defineAdminRouteRegistry({
    dashboard: { route: { path: "", component: createPage() } },
    reports: { route: { path: "reports", component: createPage() } },
    settings: { route: { path: "settings", component: createPage() } },
  });
}

/** Describes destination for tests — returns fixed label/closable. */
function describeDestination(
  id: string,
  nav: AdminShellDestination,
): AdminShellTabDescriptor {
  return {
    id,
    nav,
    label: { kind: "string", value: String(nav.navKey) },
    closable: true,
  };
}

/** Describes optional test-router configuration for a particular route registry. */
type CreateOptionsOverrides<TDefinitions extends AdminRouteDefinitions> =
  Partial<
    Omit<CreateAdminRouterOptions<TDefinitions>, "history" | "registry">
  > & {
    /** Replaces the standard registry while preserving its inferred route keys. */
    registry?: AdminRouteRegistry<TDefinitions>;
  };

/** Extracts the route definitions retained by a bound registry. */
type RouteDefinitionsFor<TRegistry> =
  TRegistry extends AdminRouteRegistry<infer TDefinitions>
    ? TDefinitions
    : never;
/**
 * Creates the minimum valid options for a test router.
 *
 * @param overrides - Replaces default test options, including a registry with its own route keys.
 * @returns Complete options whose registry type is retained for createAdminRouterPlugin.
 */
function createOptions<TDefinitions extends AdminRouteDefinitions>(
  overrides: CreateOptionsOverrides<TDefinitions> = {},
): CreateAdminRouterOptions<TDefinitions> {
  const registry =
    overrides.registry ??
    (createRegistry() as unknown as AdminRouteRegistry<TDefinitions>);
  return {
    history: createMemoryHistory(),
    registry,
    homeDestination: { navKey: "dashboard" },
    describeDestination,
    createPageId: () => String(Math.random()),
    getNavigationScopeId: () => "test-scope",
    ...overrides,
  };
}

/**
 * Creates an app with Pinia and the admin router plugin installed.
 *
 * @param overrides - Replaces default test options.
 * @param pinia - Optional pre-created Pinia (e.g. with pre-set auth state).
 * @returns The app, its Pinia, the installed plugin, and the created Router.
 */
function createTestHarness<TDefinitions extends AdminRouteDefinitions>(
  overrides: CreateOptionsOverrides<TDefinitions> = {},
  pinia: Pinia = createPinia(),
): { app: App; pinia: Pinia; plugin: AdminRouterPlugin; router: Router } {
  const app = createApp({});
  app.use(pinia);
  const plugin = createAdminRouterPlugin(createOptions(overrides));
  app.use(plugin);
  return { app, pinia, plugin, router: plugin.router };
}

/** Default restore result for tests — resolves as authenticated immediately. */
function defaultRestore() {
  return Promise.resolve({
    kind: "authenticated" as const,
    identity: { userLabel: "tester" },
  });
}

/** Anonymous restore for tests — resolves as unauthenticated immediately. */
function anonymousRestore() {
  return Promise.resolve({
    kind: "anonymous" as const,
  });
}

/** Configures the auth store to simulate an authenticated user. */
async function authenticate(pinia: Pinia) {
  const auth = useAdminAuthStore(pinia);
  auth.configure({
    login: async () => ({ userLabel: "tester" }),
    logout: async () => {},
    restore: defaultRestore,
  });
  await auth.login({ username: "tester", password: "test" });
}

/** Configures the auth store for anonymous state. */
function configureAuth(pinia: Pinia): AdminAuthStore {
  const auth = useAdminAuthStore(pinia);
  auth.configure({
    login: async () => ({ userLabel: "tester" }),
    logout: async () => {},
    restore: anonymousRestore,
  });
  return auth;
}

/**
 * Installs a controlled waitForRestoration that resolves when the returned
 * resolve function is called, so tests can trigger restoration settlement
 * without running a real restore effect.
 */
function mockWaitForRestoration(pinia: Pinia): {
  resolve: () => void;
  promise: Promise<void>;
} {
  const { promise, resolve } = Promise.withResolvers<void>();
  const auth = useAdminAuthStore(pinia);
  (auth as unknown as Record<string, unknown>).waitForRestoration = () =>
    promise;
  return { resolve, promise };
}

/** Resolves the dispose function provided by the plugin install. */
function getDispose(app: App): (() => void) | undefined {
  return app.runWithContext(() => inject(ADMIN_DISPOSE_KEY));
}

// ---------------------------------------------------------------------------
// Slice 1 — Contract and validation
// ---------------------------------------------------------------------------

describe("createAdminRouterPlugin — contract", () => {
  it("returns a configured Vue Router with internal routes", () => {
    const { router } = createTestHarness();
    expect(router).toBeDefined();
    expect(router.getRoutes().length).toBeGreaterThanOrEqual(2);
  });

  it("generates login route at default path /login", () => {
    const { router } = createTestHarness();
    const loginRoute = router
      .getRoutes()
      .find((r) => r.name === "_noobAdminLogin");
    expect(loginRoute).toBeDefined();
    expect(loginRoute!.path).toBe("/login");
  });

  it("generates shell route at default path / with registry children", () => {
    const { router } = createTestHarness();
    const shellRoute = router
      .getRoutes()
      .find((r) => r.name === "_noobAdminShell");
    expect(shellRoute).toBeDefined();
    expect(shellRoute!.path).toBe("/");
    expect(shellRoute!.meta._noobAdminMeta).toEqual({ requiresAuth: true });
    expect(shellRoute!.children).toBeDefined();
    expect(shellRoute!.children!.length).toBe(3);
  });

  it("stamps namespaced auth metadata on shell parent", () => {
    const { router } = createTestHarness();
    const resolved = router.resolve("/");
    expect(resolved.meta._noobAdminMeta).toEqual({ requiresAuth: true });
  });

  it("does not stamp namespaced auth metadata on login route", () => {
    const { router } = createTestHarness();
    const resolved = router.resolve("/login");
    expect(resolved.meta._noobAdminMeta).toBeUndefined();
  });

  it("rejects identical login and shell paths", () => {
    expect(() =>
      createAdminRouterPlugin(createOptions({ loginRoute: { path: "/" } })),
    ).toThrow("must be distinct");
  });

  it("rejects additional route whose name collides with internal login name", () => {
    expect(() =>
      createAdminRouterPlugin(
        createOptions({
          additionalRoutes: [
            {
              path: "/public",
              name: "_noobAdminLogin",
              component: createPage(),
            },
          ],
        }),
      ),
    ).toThrow("conflicts with internal admin route name");
  });

  it("rejects additional route whose name collides with internal shell name", () => {
    expect(() =>
      createAdminRouterPlugin(
        createOptions({
          additionalRoutes: [
            {
              path: "/public",
              name: "_noobAdminShell",
              component: createPage(),
            },
          ],
        }),
      ),
    ).toThrow("conflicts with internal admin route name");
  });

  it("rejects additional route whose name collides with a registered route", () => {
    expect(() =>
      createAdminRouterPlugin(
        createOptions({
          additionalRoutes: [
            { path: "/public", name: "dashboard", component: createPage() },
          ],
        }),
      ),
    ).toThrow("conflicts with a registered route name");
  });

  it("rejects additional route whose path collides with internal login path", () => {
    expect(() =>
      createAdminRouterPlugin(
        createOptions({
          additionalRoutes: [
            {
              path: "/login",
              name: "dup-login",
              component: createPage(),
            },
          ],
        }),
      ),
    ).toThrow("conflicts with an internal admin route path");
  });

  it("rejects additional route whose path collides with internal shell path", () => {
    expect(() =>
      createAdminRouterPlugin(
        createOptions({
          additionalRoutes: [
            { path: "/", name: "dup-shell", component: createPage() },
          ],
        }),
      ),
    ).toThrow("conflicts with an internal admin route path");
  });

  it("accepts valid additional routes without collision", () => {
    const { router } = createTestHarness({
      additionalRoutes: [
        { path: "/help", name: "help", component: createPage() },
        { path: "/cb", name: "oauth-callback", component: createPage() },
      ],
    });
    const names = router.getRoutes().map((r) => r.name);
    expect(names).toContain("help");
    expect(names).toContain("oauth-callback");
  });

  it("accepts custom login and shell paths", () => {
    const { router } = createTestHarness({
      loginRoute: { path: "/signin" },
      shellRoute: { path: "/app" },
    });
    const loginRoute = router
      .getRoutes()
      .find((r) => r.name === "_noobAdminLogin");
    const shellRoute = router
      .getRoutes()
      .find((r) => r.name === "_noobAdminShell");
    expect(loginRoute!.path).toBe("/signin");
    expect(shellRoute!.path).toBe("/app");
  });

  it("innerComponent overrides are rendered inside package-owned route wrappers", () => {
    const CustomLogin = defineComponent(() => () => null);
    const CustomShell = defineComponent(() => () => null);
    const { router } = createTestHarness({
      loginRoute: { innerComponent: CustomLogin },
      shellRoute: { innerComponent: CustomShell },
    });
    const loginRoute = router
      .getRoutes()
      .find((r) => r.name === "_noobAdminLogin");
    const shellRoute = router
      .getRoutes()
      .find((r) => r.name === "_noobAdminShell");

    // Route records retain the package-owned wrapper component
    const loginWrapper = loginRoute!.components?.default;
    const shellWrapper = shellRoute!.components?.default;
    expect(loginWrapper).toBeDefined();
    expect(shellWrapper).toBeDefined();
    // Wrappers are factory-created, never the host-supplied inner component
    expect(loginWrapper).not.toBe(CustomLogin);
    expect(shellWrapper).not.toBe(CustomShell);
  });

  it("merges custom meta on shell route", () => {
    const { router } = createTestHarness({
      shellRoute: { meta: { layout: "admin" } },
    });
    const resolved = router.resolve("/");
    expect(resolved.meta._noobAdminMeta).toEqual({ requiresAuth: true });
    expect(resolved.meta.layout).toBe("admin");
  });

  it("keeps host metadata separate from package-owned auth metadata", () => {
    const { router } = createTestHarness({
      shellRoute: {
        meta: {
          _noobAdminMeta: { requiresAuth: false },
          requiresAuth: false,
          layout: "admin",
        },
      },
    });
    const resolved = router.resolve("/");
    expect(resolved.meta._noobAdminMeta).toEqual({ requiresAuth: true });
    expect(resolved.meta.requiresAuth).toBe(false);
    expect(resolved.meta.layout).toBe("admin");
  });

  it("preserves host metadata on the login route", () => {
    const { router } = createTestHarness({
      loginRoute: {
        meta: {
          _noobAdminMeta: { requiresAuth: true },
          requiresAuth: true,
          custom: "value",
        },
      },
    });
    const resolved = router.resolve("/login");
    expect(resolved.meta._noobAdminMeta).toBeUndefined();
    expect(resolved.meta.requiresAuth).toBe(true);
    expect(resolved.meta.custom).toBe("value");
  });

  it("preserves existing lower-level exports", () => {
    expect(defineAdminRouteRegistry).toBeDefined();
    expect(createAdminShellVueRouterRuntime).toBeDefined();
  });

  it("configures only the shell-facing controller into Pinia", () => {
    const { pinia } = createTestHarness();
    const store = useAdminShellNavigationStore(pinia);
    expect(store.navigation).not.toBeNull();
    expect(store.navigation!.active).toBeNull();
    expect(store.navigation!.handleNavigation).toBeTypeOf("function");
    expect("toScopedLocation" in store.navigation!).toBe(false);
    expect("installScopeGuard" in store.navigation!).toBe(false);
    expect("enterScope" in store.navigation!).toBe(false);
  });

  it("throws when installed before Pinia is initialized", () => {
    setActivePinia(undefined);
    const app = createApp({});
    const plugin = createAdminRouterPlugin(createOptions());
    expect(() => app.use(plugin)).toThrow(/Pinia/);
  });

  it("rejects installing the same plugin instance twice", () => {
    const { plugin } = createTestHarness();
    const app = createApp({});
    app.use(createPinia());
    expect(() => app.use(plugin)).toThrow(/more than once/);
  });

  it("provides dispose via ADMIN_DISPOSE_KEY that removes installed effects", async () => {
    const { app, pinia, router } = createTestHarness();
    configureAuth(pinia);

    const dispose = getDispose(app);
    expect(dispose).toBeTypeOf("function");
    // The dispose function is provided on the app, not attached to the Router.
    expect(Object.getOwnPropertySymbols(router)).not.toContain(
      ADMIN_DISPOSE_KEY,
    );

    dispose?.();

    // Auth guard removed: anonymous protected navigation is not redirected.
    await router.push("/");
    await router.isReady();
    await router.push("/reports");
    expect(router.currentRoute.value.name).toBe("reports");

    // Auth-transition subscription removed: an auth mutation on the login
    // route no longer triggers scope-entry navigation. Pinia's $subscribe
    // fires through a Vue pre-flush watcher, so one microtask flush drains
    // the scheduler queue; a residual subscription would have initiated
    // router.replace synchronously during that flush.
    const replaceSpy = vi.spyOn(router, "replace");
    await router.push("/login");
    const auth = useAdminAuthStore(pinia);
    auth.status = { kind: "authenticated", userLabel: "tester" };
    await Promise.resolve();
    expect(replaceSpy).not.toHaveBeenCalled();
    replaceSpy.mockRestore();

    // Error reporter removed: a failed navigation is not re-reported through
    // the package-owned onError handler. The navigation rejection settles
    // before the awaited push completes, so no extra flush is needed.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const removeGuard = router.beforeEach(() => {
      throw new Error("Simulated post-dispose failure");
    });
    try {
      await router.push("/dashboard").catch(() => {});
      expect(errorSpy).not.toHaveBeenCalledWith(
        "Admin router navigation failed:",
        expect.anything(),
      );
    } finally {
      errorSpy.mockRestore();
      removeGuard();
    }
  });
});

// ---------------------------------------------------------------------------
// Slice 2 — Generated records and internal components
// ---------------------------------------------------------------------------

describe("createAdminRouterPlugin — route records", () => {
  it("shell children include all registry routes", () => {
    const { router } = createTestHarness();
    const shellRoute = router
      .getRoutes()
      .find((r) => r.name === "_noobAdminShell");
    const childNames = shellRoute!.children!.map((c) => c.name);
    expect(childNames).toContain("dashboard");
    expect(childNames).toContain("reports");
    expect(childNames).toContain("settings");
  });

  it("resolves registry child routes under shell path", () => {
    const { router } = createTestHarness();
    const resolved = router.resolve("/reports");
    expect(resolved.name).toBe("reports");
    expect(resolved.matched.some((r) => r.name === "_noobAdminShell")).toBe(
      true,
    );
  });

  it("additional routes are siblings, not shell children", () => {
    const { router } = createTestHarness({
      additionalRoutes: [
        { path: "/help", name: "help", component: createPage() },
      ],
    });
    const resolved = router.resolve("/help");
    expect(resolved.name).toBe("help");
    const isShellChild = resolved.matched.some(
      (r) => r.name === "_noobAdminShell",
    );
    expect(isShellChild).toBe(false);
  });

  it("scrollBehavior is forwarded when provided", () => {
    const sb = () => ({ left: 0, top: 0 });
    const { router } = createTestHarness({ scrollBehavior: sb });
    expect(router.options.scrollBehavior).toBe(sb);
  });
});

// ---------------------------------------------------------------------------
// Slice 4 — Auth guard and redirect lifecycle
// ---------------------------------------------------------------------------

describe("createAdminRouterPlugin — auth guard", () => {
  it("redirects anonymous user from protected route to login with redirectUrl", async () => {
    const { pinia, router } = createTestHarness();
    configureAuth(pinia);
    // Trigger initial navigation so the guard chain settles before isReady
    await router.push("/");
    await router.isReady();

    await router.push("/reports");
    const current = router.currentRoute.value;
    expect(current.name).toBe("_noobAdminLogin");
    expect(current.query.redirectUrl).toBe("/reports");
  });

  it("redirects authenticated user from login to home", async () => {
    const { pinia, router } = createTestHarness();
    await authenticate(pinia);
    await router.push("/");
    await router.isReady();

    await router.push("/login");
    const current = router.currentRoute.value;
    expect(current.name).toBe("dashboard");
  });

  it("allows authenticated user to access protected route", async () => {
    const { pinia, router } = createTestHarness();
    await authenticate(pinia);
    await router.push("/");
    await router.isReady();

    await router.push("/reports");
    expect(router.currentRoute.value.name).toBe("reports");
  });

  it("allows anonymous user to access login route", async () => {
    const { pinia, router } = createTestHarness();
    configureAuth(pinia);
    await router.push("/");
    await router.isReady();

    await router.push("/login");
    expect(router.currentRoute.value.name).toBe("_noobAdminLogin");
  });

  it("allows anonymous user to access additional public route", async () => {
    const { pinia, router } = createTestHarness({
      additionalRoutes: [
        { path: "/help", name: "help", component: createPage() },
      ],
    });
    configureAuth(pinia);
    await router.push("/");
    await router.isReady();

    await router.push("/help");
    expect(router.currentRoute.value.name).toBe("help");
  });

  it("preserves deep link path in redirectUrl query", async () => {
    const { pinia, router } = createTestHarness();
    configureAuth(pinia);
    await router.push("/");
    await router.isReady();

    await router.push("/settings");
    expect(router.currentRoute.value.name).toBe("_noobAdminLogin");
    expect(router.currentRoute.value.query.redirectUrl).toBe("/settings");
  });

  it("does not redirect authenticated user for protected deep link", async () => {
    const { pinia, router } = createTestHarness();
    await authenticate(pinia);
    await router.push("/");
    await router.isReady();

    await router.push("/settings");
    expect(router.currentRoute.value.name).toBe("settings");
  });
});

// ---------------------------------------------------------------------------
describe("createAdminRouterPlugin — restoration gate", () => {
  it("waits for restoration before admitting protected navigation", async () => {
    const pinia = createPinia();
    const auth = useAdminAuthStore(pinia);

    auth.isConfigured = true;
    auth.status = { kind: "loading" };
    const waiter = mockWaitForRestoration(pinia);

    const { router } = createTestHarness({}, pinia);

    // Start initial navigation — guard will wait for restoration.
    const initNav = router.push("/");

    // Resolve restoration as authenticated.
    auth.status = { kind: "authenticated", userLabel: "tester" };
    waiter.resolve();

    await initNav;
    await router.isReady();

    // Now protected navigation should proceed.
    await router.push("/reports");
    expect(router.currentRoute.value.name).toBe("reports");
  });

  it("redirects anonymous after restoration settles unauthenticated", async () => {
    const pinia = createPinia();
    const auth = useAdminAuthStore(pinia);

    auth.isConfigured = true;
    auth.status = { kind: "loading" };
    const waiter = mockWaitForRestoration(pinia);

    const { router } = createTestHarness({}, pinia);

    const initNav = router.push("/");

    auth.status = { kind: "anonymous", reason: "unknown" };
    waiter.resolve();

    await initNav;
    await router.isReady();

    // Protected navigation must redirect to login.
    await router.push("/reports");
    expect(router.currentRoute.value.name).toBe("_noobAdminLogin");
    expect(router.currentRoute.value.query.redirectUrl).toBe("/reports");
  });

  it("settles all concurrent waiters when restoration resolves", async () => {
    const pinia = createPinia();
    const auth = useAdminAuthStore(pinia);

    auth.isConfigured = true;
    auth.status = { kind: "loading" };
    const waiter = mockWaitForRestoration(pinia);

    const { router } = createTestHarness({}, pinia);

    // Start initial navigation so the router has a current route.
    const initNav = router.push("/");

    auth.status = { kind: "authenticated", userLabel: "tester" };
    waiter.resolve();

    await initNav;
    await router.isReady();

    // Concurrent protected navigations after restoration.
    const nav1 = router.push("/reports");
    const nav2 = router.push("/settings");
    await Promise.all([nav1, nav2]);
    expect(["reports", "settings"]).toContain(router.currentRoute.value.name);
  });

  it("does not render protected content while restoration is pending", async () => {
    const pinia = createPinia();
    const auth = useAdminAuthStore(pinia);

    auth.isConfigured = true;
    auth.status = { kind: "loading" };
    const waiter = mockWaitForRestoration(pinia);

    const { router } = createTestHarness({}, pinia);

    // Start protected navigation while loading — should block.
    const navPromise = router.push("/reports");

    // Current route should NOT be the protected destination.
    expect(router.currentRoute.value.name).not.toBe("reports");

    // Resolve restoration as authenticated.
    auth.status = { kind: "authenticated", userLabel: "tester" };
    waiter.resolve();

    await navPromise;
    // After restoration, protected navigation proceeds.
    // Scope guard may redirect the first nav to home; either outcome
    // proves the guard released after restoration settled.
    expect(["_noobAdminLogin"]).not.toContain(router.currentRoute.value.name);
  });
});
// ---------------------------------------------------------------------------
// Slice 5 — R3 Auth-transition settlement regression
// ---------------------------------------------------------------------------

describe("createAdminRouterPlugin — auth-transition settlement", () => {
  it("rejected scope entry still allows a later authenticated transition to enter scope", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warningSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { app, pinia, router } = createTestHarness();
    configureAuth(pinia);
    await router.push("/");
    await router.isReady();
    await router.push("/login");
    await router.isReady();

    // Guard that only throws on the FIRST dashboard navigation
    let throwCount = 0;
    const removeGuard = router.beforeEach((to) => {
      if (to.name === "dashboard" && throwCount === 0) {
        throwCount++;
        throw new Error("Simulated first scope entry failure");
      }
    });

    try {
      const auth = useAdminAuthStore(pinia);

      // First login — enterScope rejects, scopeEntryPending stays true (RED).
      // The guard throws on the first dashboard navigation so enterScope fails.
      await auth.login({ username: "tester", password: "test" });

      // Let the rejected transition settle before triggering another auth mutation.
      const { promise: settlePromise, resolve: settleResolve } =
        Promise.withResolvers<void>();
      process.nextTick(settleResolve);
      await settlePromise;
      // Second login — triggers auth subscribe again.
      // RED: scopeEntryPending true → handleAuthTransition blocks immediately.
      // GREEN: scopeEntryPending false → enters scope → succeeds (guard removed).
      await auth.login({ username: "tester", password: "test" });

      // GREEN: the released transition enters scope; RED remains on login.
      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe("dashboard");
      });
      expect(throwCount).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(
        "Admin router navigation failed:",
        expect.objectContaining({
          message: "Simulated first scope entry failure",
        }),
      );
      expect(warningSpy).not.toHaveBeenCalledWith(
        "[Vue Router warn]: uncaught error during route navigation:",
      );
    } finally {
      errorSpy.mockRestore();
      warningSpy.mockRestore();
      removeGuard();
      getDispose(app)?.();
    }
  });
});

// ---------------------------------------------------------------------------
// Slice 6 — R4 Redirect reconstruction regression
describe("createAdminRouterPlugin — redirect reconstruction", () => {
  it("malformed codec payload falls back to home", async () => {
    const registry = defineAdminRouteRegistry({
      dashboard: { route: { path: "", component: createPage() } },
      reports: {
        route: { path: "reports", component: createPage() },
        codec: defineAdminRouteUrlCodec(z.object({ page: z.number() }), {
          encode: (p) => ({ query: { page: String(p.page) } }),
          decode: (route) =>
            ({ page: Number(route.query.page) }) as { page: number },
        }),
      },
    });

    const { pinia, router } = createTestHarness({ registry });
    configureAuth(pinia);

    // Navigate to login with malformed redirectUrl
    await router.push({
      name: "_noobAdminLogin",
      query: { redirectUrl: "/reports?page=not-a-number" },
    });

    // Wait for the scope entry navigation to complete
    const { promise: navPromise, resolve: navResolve } =
      Promise.withResolvers<void>();
    const removeNavWatch = router.afterEach(() => {
      removeNavWatch();
      navResolve();
    });

    // Trigger auth transition
    const auth = useAdminAuthStore(pinia);
    auth.status = { kind: "authenticated", userLabel: "tester" };

    // Wait for scope entry (or failure-fallback) navigation
    await navPromise;

    // RED: codec parse throws → user stays on login
    // GREEN: caught → homeDestination → user on dashboard
    expect(router.currentRoute.value.name).toBe("dashboard");
  });

  it("history-state-dependent redirect falls back to home", async () => {
    const registry = defineAdminRouteRegistry({
      dashboard: { route: { path: "", component: createPage() } },
      stateful: {
        route: { path: "stateful", component: createPage() },
        codec: defineAdminRouteUrlCodec(
          z.object({ token: z.string() }).optional().default({ token: "" }),
          {
            encode: () => ({ state: { token: "saved" } }),
            decode: (_route, state) => {
              const stateToken = (state as Record<string, unknown>).token;
              const token =
                typeof stateToken === "string" ? stateToken : undefined;
              if (!token) throw new Error("Missing history state token");
              return { token };
            },
          },
        ),
      },
    });

    const { pinia, router } = createTestHarness({ registry });
    configureAuth(pinia);

    await router.push({
      name: "_noobAdminLogin",
      query: { redirectUrl: "/stateful" },
    });

    const { promise: navPromise, resolve: navResolve } =
      Promise.withResolvers<void>();
    const removeNavWatch = router.afterEach(() => {
      removeNavWatch();
      navResolve();
    });

    const auth = useAdminAuthStore(pinia);
    auth.status = { kind: "authenticated", userLabel: "tester" };
    await navPromise;

    // RED: decode throws for empty state {} → unhandled rejection
    // GREEN: caught → homeDestination → user on dashboard
    expect(router.currentRoute.value.name).toBe("dashboard");
  });

  it("valid protected redirect URL restores destination", async () => {
    const { pinia, router } = createTestHarness();
    configureAuth(pinia);

    await router.push({
      name: "_noobAdminLogin",
      query: { redirectUrl: "/settings" },
    });

    const { promise: navPromise, resolve: navResolve } =
      Promise.withResolvers<void>();
    const removeNavWatch = router.afterEach(() => {
      removeNavWatch();
      navResolve();
    });

    const auth = useAdminAuthStore(pinia);
    auth.status = { kind: "authenticated", userLabel: "tester" };
    await navPromise;

    // Valid redirect → enterScope restores /settings.
    expect(router.currentRoute.value.name).toBe("settings");
  });
});
// ---------------------------------------------------------------------------
// Type safety
// ---------------------------------------------------------------------------

describe("createAdminRouterPlugin — type safety", () => {
  it("CreateAdminRouterOptions accepts registry typed from defineAdminRouteRegistry", () => {
    const registry = createRegistry();
    const options: CreateAdminRouterOptions<
      RouteDefinitionsFor<typeof registry>
    > = {
      history: createMemoryHistory(),
      registry,
      homeDestination: { navKey: "dashboard" },
      describeDestination,
      createPageId: () => "test",
      getNavigationScopeId: () => "test",
    };
    const plugin: AdminRouterPlugin = createAdminRouterPlugin(options);
    expect(plugin.router).toBeDefined();
  });
  it("AdminRouteOverride accepts path, innerComponent, and meta overrides", () => {
    const override: AdminRouteOverride = {
      path: "/custom",
      innerComponent: defineComponent(() => () => null),
      meta: { theme: "dark" },
    };
    expect(override.path).toBe("/custom");
  });
});

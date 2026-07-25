import {
  useAdminAuthStore,
  useAdminShellNavigationStore,
  type AdminShellDestination,
  type AdminShellTabDescriptor,
} from "@noob-naive-ui/admin";
import { createPinia, type Pinia } from "pinia";
import { describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { z } from "zod";
import {
  createMemoryHistory,
  type RouteRecordRaw,
  type Router,
} from "vue-router";

import {
  createAdminRouter,
  createAdminShellVueRouterRuntime,
  defineAdminRouteRegistry,
  defineAdminRouteUrlCodec,
  type AdminRouteOverride,
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
  return { id, nav, label: String(nav.navKey), closable: true };
}

/** Creates the minimum valid options for a test router. */
function createOptions(
  overrides: Partial<{
    pinia: Pinia;
    registry: ReturnType<typeof createRegistry>;
    homeDestination: AdminShellDestination;
    additionalRoutes: readonly RouteRecordRaw[];
    loginRoute: AdminRouteOverride;
    shellRoute: AdminRouteOverride;
    scrollBehavior: () => { left: number; top: number };
  }> = {},
) {
  const registry = overrides.registry ?? createRegistry();
  return {
    pinia: createPinia(),
    history: createMemoryHistory(),
    registry,
    homeDestination: { navKey: "dashboard" },
    describeDestination,
    createPageId: () => String(Math.random()),
    getNavigationScopeId: () => "test-scope",
    ...overrides,
  };
}

/** Configures the auth store to simulate an authenticated user. */
async function authenticate(pinia: Pinia) {
  const auth = useAdminAuthStore(pinia);
  auth.configure({
    login: async () => ({ userLabel: "tester" }),
    logout: async () => {},
  });
  await auth.login({ username: "tester", password: "test" });
}

/** Configures the auth store for anonymous state. */
function configureAuth(pinia: Pinia) {
  const auth = useAdminAuthStore(pinia);
  auth.configure({
    login: async () => ({ userLabel: "tester" }),
    logout: async () => {},
  });
}

/** Resolves the dispose method from a factory-created router. */
function getDispose(router: Router): (() => void) | undefined {
  const descriptors = Object.getOwnPropertyDescriptors(router);
  for (const key of Object.getOwnPropertySymbols(router)) {
    const desc = descriptors[key as unknown as string];
    if (desc && typeof desc.value === "function" && !desc.enumerable) {
      return desc.value as () => void;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Slice 1 — Contract and validation
// ---------------------------------------------------------------------------

describe("createAdminRouter — contract", () => {
  it("returns a configured Vue Router with internal routes", () => {
    const router = createAdminRouter(createOptions());
    expect(router).toBeDefined();
    expect(router.getRoutes().length).toBeGreaterThanOrEqual(2);
  });

  it("generates login route at default path /login", () => {
    const router = createAdminRouter(createOptions());
    const loginRoute = router
      .getRoutes()
      .find((r) => r.name === "_noobAdminLogin");
    expect(loginRoute).toBeDefined();
    expect(loginRoute!.path).toBe("/login");
  });

  it("generates shell route at default path / with registry children", () => {
    const router = createAdminRouter(createOptions());
    const shellRoute = router
      .getRoutes()
      .find((r) => r.name === "_noobAdminShell");
    expect(shellRoute).toBeDefined();
    expect(shellRoute!.path).toBe("/");
    expect(shellRoute!.meta.requiresAuth).toBe(true);
    expect(shellRoute!.children).toBeDefined();
    expect(shellRoute!.children!.length).toBe(3);
  });

  it("stamps requiresAuth meta on shell parent", () => {
    const router = createAdminRouter(createOptions());
    const resolved = router.resolve("/");
    expect(resolved.meta.requiresAuth).toBe(true);
  });

  it("does not stamp requiresAuth on login route", () => {
    const router = createAdminRouter(createOptions());
    const resolved = router.resolve("/login");
    expect(resolved.meta.requiresAuth).toBeUndefined();
  });

  it("rejects identical login and shell paths", () => {
    expect(() =>
      createAdminRouter(createOptions({ loginRoute: { path: "/" } })),
    ).toThrow("must be distinct");
  });

  it("rejects additional route whose name collides with internal login name", () => {
    expect(() =>
      createAdminRouter(
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
      createAdminRouter(
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
      createAdminRouter(
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
      createAdminRouter(
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
      createAdminRouter(
        createOptions({
          additionalRoutes: [
            { path: "/", name: "dup-shell", component: createPage() },
          ],
        }),
      ),
    ).toThrow("conflicts with an internal admin route path");
  });

  it("accepts valid additional routes without collision", () => {
    const router = createAdminRouter(
      createOptions({
        additionalRoutes: [
          { path: "/help", name: "help", component: createPage() },
          { path: "/cb", name: "oauth-callback", component: createPage() },
        ],
      }),
    );
    const names = router.getRoutes().map((r) => r.name);
    expect(names).toContain("help");
    expect(names).toContain("oauth-callback");
  });

  it("accepts custom login and shell paths", () => {
    const router = createAdminRouter(
      createOptions({
        loginRoute: { path: "/signin" },
        shellRoute: { path: "/app" },
      }),
    );
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
    const router = createAdminRouter(
      createOptions({
        loginRoute: { innerComponent: CustomLogin },
        shellRoute: { innerComponent: CustomShell },
      }),
    );
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
    const router = createAdminRouter(
      createOptions({ shellRoute: { meta: { layout: "admin" } } }),
    );
    const resolved = router.resolve("/");
    expect(resolved.meta.requiresAuth).toBe(true);
    expect(resolved.meta.layout).toBe("admin");
  });

  it("shell requiresAuth remains true despite host override", () => {
    const router = createAdminRouter(
      createOptions({
        shellRoute: { meta: { requiresAuth: false, layout: "admin" } },
      }),
    );
    const resolved = router.resolve("/");
    expect(resolved.meta.requiresAuth).toBe(true);
    expect(resolved.meta.layout).toBe("admin");
  });

  it("login requiresAuth is absent despite host override", () => {
    const router = createAdminRouter(
      createOptions({
        loginRoute: { meta: { requiresAuth: true, custom: "value" } },
      }),
    );
    const resolved = router.resolve("/login");
    expect(resolved.meta.requiresAuth).toBeUndefined();
    expect(resolved.meta.custom).toBe("value");
  });

  it("preserves existing lower-level exports", () => {
    expect(defineAdminRouteRegistry).toBeDefined();
    expect(createAdminShellVueRouterRuntime).toBeDefined();
  });

  it("configures only the shell-facing controller into Pinia", () => {
    const opts = createOptions();
    createAdminRouter(opts);
    const store = useAdminShellNavigationStore(opts.pinia);
    expect(store.navigation).not.toBeNull();
    expect(store.navigation!.active).toBeNull();
    expect(store.navigation!.handleNavigation).toBeTypeOf("function");
    expect("toScopedLocation" in store.navigation!).toBe(false);
    expect("installScopeGuard" in store.navigation!).toBe(false);
    expect("enterScope" in store.navigation!).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Slice 2 — Generated records and internal components
// ---------------------------------------------------------------------------

describe("createAdminRouter — route records", () => {
  it("shell children include all registry routes", () => {
    const router = createAdminRouter(createOptions());
    const shellRoute = router
      .getRoutes()
      .find((r) => r.name === "_noobAdminShell");
    const childNames = shellRoute!.children!.map((c) => c.name);
    expect(childNames).toContain("dashboard");
    expect(childNames).toContain("reports");
    expect(childNames).toContain("settings");
  });

  it("resolves registry child routes under shell path", () => {
    const router = createAdminRouter(createOptions());
    const resolved = router.resolve("/reports");
    expect(resolved.name).toBe("reports");
    expect(resolved.matched.some((r) => r.name === "_noobAdminShell")).toBe(
      true,
    );
  });

  it("additional routes are siblings, not shell children", () => {
    const router = createAdminRouter(
      createOptions({
        additionalRoutes: [
          { path: "/help", name: "help", component: createPage() },
        ],
      }),
    );
    const resolved = router.resolve("/help");
    expect(resolved.name).toBe("help");
    const isShellChild = resolved.matched.some(
      (r) => r.name === "_noobAdminShell",
    );
    expect(isShellChild).toBe(false);
  });

  it("scrollBehavior is forwarded when provided", () => {
    const sb = () => ({ left: 0, top: 0 });
    const router = createAdminRouter(createOptions({ scrollBehavior: sb }));
    expect(router.options.scrollBehavior).toBe(sb);
  });
});

// ---------------------------------------------------------------------------
// Slice 4 — Auth guard and redirect lifecycle
// ---------------------------------------------------------------------------

describe("createAdminRouter — auth guard", () => {
  it("redirects anonymous user from protected route to login with redirectUrl", async () => {
    const opts = createOptions();
    configureAuth(opts.pinia);
    const router = createAdminRouter(opts);
    // Trigger initial navigation so the guard chain settles before isReady
    await router.push("/");
    await router.isReady();

    await router.push("/reports");
    const current = router.currentRoute.value;
    expect(current.name).toBe("_noobAdminLogin");
    expect(current.query.redirectUrl).toBe("/reports");
  });

  it("redirects authenticated user from login to home", async () => {
    const opts = createOptions();
    await authenticate(opts.pinia);
    const router = createAdminRouter(opts);
    await router.push("/");
    await router.isReady();

    await router.push("/login");
    const current = router.currentRoute.value;
    expect(current.name).toBe("dashboard");
  });

  it("allows authenticated user to access protected route", async () => {
    const opts = createOptions();
    await authenticate(opts.pinia);
    const router = createAdminRouter(opts);
    await router.push("/");
    await router.isReady();

    await router.push("/reports");
    expect(router.currentRoute.value.name).toBe("reports");
  });

  it("allows anonymous user to access login route", async () => {
    const opts = createOptions();
    configureAuth(opts.pinia);
    const router = createAdminRouter(opts);
    await router.push("/");
    await router.isReady();

    await router.push("/login");
    expect(router.currentRoute.value.name).toBe("_noobAdminLogin");
  });

  it("allows anonymous user to access additional public route", async () => {
    const opts = createOptions({
      additionalRoutes: [
        { path: "/help", name: "help", component: createPage() },
      ],
    });
    configureAuth(opts.pinia);
    const router = createAdminRouter(opts);
    await router.push("/");
    await router.isReady();

    await router.push("/help");
    expect(router.currentRoute.value.name).toBe("help");
  });

  it("preserves deep link path in redirectUrl query", async () => {
    const opts = createOptions();
    configureAuth(opts.pinia);
    const router = createAdminRouter(opts);
    await router.push("/");
    await router.isReady();

    await router.push("/settings");
    expect(router.currentRoute.value.name).toBe("_noobAdminLogin");
    expect(router.currentRoute.value.query.redirectUrl).toBe("/settings");
  });

  it("does not redirect authenticated user for protected deep link", async () => {
    const opts = createOptions();
    await authenticate(opts.pinia);
    const router = createAdminRouter(opts);
    await router.push("/");
    await router.isReady();

    await router.push("/settings");
    expect(router.currentRoute.value.name).toBe("settings");
  });
});

describe("createAdminRouter — cleanup", () => {
  it("dispose removes guards — auth guard no longer fires after cleanup", async () => {
    const opts = createOptions();
    configureAuth(opts.pinia);
    const router = createAdminRouter(opts);
    await router.push("/");
    await router.isReady();

    const dispose = getDispose(router);
    expect(dispose).toBeDefined();
    dispose!();

    // After cleanup, auth guard should not fire
    await router.push("/reports");
    expect(router.currentRoute.value.name).toBe("reports");
  });

  it("dispose is idempotent — calling twice does not throw", () => {
    const router = createAdminRouter(createOptions());
    const dispose = getDispose(router);
    dispose!();
    expect(() => dispose!()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Slice 5 — R3 Auth-transition settlement regression
// ---------------------------------------------------------------------------

describe("createAdminRouter — auth-transition settlement", () => {
  it("rejected scope entry still allows a later authenticated transition to enter scope", async () => {
    const opts = createOptions();
    configureAuth(opts.pinia);
    const router = createAdminRouter(opts);
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
      const auth = useAdminAuthStore(opts.pinia);

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
    } finally {
      removeGuard();
      getDispose(router)?.();
    }
  });
});

// ---------------------------------------------------------------------------
// Slice 6 — R4 Redirect reconstruction regression
describe("createAdminRouter — redirect reconstruction", () => {
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

    const opts = createOptions({ registry });
    configureAuth(opts.pinia);
    const router = createAdminRouter(opts);

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
    const auth = useAdminAuthStore(opts.pinia);
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
              const token =
                typeof (state as Record<string, unknown>).token === "string"
                  ? (state as Record<string, unknown>).token
                  : undefined;
              if (!token) throw new Error("Missing history state token");
              return { token };
            },
          },
        ),
      },
    });

    const opts = createOptions({ registry });
    configureAuth(opts.pinia);
    const router = createAdminRouter(opts);

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

    const auth = useAdminAuthStore(opts.pinia);
    auth.status = { kind: "authenticated", userLabel: "tester" };
    await navPromise;

    // RED: decode throws for empty state {} → unhandled rejection
    // GREEN: caught → homeDestination → user on dashboard
    expect(router.currentRoute.value.name).toBe("dashboard");
  });

  it("valid protected redirect URL restores destination", async () => {
    const opts = createOptions();
    configureAuth(opts.pinia);
    const router = createAdminRouter(opts);

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

    const auth = useAdminAuthStore(opts.pinia);
    auth.status = { kind: "authenticated", userLabel: "tester" };
    await navPromise;

    // Valid redirect → enterScope restores /settings.
    expect(router.currentRoute.value.name).toBe("settings");
  });
});
// ---------------------------------------------------------------------------
// Type safety
// ---------------------------------------------------------------------------

describe("createAdminRouter — type safety", () => {
  it("CreateAdminRouterOptions accepts registry typed from defineAdminRouteRegistry", () => {
    const registry = createRegistry();
    const options: CreateAdminRouterOptions<typeof registry> = {
      pinia: createPinia(),
      history: createMemoryHistory(),
      registry,
      homeDestination: { navKey: "dashboard" },
      describeDestination,
      createPageId: () => "test",
      getNavigationScopeId: () => "test",
    };
    expect(options).toBeDefined();
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

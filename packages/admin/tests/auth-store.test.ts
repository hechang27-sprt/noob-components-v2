import { createPinia, setActivePinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAdminAuthStore } from "../src/stores/auth";
import type { AdminAuthStoreConfig } from "../src/stores/auth";
import type {
  AdminAuthIdentity,
  AdminAuthRestoreResult,
} from "../src/runtime-contract";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function initPinia() {
  setActivePinia(createPinia());
}

afterEach(() => {
  initPinia();
});

/** Builds the minimal host-effect configuration used by public-store tests. */
function baseConfig(
  overrides?: Partial<AdminAuthStoreConfig>,
): AdminAuthStoreConfig {
  return {
    login: () => Promise.resolve({}),
    restore: () => Promise.resolve({ kind: "anonymous" }),
    logout: () => {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Configure & Loading
// ---------------------------------------------------------------------------

describe("admin auth store — configure", () => {
  it("enters loading synchronously on configure", () => {
    initPinia();
    const { resolve, promise } =
      Promise.withResolvers<AdminAuthRestoreResult>();
    const store = useAdminAuthStore();

    expect(store.isConfigured).toBe(false);

    store.configure(baseConfig({ restore: () => promise }));

    expect(store.isConfigured).toBe(true);
    expect(store.status.kind).toBe("loading");

    // Clean up.
    resolve({ kind: "anonymous" });
  });

  it("starts restoration unconditionally on configure", () => {
    initPinia();
    const restore = vi.fn(() =>
      Promise.resolve({ kind: "anonymous" as const }),
    );

    const store = useAdminAuthStore();
    store.configure(baseConfig({ restore }));

    expect(restore).toHaveBeenCalledTimes(1);
  });

  it("ignores subsequent configure calls", () => {
    initPinia();
    const firstRestore = vi.fn(() =>
      Promise.resolve({ kind: "anonymous" as const }),
    );
    const secondRestore = vi.fn(() =>
      Promise.resolve({ kind: "anonymous" as const }),
    );

    const store = useAdminAuthStore();
    store.configure(baseConfig({ restore: firstRestore }));
    store.configure(baseConfig({ restore: secondRestore }));

    expect(firstRestore).toHaveBeenCalledTimes(1);
    expect(secondRestore).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// waitForRestoration
// ---------------------------------------------------------------------------

describe("admin auth store — waitForRestoration", () => {
  it("resolves when restore completes successfully", async () => {
    initPinia();
    const { resolve, promise } =
      Promise.withResolvers<AdminAuthRestoreResult>();
    const store = useAdminAuthStore();
    store.configure(baseConfig({ restore: () => promise }));

    const waitPromise = store.waitForRestoration();

    let resolved = false;
    waitPromise.then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    resolve({ kind: "anonymous" });
    await waitPromise;

    expect(resolved).toBe(true);
  });

  it("resolves even when restore rejects", async () => {
    initPinia();
    const { reject, promise } = Promise.withResolvers<AdminAuthRestoreResult>();
    const store = useAdminAuthStore();
    store.configure(baseConfig({ restore: () => promise }));

    const waitPromise = store.waitForRestoration();

    reject(new Error("restore failed"));
    await waitPromise;

    // Fail-closed: anonymous with unknown reason.
    expect(store.status.kind).toBe("anonymous");
    const s = store.status;
    if (s.kind === "anonymous") {
      expect(s.reason).toBe("unknown");
    }
  });

  it("throws when store is not configured", () => {
    initPinia();
    const store = useAdminAuthStore();
    expect(() => store.waitForRestoration()).toThrow(
      "Admin auth store not configured",
    );
  });

  it("multiple waiters all resolve on the same restore", async () => {
    initPinia();
    const { resolve, promise } =
      Promise.withResolvers<AdminAuthRestoreResult>();
    const store = useAdminAuthStore();
    store.configure(baseConfig({ restore: () => promise }));

    const p1 = store.waitForRestoration();
    const p2 = store.waitForRestoration();

    resolve({ kind: "anonymous" });

    await p1;
    await p2; // Both settle.
  });
});

// ---------------------------------------------------------------------------
// Restore — authenticated outcome
// ---------------------------------------------------------------------------

describe("admin auth store — authenticated restore", () => {
  it("transitions to authenticated on successful restore", async () => {
    initPinia();
    const identity: AdminAuthIdentity = {
      userLabel: "Ada Lovelace",
      avatarUrl: "https://example.com/ada.png",
    };
    const store = useAdminAuthStore();
    store.configure(
      baseConfig({
        restore: () => Promise.resolve({ kind: "authenticated", identity }),
      }),
    );

    await store.waitForRestoration();

    expect(store.status.kind).toBe("authenticated");
    if (store.status.kind === "authenticated") {
      expect(store.status.userLabel).toBe("Ada Lovelace");
    }
  });

  it("protected content is not exposed before restore completes", async () => {
    initPinia();
    const { resolve, promise } =
      Promise.withResolvers<AdminAuthRestoreResult>();
    const store = useAdminAuthStore();
    store.configure(baseConfig({ restore: () => promise }));

    expect(store.status.kind).toBe("loading");
    expect(store.status.kind).not.toBe("authenticated");

    resolve({ kind: "authenticated", identity: { userLabel: "Ada" } });
    await store.waitForRestoration();

    expect(store.status.kind).toBe("authenticated");
  });
});

// ---------------------------------------------------------------------------
// Restore — anonymous outcome
// ---------------------------------------------------------------------------

describe("admin auth store — anonymous restore", () => {
  it("transitions to anonymous on anonymous restore result", async () => {
    initPinia();
    const store = useAdminAuthStore();
    store.configure(baseConfig());

    await store.waitForRestoration();

    expect(store.status.kind).toBe("anonymous");
    if (store.status.kind === "anonymous") {
      expect(store.status.reason).toBe("unknown");
    }
  });

  it("does not render authenticated content for anonymous restore", async () => {
    initPinia();
    const store = useAdminAuthStore();
    store.configure(baseConfig());

    await store.waitForRestoration();
    expect(store.status.kind).toBe("anonymous");
  });

  it("restoration works when no identity is cached", async () => {
    initPinia();
    const store = useAdminAuthStore();
    store.configure(
      baseConfig({
        restore: () =>
          Promise.resolve({
            kind: "authenticated" as const,
            identity: { userLabel: "Fresh" },
          }),
      }),
    );

    await store.waitForRestoration();

    expect(store.status.kind).toBe("authenticated");
  });
});

// ---------------------------------------------------------------------------
// Restore — rejection (fail-closed)
// ---------------------------------------------------------------------------

describe("admin auth store — restore rejection", () => {
  it("enters anonymous with reason unknown on restore rejection", async () => {
    initPinia();
    const store = useAdminAuthStore();
    store.configure(
      baseConfig({
        restore: () => Promise.reject(new Error("network failure")),
      }),
    );

    await store.waitForRestoration();

    expect(store.status.kind).toBe("anonymous");
    if (store.status.kind === "anonymous") {
      expect(store.status.reason).toBe("unknown");
    }
  });

  it("rejected restore does not expose authenticated content", async () => {
    initPinia();
    const store = useAdminAuthStore();
    store.configure(
      baseConfig({
        restore: () => Promise.reject(new Error("timeout")),
      }),
    );

    await store.waitForRestoration();

    expect(store.status.kind).not.toBe("authenticated");
    expect(store.status.kind).not.toBe("loading");
    expect(store.status.kind).toBe("anonymous");
  });
});

// ---------------------------------------------------------------------------
// Existing login/logout still work
// ---------------------------------------------------------------------------

describe("admin auth store — login/logout unchanged", () => {
  it("login transitions to authenticated after restore settles", async () => {
    initPinia();
    const identity: AdminAuthIdentity = { userLabel: "Grace Hopper" };
    const store = useAdminAuthStore();
    store.configure(baseConfig({ login: () => Promise.resolve(identity) }));

    await store.waitForRestoration();
    await store.login({ username: "grace", password: "test" });

    expect(store.status.kind).toBe("authenticated");
  });

  it("logout transitions to anonymous with signed-out reason", async () => {
    initPinia();
    const store = useAdminAuthStore();
    store.configure(
      baseConfig({
        restore: () =>
          Promise.resolve({
            kind: "authenticated" as const,
            identity: { userLabel: "Ada" },
          }),
        logout: () => Promise.resolve(),
      }),
    );

    await store.waitForRestoration();
    expect(store.status.kind).toBe("authenticated");

    await store.logout();

    expect(store.status.kind).toBe("anonymous");
    if (store.status.kind === "anonymous") {
      expect(store.status.reason).toBe("signed-out");
    }
  });

  it("login error is stored and status remains anonymous", async () => {
    initPinia();
    const store = useAdminAuthStore();
    store.configure(
      baseConfig({
        login: () => Promise.reject(new Error("bad credentials")),
      }),
    );

    await store.waitForRestoration();

    try {
      await store.login({ username: "bad", password: "wrong" });
    } catch {
      // Expected
    }

    expect(store.loginError).toBe("Unable to sign in. Please try again.");
    expect(store.status.kind).toBe("anonymous");
  });
});

describe("admin auth store — host-owned persistence boundary", () => {
  it("forwards Remember Me unchanged to the host login effect", async () => {
    initPinia();
    const login = vi.fn(() => Promise.resolve({ userLabel: "Ada" }));
    const store = useAdminAuthStore();
    store.configure(baseConfig({ login }));
    await store.waitForRestoration();

    const values = { username: "ada", password: "test", remember: true };
    await store.login(values);

    expect(login).toHaveBeenCalledWith(values);
    expect(store.status).toMatchObject({
      kind: "authenticated",
      userLabel: "Ada",
    });
  });

  it("ignores legacy presentation records and relies on host restoration", async () => {
    initPinia();
    const legacyRecord = JSON.stringify({
      version: 1,
      identity: { userLabel: "Forged" },
    });
    const getItem = vi.fn(() => legacyRecord);
    vi.stubGlobal("localStorage", { getItem });
    const restore = vi.fn(() =>
      Promise.resolve({ kind: "anonymous" as const }),
    );
    const store = useAdminAuthStore();

    store.configure(baseConfig({ restore }));
    await store.waitForRestoration();

    expect(restore).toHaveBeenCalledTimes(1);
    expect(store.status.kind).toBe("anonymous");
    expect(getItem).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

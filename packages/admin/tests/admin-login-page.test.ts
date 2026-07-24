// @vitest-environment happy-dom

import { createApp, h, nextTick, type App } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminLoginPage } from "../src/components/admin-login-page";
import { useAdminAuthStore } from "../src/stores/auth";
import type {
  AdminAuthIdentity,
  AdminAuthStatus,
} from "../src/runtime-contract";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

function mountLoginPage(
  authStatus: AdminAuthStatus,
  login: (values: unknown) => Promise<AdminAuthIdentity>,
  logout: () => Promise<void> | void = () => {},
): { container: HTMLElement; store: ReturnType<typeof useAdminAuthStore> } {
  const target = document.createElement("div");
  document.body.append(target);

  const pinia = createPinia();
  const app = createApp(AdminLoginPage);
  app.use(pinia);
  setActivePinia(pinia);

  const store = useAdminAuthStore();
  store.configure({ login, logout });
  (store as unknown as Record<string, unknown>).status = authStatus;

  app.mount(target);
  mountedApps.push(app);

  return { container: target, store };
}

function mountLoginPages(
  login: (values: unknown) => Promise<AdminAuthIdentity>,
): HTMLElement {
  const target = document.createElement("div");
  document.body.append(target);

  const pinia = createPinia();
  const app = createApp(() => h("div", [h(AdminLoginPage), h(AdminLoginPage)]));
  app.use(pinia);
  setActivePinia(pinia);
  useAdminAuthStore().configure({ login, logout: () => {} });

  app.mount(target);
  mountedApps.push(app);

  return target;
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await nextTick();
}

describe("AdminLoginPage", () => {
  it("submits entered login values through the configured store action", async () => {
    let resolveLogin: ((identity: AdminAuthIdentity) => void) | undefined;
    const login = vi.fn(
      () =>
        new Promise<AdminAuthIdentity>((resolve) => {
          resolveLogin = resolve;
        }),
    );
    const { container, store } = mountLoginPage({ kind: "anonymous" }, login);

    expect(container.textContent).toContain("Sign in");

    const username = container.querySelector<HTMLInputElement>(
      'input[name="username"]',
    );
    const password = container.querySelector<HTMLInputElement>(
      'input[name="password"]',
    );
    const remember = container.querySelector<HTMLElement>('[role="checkbox"]');
    const form = container.querySelector("form");

    expect(username?.required).toBe(true);
    expect(password?.type).toBe("password");
    expect(remember?.getAttribute("aria-checked")).toBe("false");

    const labels = container.querySelectorAll<HTMLLabelElement>("label");
    expect(labels).toHaveLength(2);
    expect(username?.id).toBeTruthy();
    expect(password?.id).toBeTruthy();
    expect(labels[0]?.getAttribute("for")).toBeTruthy();
    expect(labels[1]?.getAttribute("for")).toBeTruthy();

    username!.value = "ada";
    username!.dispatchEvent(new Event("input", { bubbles: true }));
    password!.value = "correct-horse-battery-staple";
    password!.dispatchEvent(new Event("input", { bubbles: true }));
    remember!.click();
    await nextTick();
    expect(remember?.getAttribute("aria-checked")).toBe("true");
    form!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    await settle();

    const submit = container.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    expect(submit?.disabled).toBe(true);
    expect(container.textContent).toContain("Signing in…");

    resolveLogin!({ userLabel: "Ada Lovelace" });
    await settle();

    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith({
      username: "ada",
      password: "correct-horse-battery-staple",
      remember: true,
    });
    expect(store.status.kind).toBe("authenticated");
    expect(store.status.userLabel).toBe("Ada Lovelace");
  });

  it("gives each instance distinct label associations", () => {
    const login = vi.fn(() => Promise.resolve({}));
    const container = mountLoginPages(login);
    const usernames = [
      ...container.querySelectorAll<HTMLInputElement>('input[name="username"]'),
    ];
    const passwords = [
      ...container.querySelectorAll<HTMLInputElement>('input[name="password"]'),
    ];
    const labels = [...container.querySelectorAll<HTMLLabelElement>("label")];

    expect(new Set(usernames.map((input) => input.id)).size).toBe(2);
    expect(new Set(passwords.map((input) => input.id)).size).toBe(2);
    expect(labels.map((label) => label.control)).toEqual([
      usernames[0],
      passwords[0],
      usernames[1],
      passwords[1],
    ]);
  });

  it("renders non-login states from the frontend auth status", () => {
    const login = vi.fn(() => Promise.resolve({}));
    const { container: loading } = mountLoginPage({ kind: "loading" }, login);
    const { container: authenticated } = mountLoginPage(
      { kind: "authenticated", userLabel: "Ada Lovelace" },
      login,
    );

    expect(loading.textContent).toContain("Checking your session…");
    expect(loading.querySelector("h1")?.textContent).toBe(
      "Checking your session",
    );
    expect(
      loading.querySelector('[role="status"]')?.getAttribute("aria-live"),
    ).toBe("polite");
    expect(loading.querySelector("form")).toBeNull();
    expect(authenticated.textContent).toContain("Signed in as Ada Lovelace.");
    expect(authenticated.querySelector("h1")?.textContent).toBe(
      "Already signed in",
    );
    expect(authenticated.querySelector("form")).toBeNull();
  });

  it("stores login error in the store and does not leak transport details into the UI", async () => {
    const login = vi.fn(() => Promise.reject(new Error("transport failed")));
    const { container, store } = mountLoginPage(
      { kind: "anonymous", reason: "expired" },
      login,
    );

    const username = container.querySelector<HTMLInputElement>(
      'input[name="username"]',
    );
    const password = container.querySelector<HTMLInputElement>(
      'input[name="password"]',
    );
    username!.value = "ada";
    username!.dispatchEvent(new Event("input", { bubbles: true }));
    password!.value = "bad-password";
    password!.dispatchEvent(new Event("input", { bubbles: true }));
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await settle();
    await settle();
    await settle();

    expect(container.textContent).toContain(
      "Your session expired. Sign in again to continue.",
    );
    expect(store.loginError).toBe("Unable to sign in. Please try again.");
    expect(store.status.kind).toBe("anonymous");
    expect(login).toHaveBeenCalledWith({
      username: "ada",
      password: "bad-password",
      remember: false,
    });

    // Typing clears the error
    username!.value = "retry";
    username!.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(store.loginError).toBeUndefined();
  });
});

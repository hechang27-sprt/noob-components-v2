// @vitest-environment happy-dom

import { createApp, h, nextTick, type App } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminLoginPage } from "../src/components/admin-login-page";
import type {
  AdminAuthActions,
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
  authActions: AdminAuthActions,
): HTMLElement {
  const target = document.createElement("div");
  document.body.append(target);

  const app = createApp(AdminLoginPage, { authStatus, authActions });
  app.mount(target);
  mountedApps.push(app);

  return target;
}

function mountLoginPages(authActions: AdminAuthActions): HTMLElement {
  const target = document.createElement("div");
  document.body.append(target);

  const app = createApp(() =>
    h("div", [
      h(AdminLoginPage, { authStatus: { kind: "anonymous" }, authActions }),
      h(AdminLoginPage, { authStatus: { kind: "anonymous" }, authActions }),
    ]),
  );
  app.mount(target);
  mountedApps.push(app);

  return target;
}

describe("AdminLoginPage", () => {
  it("submits the entered login values through the injected auth action", async () => {
    let resolveLogin: (() => void) | undefined;
    const login = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        }),
    );
    const container = mountLoginPage(
      { kind: "anonymous" },
      { login, logout: vi.fn() },
    );

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

    const [usernameLabel, passwordLabel] =
      container.querySelectorAll<HTMLLabelElement>("label");
    expect(usernameLabel?.control).toBe(username);
    expect(passwordLabel?.control).toBe(password);

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

    await nextTick();

    const submit = container.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    expect(submit?.disabled).toBe(true);
    expect(container.textContent).toContain("Signing in…");

    resolveLogin!();
    await Promise.resolve();
    await nextTick();

    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith({
      username: "ada",
      password: "correct-horse-battery-staple",
      remember: true,
    });
    expect(container.textContent).toContain("Sign-in request completed.");
  });

  it("gives each instance distinct label associations", () => {
    const container = mountLoginPages({ login: vi.fn(), logout: vi.fn() });
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
    const authActions: AdminAuthActions = { login: vi.fn(), logout: vi.fn() };
    const loading = mountLoginPage({ kind: "loading" }, authActions);
    const authenticated = mountLoginPage(
      { kind: "authenticated", userLabel: "Ada Lovelace" },
      authActions,
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

  it("shows a generic error when the injected auth action rejects", async () => {
    const login = vi.fn(() => Promise.reject(new Error("transport failed")));
    const container = mountLoginPage(
      { kind: "anonymous", reason: "expired" },
      { login, logout: vi.fn() },
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

    await Promise.resolve();
    await nextTick();

    expect(container.textContent).toContain(
      "Your session expired. Sign in again to continue.",
    );
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Unable to sign in. Please try again.",
    );
    expect(container.textContent).not.toContain("transport failed");
    expect(login).toHaveBeenCalledWith({
      username: "ada",
      password: "bad-password",
      remember: false,
    });

    username!.value = "retry";
    username!.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();

    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});

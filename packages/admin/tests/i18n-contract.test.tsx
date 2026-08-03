// @vitest-environment happy-dom

import { createPinia, setActivePinia } from "pinia";
import { createApp, type App, type Plugin } from "vue";
import { createI18n } from "vue-i18n";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminLoginPage } from "../src/components/admin-login-page";
import {
  adminI18nOverridesKey,
  adminI18nPlugin,
  selectAdminLoginPageOverrides,
  selectAdminShellOverrides,
  type AdminI18nSnapshot,
} from "../src/i18n/plugin";
import type { AdminLocaleOverrides } from "../src/i18n/admin-locale";
import { useAdminAuthStore } from "../src/stores/auth";

/** Retains mounted test applications so each test releases Vue resources. */
const mountedApps: App[] = [];

/** Unmounts test applications and clears the synthetic document after each test. */
afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

/**
 * Mounts AdminLoginPage under a host-owned global Composer and an anonymous
 * signed-out auth status, optionally installing the admin override plugin.
 *
 * @param options - Host locale/fallback settings and optional package overrides.
 * @returns The mounted container and the host global Composer.
 */
function mountLoginPage(
  options: {
    locale?: string;
    fallbackLocale?: string;
    overrides?: AdminLocaleOverrides;
  } = {},
) {
  const target = document.createElement("div");
  document.body.append(target);
  const i18n = createI18n({
    legacy: false,
    locale: options.locale ?? "en",
    fallbackLocale: options.fallbackLocale ?? "en",
    messages: {},
  });
  const pinia = createPinia();
  const app = createApp(AdminLoginPage);
  app.use(pinia);
  app.use(i18n);
  if (options.overrides) {
    app.use(adminI18nPlugin, { messages: options.overrides });
  }
  setActivePinia(pinia);
  const store = useAdminAuthStore();
  store.configure({
    login: vi.fn(),
    restore: () => new Promise(() => {}),
    logout: () => {},
  });
  store.waitForRestoration().catch(() => {});
  (store as unknown as Record<string, unknown>).status = {
    kind: "anonymous",
    reason: "signed-out",
  };
  app.mount(target);
  mountedApps.push(app);
  return { container: target, i18n };
}

/**
 * Captures the application-scoped snapshot supplied by the admin plugin.
 *
 * @param overrides - Caller-owned override tree passed during installation.
 * @returns The snapshot observed through Vue's application provider map.
 */
function capturePluginSnapshot(
  overrides: AdminLocaleOverrides,
): AdminI18nSnapshot {
  let captured: AdminI18nSnapshot | undefined;
  const capture: Plugin = {
    install(app) {
      captured = app._context.provides[
        adminI18nOverridesKey as symbol
      ] as AdminI18nSnapshot;
    },
  };
  createApp({ render: () => null })
    .use(adminI18nPlugin, { messages: overrides })
    .use(capture);
  if (!captured) throw new Error("Admin i18n snapshot was not provided");
  return captured;
}

describe("admin i18n plugin", () => {
  it("snapshots caller overrides during installation", () => {
    const overrides: AdminLocaleOverrides = {
      en: { AdminShell: { account: { signOut: "Installed sign out" } } },
    };

    const snapshot = capturePluginSnapshot(overrides);
    overrides.en!.AdminShell!.account!.signOut = "Mutated sign out";

    expect(snapshot.messages.en?.AdminShell?.account?.signOut).toBe(
      "Installed sign out",
    );
  });

  it("selects only the requested component slices by locale", () => {
    const overrides: AdminLocaleOverrides = {
      en: { AdminShell: { account: { signOut: "Log out" } } },
      "zh-CN": {
        AdminLoginPage: { form: { signIn: "登录" } },
      },
    };

    expect(selectAdminShellOverrides(overrides)).toEqual({
      en: { account: { signOut: "Log out" } },
    });
    expect(selectAdminLoginPageOverrides(overrides)).toEqual({
      "zh-CN": { form: { signIn: "登录" } },
    });
  });
});

describe("AdminLoginPage locale ownership", () => {
  it("merges a partial override after defaults without losing siblings", () => {
    const { container } = mountLoginPage({
      overrides: {
        en: { AdminLoginPage: { form: { signIn: "Log in" } } },
      },
    });

    const submit = container.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    expect(submit?.textContent).toBe("Log in");
    expect(container.textContent).toContain("Username");
  });

  it("renders the packaged zh-CN defaults when the host locale is zh-CN", () => {
    const { container } = mountLoginPage({ locale: "zh-CN" });

    expect(container.textContent).toContain("登录");
    expect(container.textContent).toContain("用户名");
    expect(container.textContent).toContain("您已退出登录。");
  });

  it("keeps an unsupported active locale while rendering the host fallback", () => {
    const { container, i18n } = mountLoginPage({
      locale: "fr",
      fallbackLocale: "en",
    });

    expect(i18n.global.locale.value).toBe("fr");
    expect(container.textContent).toContain("You have signed out.");
    expect(container.textContent).toContain("Sign in");
  });
});
